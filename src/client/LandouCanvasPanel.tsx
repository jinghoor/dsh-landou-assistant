/**
 * 蓝豆助手 —— 画布会话面板。
 *
 * ## 它为什么能"拥有原版新会话的全部功能"
 *
 * 它不重写会话,而是**托管原版那一份**。`conversation.content` 是 ui-conversation
 * 注册的 **factory slot** —— 契约原话:"Reusable Conversation content instantiated by
 * presentation hosts"(可被「呈现宿主」多次实例化的会话内容)。官方主面板用它,
 * ui-subagent 的侧栏聊天也用它,本面板是第三个宿主。
 *
 * 所以消息流、工具卡片、附件、输入机、模型选择、权限控件……全部是官方那一份,
 * 本插件一个都没重做。官方升级时这里跟着升,不需要跟。
 *
 * ## 为什么要在注册里声明一个 session 作用域的子 slot
 *
 * factory 的 inject 需要 `sessionId`,而它来自**环境上的 session 绑定**。
 * 框架的规则是:注册声明了 session / session-maybe 作用域的子 slot,才会拿到
 * `SessionProvider` 这个座位(`PropsRenderSlots` 的类型定义里写死的条件)。
 * 所以 `landou.canvas.toolbar` 既是我要用的工具条座位,也是拿到绑定的前提。
 *
 * ## 为什么不改官方包的 DOM
 *
 * `ConversationContent` 的根节点带一组稳定的 data 属性
 * (`data-conversation-content` / `data-conversation-scroll` / `data-composer-seat`),
 * 和 `[data-slot]`、`[data-shell-bottom]` 同一类 —— 外壳自己的公开钩子。
 * 本面板的样式全部**限定在自己这棵子树里**(`[data-landou-canvas]` 作用域),
 * 所以主面板那份会话的排布一个像素都不会动。
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { LandouLocaleKey } from './locales.ts'

/** 本面板要托管的会话内容输入,与官方 factory 的 props 对齐。 */
interface ConversationContentInput {
  variant: 'main' | 'embedded'
  phase: 'settling' | 'hero' | 'active'
  hero: boolean
}

/** 面板从框架拿到的座位。只有实际用到的列出来。 */
export interface LandouCanvasPanelProps extends PropsLocale<'landou-assistant'> {
  /**
   * 环境上的 session 绑定座位。注册声明了 session 作用域的子 slot 才有。
   *
   * **不传 `session`**:框架文档写明它"supplies the current Controller binding
   * through the renderer scope adapter" —— 由它自己去绑当前会话。这也是本面板
   * 唯一能拿到会话的路:根作用域的 `main` 面板既没有 `useSession`,
   * 也没有任何公开的"当前会话 id"读取口(它藏在 UiWorkspaceService 的私有
   * selection store 里)。
   */
  SessionProvider: (props: { children: unknown; empty?: () => unknown }) => unknown
  /** 声明过的子 slot 渲染入口。 */
  renderSlot: (key: 'landou.canvas.toolbar', owner: Record<string, never>) => unknown
  /** 工厂座位。 */
  renderFactorySlot: (key: 'conversation.content', owner: ConversationContentInput) => unknown
}

/**
 * 画布布局的样式。
 *
 * 全部限定在 `[data-landou-canvas]` 子树内 —— **主面板那份会话一个像素都不会动**。
 *
 * 依据是实测出来的、不是猜的结构(`desktop_dom` 读的实时 DOM):
 *
 *     div[data-conversation-content]              flex column
 *     └── div[data-conversation-scroll]           flex column   ← 要改成 row
 *         ├── div[data-slot]                      display: contents
 *         └── div[data-composer-seat]             flex column, position: sticky
 *
 * 槽位包装是 `display: contents`,不是 flex 项 —— 它的子元素(消息流)才是。
 * 所以这里**只用 `order` 把输入框推到末位**,不去按索引选消息流那侧:
 * 那层包装有几个子元素由别人决定,按索引选迟早会错位。
 */
const CANVAS_CSS = `
/* 主轴由纵向改为横向:左边画布,右边输入框。 */
[data-landou-canvas] [data-conversation-scroll] {
  flex-direction: row;
  align-items: stretch;
}

/* 输入框从"贴底的整宽 sticky 条"变成"右侧固定宽的静态列"。 */
[data-landou-canvas] [data-conversation-scroll] > [data-composer-seat] {
  order: 2;
  position: static;
  flex: 0 0 var(--landou-canvas-composer-width, 420px);
  width: var(--landou-canvas-composer-width, 420px);
  max-width: 45%;
  border-left: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 无条件把输入框贴到右边缘。
   空白会话里画布那侧没有任何 flex 项(槽位包装是 display:contents 且没有子元素),
   此时输入框是唯一项 —— 只靠 order 它会落在左边。margin-left:auto 让两种情况
   都对:有内容时它排在画布之后,没内容时它被推到最右。 */
[data-landou-canvas] [data-conversation-scroll] > [data-composer-seat] {
  margin-left: auto;
}

/* 画布侧吃掉剩余宽度。
   注意选的是 [data-slot] 的**子元素**而不是它自己:槽位包装是 display:contents,
   不是 flex 项,给它加 flex 属性不会有任何效果 —— 实测踩过。 */
[data-landou-canvas] [data-conversation-scroll] > [data-slot] > * {
  order: 1;
  flex: 1 1 auto;
  min-width: 0;
}

/* 画布铺满可用高度。 */
[data-landou-canvas] [data-conversation-content],
[data-landou-canvas] [data-conversation-scroll] {
  height: 100%;
  min-height: 0;
}
`

/**
 * 渲染画布会话。
 * @param props - 框架座位与本地化文案。
 * @returns 托管的会话内容与画布布局容器。
 */
export function LandouCanvasPanel(props: LandouCanvasPanelProps) {
  const { SessionProvider, renderFactorySlot, renderSlot } = props

  return (
    <div data-landou-canvas="" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <style>{CANVAS_CSS}</style>
      {/* 工具条是声明过的 session 作用域子 slot。本插件自己的徽章走和其它贡献者
          完全相同的路注册进来 —— 官方 ui-workspace 对它的行菜单也是这么做的。 */}
      <div
        data-landou-canvas-bar=""
        style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 12, opacity: 0.75, borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)' }}
      >
        {renderSlot('landou.canvas.toolbar', {})}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        {SessionProvider({
          // phase 固定 active:判断 hero 需要会话是否为空,而那需要当前会话 id ——
          // 根作用域面板拿不到(见 props 上的说明)。空白会话因此显示的是"已停靠的
          // 输入框 + 空画布",而不是官方那张居中 hero。这是已知差距,不是遗漏。
          children: renderFactorySlot('conversation.content', {
            variant: 'embedded',
            phase: 'active',
            hero: false,
          }),
        })}
      </div>
    </div>
  )
}

/** 供注册处引用的本地化键,避免拼写漂移。 */
export type { LandouLocaleKey }
