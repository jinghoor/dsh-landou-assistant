/**
 * 蓝豆助手 —— 浏览器半边。
 *
 * 三处贡献:
 *
 *  1. `sidebar.brand.name` —— 把官方品牌名换成「蓝豆助手 by DeepSeek Harness」。
 *     **与登录状态无关**:品牌是插件的存在标识,不是受登录约束的功能。
 *     曾经把它跟登录绑在一起(登录后才占用),后果是未登录的用户完全看不到
 *     插件存在过,会以为插件坏了 —— 实测就是这么发生的。
 *  2. `settings.section` —— 设置面板里的「蓝豆助手」页。未登录显示注册/登录表单,
 *     已登录显示账号页。**这是登录门控的落点**:后续需要账号的功能都放这一页里,
 *     或者放在由它派生的贡献里。
 *  3. 本地化字典。
 *
 * 会话判定在宿主半边(`GET /landou-assistant/session`),浏览器只拿到
 * "是否已登录 + 显示名"——**访问令牌永远不进这个进程**。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only:拉入 locale 服务的 Context merge (ctx.locale)。
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only:设置外壳的 SlotMap merge ('settings.section')。跨插件协作只走 slot,
// 绝不值导入 —— 客户端 bundle 的纯度门禁会拒绝跨插件的值导入。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { LandouBrandName } from './LandouBrandName.tsx'
import { LandouCanvasBadge } from './LandouCanvasBadge.tsx'
import { LandouCanvasIcon } from './LandouCanvasIcon.tsx'
import { LandouCanvasPanel } from './LandouCanvasPanel.tsx'
import { LandouLauncherItem } from './LandouLauncherItem.tsx'
import { LandouSettingsSection } from './LandouSettingsSection.tsx'
import { en, zh } from './locales.ts'
import { getSession, login, logout, register, sendEmailCode } from './session.ts'

/** 本插件拥有的文案命名空间。 */
const NS = 'landou-assistant'

/**
 * 本插件在设置里的分区键。
 *
 * 菜单入口与设置分区两处注册共用同一个值:菜单行要指向分区,分区要用它做 id,
 * 两边写死字符串迟早会改一处漏一处,那样菜单点了会落到"没有这个分区"。
 */
const LANDOU_SECTION_ID = 'landou-assistant'

/**
 * 画布会话在主面板里的键。同一个值同时用于三处:main 面板的 key、侧栏行的 id、
 * 以及 `layout.selectPanel` 的目标 —— 写死三遍迟早会漂。
 */
const CANVAS_PANEL_ID = 'landou-canvas'

/** 必需服务:UI slot 注册表 + 本地化字典。 */
export const inject = ['slots', 'locale']

/**
 * 注册本插件的全部浏览器贡献。
 * @param ctx - 浏览器根上下文。
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'landou-assistant: dictionaries')

  // ── 侧栏品牌名:无条件占用 ────────────────────────────────────────
  // 遮蔽机制:官方品牌插件 (ui-brand-official) 以默认优先级 0 占用同一 slot。
  // slot 的占用冲突**只在相同优先级上才抛错**,不同优先级是遮蔽关系,且
  // **数值最低者渲染** (`packages/client/ui-slots/src/index.ts`) ——
  // 所以 -1 稳定压过官方品牌名,而官方插件本身不报错、无需禁用。
  //
  // 只动 brand.name,不碰 brand.mark —— 鲸鱼图标保持官方原样。
  ctx.slots.inject('sidebar.brand.name', function* () {
    yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, LandouBrandName)
  })

  // ── 账号菜单顶部的入口 ────────────────────────────────────────────
  // 菜单行原本是硬编码的(设置/意见反馈/退出登录),没有扩展点;这个 slot 由
  // 账号菜单的占位者声明。**未经修改的 DSH 不声明它** —— `slots.inject` 会
  // 一直等,既不报错也不插入,所以本插件在旧 DSH 上照样干净加载,只是少这一行。
  //
  // order 取负值:菜单里的贡献行按 order 排,排在其它贡献者前面。
  // id 是**列表 slot 的必需项** —— slot 核心用它给列表项排序去重,漏了会在
  // 注册那一刻抛 `list slot ... requires options.id`,而且会中断整个 bundle 的 apply。
  ctx.slots.inject('settings.launcher.menu.item', () => ctx.slots.register({
    name: 'settings.launcher.menu.item',
    id: LANDOU_SECTION_ID,
    order: -100,
    locale: NS,
  }, LandouLauncherItem))

  // ── 画布会话 ──────────────────────────────────────────────────────
  // `main` 是 keyed slot:侧栏会用每个已注册的 key 渲染一行面板入口,位置就在
  // 「新会话」按钮正下方 —— 这正是"除了新建新会话,还能新建新画布会话"的落点。
  // 行的图标来自 `sidebar.panellist`,标题来自那里的 label。
  //
  // 本面板不重写会话,而是托管原版那一份(见 LandouCanvasPanel 的说明)。
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: CANVAS_PANEL_ID,
    locale: NS,
    // 声明一个 session 作用域的子 slot:既是工具条座位,也是框架给出
    // `SessionProvider` 的条件。声明与使用是同一件事,不留空声明。
    children: { 'landou.canvas.toolbar': { kind: 'list', scope: 'session' } },
  }, LandouCanvasPanel))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: CANVAS_PANEL_ID,
    order: 20,
    locale: NS,
    label: () => t('canvas.panel'),
  }, LandouCanvasIcon))

  // 工具条徽章走和其它贡献者完全相同的路注册进上面那个座位。
  ctx.slots.inject('landou.canvas.toolbar', () => ctx.slots.register({
    name: 'landou.canvas.toolbar',
    id: 'canvas-badge',
    order: 0,
    locale: NS,
  }, LandouCanvasBadge))

  // ── 设置页导航项 ──────────────────────────────────────────────────
  // `settings.section` 是列表 slot,导航身份由注册选项给出:
  //   id    —— 分区键,也是 shell 选图标时的匹配键
  //   order —— 导航位置;官方分区是 account -10 / general 0 / models 10 /
  //            plugins 15 / agent-presets 20,这里排最后
  //   label —— 注册方自行本地化的显示文本
  // shell 没有自己的文案,全部来自注册方。
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: LANDOU_SECTION_ID,
    order: 30,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ getSession, login, register, sendEmailCode, logout }),
  }, LandouSettingsSection))
}
