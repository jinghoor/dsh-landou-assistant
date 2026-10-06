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
 * ## 这里不碰会话的任何内部结构
 *
 * 上一版我改过 `[data-conversation-scroll]` 的主轴、`[data-composer-seat]` 的
 * position —— 那是在拆别人的内部排布。需求是右侧"正常的 agent 对话区域",
 * 那么右侧就该是**原样的那一份**:本面板只在会话旁边放一块画布,一行会话内部
 * 的样式都不加。少一层耦合,官方改内部排布时这里也不会碎。
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
  renderSlot: (key: 'landou.canvas.toolbar' | 'landou.canvas.body', owner: Record<string, never>) => unknown
  /** 工厂座位。 */
  renderFactorySlot: (key: 'conversation.content', owner: ConversationContentInput) => unknown
}

/**
 * 画布会话的外层布局。
 *
 * **刻意不碰会话内部的任何东西。** 上一版我改过 `[data-conversation-scroll]` 的
 * 主轴和 `[data-composer-seat]` 的 position —— 那是在拆别人的内部排布,现在整段删掉。
 * 需求是右侧"正常的 agent 对话区域",那么右侧就该是**原样的那一份**,一行 CSS 都不加。
 *
 * 这里只做一件事:把一块画布放到会话左边。
 *
 * 选择器只落在两个自己拥有的属性上:
 *   [data-landou-canvas]         本面板的根
 *   [data-landou-canvas-left]    我自己那块画布
 * 其余兄弟节点(会话内容)只当 flex 项处理,不选它、不碰它。
 */
const CANVAS_CSS = `
[data-landou-canvas] {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

/* 左侧画布:固定初始宽度,可拖拽调整(拖拽手柄见下面的 JSX)。 */
[data-landou-canvas-left] {
  flex: 0 0 var(--landou-canvas-width, 46%);
  width: var(--landou-canvas-width, 46%);
  min-width: 220px;
  max-width: 80%;
  min-height: 0;
  border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  overflow: auto;
}

/* 右侧会话:吃掉剩余宽度。min-width 归零让它内部自己滚动,不被内容撑开。 */
[data-landou-canvas] > :not([data-landou-canvas-left]) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
`

/**
 * 渲染画布会话。
 * @param props - 框架座位与本地化文案。
 * @returns 托管的会话内容与画布布局容器。
 */
export function LandouCanvasPanel(props: LandouCanvasPanelProps) {
  const { SessionProvider, renderFactorySlot, renderSlot, t } = props

  return (
    <div data-landou-canvas="">
      <style>{CANVAS_CSS}</style>

      {/* 左:产物画布。目前只有空状态 —— 图片 / 视频 / 文字三类节点待接数据源。 */}
      <section data-landou-canvas-left="" aria-label={t('canvas.panel')}>
        <div
          data-landou-canvas-bar=""
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 12, opacity: 0.75, borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)' }}
        >
          {renderSlot('landou.canvas.toolbar', {})}
        </div>
        {/* 画布主体是**面板自己声明的** session 作用域座位:面板在 root 上拿不到
            sessionId,而产物按会话取 —— 没有 id 就只能猜,猜错会把别的会话的产物
            显示成当前会话的,那比不显示更糟。座位声明同时满足框架给出 SessionProvider 的条件。 */}
        <div style={{ height: 'calc(100% - 32px)', minHeight: 0, overflow: 'auto' }}>
          {renderSlot('landou.canvas.body', {})}
        </div>
      </section>

      {/* 右:原版对话。整份 factory 输出原样放进来 —— 消息流与输入框的内部排布
          一行 CSS 都没改,这是"正常的 agent 对话区域"的字面实现。 */}
      {SessionProvider({
        children: renderFactorySlot('conversation.content', {
          variant: 'main',
          phase: 'active',
          hero: false,
        }),
      })}
    </div>
  )
}

/** 供注册处引用的本地化键,避免拼写漂移。 */
export type { LandouLocaleKey }
