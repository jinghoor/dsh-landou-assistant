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
import { CanvasSessionBadge } from './CanvasSessionBadge.tsx'
import { LandouCanvasBody } from './LandouCanvasBody.tsx'
import { readSessionArtifacts } from './canvas-artifacts.ts'
import { createCanvasSource } from './canvas-store.ts'
import { sessionFileAddress } from './file-address.ts'
import { LandouCanvasPanel } from './LandouCanvasPanel.tsx'
import { LandouLauncherItem } from './LandouLauncherItem.tsx'
import { LandouNewSessionAction } from './LandouNewSessionAction.tsx'
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

/** 宿主半边的路由前缀;与 `src/index.ts` 的 `ROUTE_PREFIX` 一致。 */
const LANDOU_ROUTE_PREFIX = '/landou-assistant'

/**
 * 哪些会话是画布会话。
 *
 * 存 localStorage 而不是内存:重载后要能回到画布布局,否则每次刷新都掉回普通对话。
 * DSH 的会话实体里没有"种类"这个字段(实测),所以这个映射只能由本插件持有 ——
 * 它是本插件对自己会话的标注,不是 DSH 的数据。
 */
const CANVAS_SESSIONS_KEY = 'dsh-landou.canvasSessions'

/** 读回画布会话集合;内容损坏时返回空集而不是抛错。 */
function readCanvasSessions(): Set<string> {
  try {
    const raw = window.localStorage.getItem(CANVAS_SESSIONS_KEY)
    const parsed = raw === null ? [] : JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch (_error) {
    return new Set()
  }
}

/** 写回画布会话集合。 */
function writeCanvasSessions(ids: Set<string>): void {
  try {
    window.localStorage.setItem(CANVAS_SESSIONS_KEY, JSON.stringify([...ids]))
  } catch (_error) {
    // 存不下就退化成"这次有效、重载后失效",不该让插件起不来。
  }
}

/** 必需服务:UI slot 注册表 + 本地化字典。 */
export const inject = ['slots', 'locale', 'uiConversation', 'resources', 'layout', 'uiWorkspace', 'uiSession']

/**
 * 注册本插件的全部浏览器贡献。
 * @param ctx - 浏览器根上下文。
 */
/**
 * 把一个磁盘路径变成浏览器能加载的 URL。
 *
 * 走**插件宿主半边**自己开的文件路由。为什么不能用 DSH 的资源模型:
 * `file` 协议的 provider 只产出元数据 —— 原话是 "a workspace file's **metadata**
 * as a stream of RemoteResult frames",值是 `{absolutePath, version, bytes}`,
 * **既不含字节也不含 URL**。所以浏览器侧没有任何内置途径把工作区文件读成图片;
 * 官方的图片预览是从调用方拿字节的,那条通道不属于插件。
 *
 * 相对路径由宿主侧解析(路由只接受绝对路径,这里传的就是产物自带的绝对路径),
 * 而**授权面在宿主**:路由只服务已登记工作区根下面的常规文件,根之外一律 403。
 * @param path - 产物路径。
 * @returns 同源可加载的 URL。
 */
function previewUrlFor(ctx: ClientContext, sessionId: string, path: string): string {
  // 同源相对路径:Electron 把 `dsh-app://app` 下除静态资源外的任意路径原样转发给宿主,
  // Web 载体下客户端本来就在宿主源上,两边都成立、都不经 CORS。
  // 带上 session:宿主据此**从自己的 workspace 记录里**解析该会话的工作区根,
  // 而不是接受客户端声称的任何位置。客户端只能说"我在哪个会话里"。
  const query = `path=${encodeURIComponent(absoluteArtifactPath(ctx, sessionId, path))}&session=${encodeURIComponent(sessionId)}`
  return `${LANDOU_ROUTE_PREFIX}/file?${query}`
}

/** 会被当作文字预览的扩展名。二进制文件也归 `text` 一类(分类的兜底),但不该去读它。 */
const TEXTUAL_EXTENSIONS = new Set(['md', 'markdown', 'txt', 'json', 'csv', 'tsv', 'log', 'yaml', 'yml', 'toml', 'ini', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'sh', 'rs', 'go', 'java', 'c', 'h', 'cpp'])

/** 预览字符上限。节点是"一眼看到",不是阅读器。 */
const PREVIEW_CHARS = 600

/**
 * 文字产物内容的缓存。
 *
 * 按**路径 + 预览 URL** 缓存而不是只按路径:URL 里带着路径,文件被改写后内容会变,
 * 而这里没有版本号可用。简单起见缓存进程生命周期 —— 画布会话里同一路径的内容
 * 在一次浏览中通常不变,真变了刷新页面即可。
 */
const previewCache = new Map<string, string | null>()

/**
 * 取文字产物的内容预览。
 *
 * 只对**已知是文字的扩展名**发请求:`text` 是分类的兜底类,一个 .zip 也会落到那里,
 * 去读它只会拿到乱码。取不到就返回 null,节点退回只显示文件名。
 * @param url - 该产物的预览 URL。
 * @param path - 产物路径(用于判断扩展名)。
 * @returns 预览文本;不适用或失败时为 null。
 */
async function loadTextPreview(url: string, path: string): Promise<string | null> {
  const dot = path.lastIndexOf('.')
  const extension = dot === -1 ? '' : path.slice(dot + 1).toLowerCase()
  if (!TEXTUAL_EXTENSIONS.has(extension)) return null
  const cached = previewCache.get(url)
  if (cached !== undefined) return cached
  let result: string | null = null
  try {
    const response = await fetch(url)
    if (response.ok) {
      const text = await response.text()
      // 空文件是合法的文字产物,缓存空串而不是 null,免得每次都去重取。
      result = text.slice(0, PREVIEW_CHARS)
    }
  } catch (_error) {
    result = null
  }
  previewCache.set(url, result)
  return result
}

/**
 * 取会话的工作区根。
 * @param ctx - 插件上下文。
 * @param sessionId - 会话。
 * @returns 规范化后的根路径;取不到时返回 undefined。
 */
function workspaceRootOf(ctx: ClientContext, sessionId: string): string | undefined {
  try {
    const sessions = (ctx.get('uiConversation') as { readonly sessions?: unknown } | undefined)?.sessions as
      { readonly list?: { getSnapshot: () => { byId?: Record<string, { cwd?: string } | undefined> } } } | undefined
    const cwd = sessions?.list?.getSnapshot().byId?.[sessionId]?.cwd
    return typeof cwd === 'string' && cwd !== '' ? cwd.replace(/[/\\]+$/u, '') : undefined
  } catch (_error) {
    return undefined
  }
}

/**
 * 在 DSH 的右侧文档面板里打开一个产物。
 *
 * 走官方入口 `sidebarRight.openResource(地址)` —— `ui-reference` 就是这么做的。
 * 地址用 **session 作用域**(`dsh-resource://file/session/<id>/<相对路径>`):
 * 宿主按该会话自己持有的 workspace root 解析,与预览字节那条路由同一套隔离。
 *
 * 服务缺席或打不开时退回在新窗口里打开插件自己的预览路由 —— 那至少能让用户看到东西,
 * 而节点点了毫无反应是最差的。
 * @param ctx - 插件上下文。
 * @param sessionId - 会话。
 * @param path - 产物路径。
 * @param url - 插件预览路由的 URL,作为兜底。
 * @returns 无。
 */
function openArtifact(ctx: ClientContext, sessionId: string, path: string, url: string): void {
  const root = workspaceRootOf(ctx, sessionId)
  const relative = root !== undefined && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path
  const address = sessionFileAddress(sessionId, relative)
  try {
    const sidebarRight = ctx.get('sidebarRight') as {
      readonly openResource?: (address: string) => void
      readonly isExpanded?: () => boolean
      readonly toggleExpanded?: () => void
    } | undefined
    if (sidebarRight?.openResource !== undefined) {
      // **不用 `toggleExpanded()` 去开那个面 —— 它也抛同一个错。**
      // 实测:右栏收起时 `mounted: null`、`isExpanded: false`,而
      // `toggleExpanded()` 与 `openResource()` 都走 `require()`,都读 `this.mounted`,
      // 于是互为前提:没有面就展不开,展不开就没有面。**插件侧打不破这个循环** ——
      // 面是由 `RightbarSeat` 在 `active` 时自己开的,`active` 由外壳决定。
      //
      // 所以这里只试一次:成,就给用户官方的文档面板;败,就走下面的导航兜底。
      // 不再假装能展开 —— 那条路经实测不存在。
      sidebarRight.openResource(address)
      return
    }
  } catch (_error) {
    // 落下去用兜底,不要在这里吞掉用户的点击。
  }
  // **兜底用 `<a target="_blank">` 的程序化点击,不用 `window.open`。**
  // `window.open` 会被弹窗拦截器吞掉(实测:点了毫无反应,而 `openResource` 抛的
  // "no session surface is mounted" 被 catch 吃掉,于是两条路都无声失败)。
  // 锚点点击走的是导航而不是弹窗,不受同一套拦截。
  try {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.append(link)
    link.click()
    link.remove()
  } catch (_error) {
    // 走到这里说明连导航都发不出去。节点本来的作用是把产物显示出来,那件事已经做完了,
    // 所以这里不再往上抛 —— 但也不假装成功。
  }
}

/**
 * 把产物路径补成绝对路径。
 *
 * 产物的 `produced` 路径**有时相对有时绝对** —— 实测同一个工作区里,
 * `apple.svg` 是相对的,而另一个会话产出的是绝对路径。宿主路由只接受绝对路径
 * (`resolve()` 会把相对路径丢到宿主自己的 cwd 上,于是不在任何工作区根下,直接 403),
 * 所以这里用会话自己的工作区根补齐。
 *
 * 补不齐时**原样返回** —— 让宿主按不在工作区内拒绝,而不是猜一个别的文件出来。
 * @param ctx - 插件上下文。
 * @param sessionId - 会话。
 * @param path - 产物路径,绝对或相对。
 * @returns 绝对路径,或原路径。
 */
function absoluteArtifactPath(ctx: ClientContext, sessionId: string, path: string): string {
  if (path.startsWith('/')) return path
  const root = workspaceRootOf(ctx, sessionId)
  return root === undefined ? path : `${root}/${path.replace(/^\/+/u, '')}`
}


export function apply(ctx: ClientContext): void {
  /**
   * 「画布会话」被点过、但目标会话还没确定。
   *
   * **不是布尔标志。** 布尔标志会被"下一个出现的当前会话"消费 —— 而切换快过一次
   * 轮询时,那可能不是用户点的那一个。实测踩过:连着点两次后,标记落到了上一个会话上,
   * 当前会话反而没被标记,画布面板也就没切过去。
   *
   * 记录点击那一刻的会话与时间,收尾时按这两种情形判定:
   * - `startSession()` 真的开了新会话 → 当前会话与那时不同,记新的那个;
   * - **DSH 复用了空白会话**(实测常态,id 根本不变)→ 等一小会儿仍是同一个,就记它。
   * 超时未收尾就丢弃,免得一个陈旧的待办在几分钟后标记一个无关会话。
   */
  let pendingCanvasSession: { readonly before: string; readonly at: number } | undefined
  /** 画布产物的响应式来源;下面那个轮询负责刷新它,画布主体通过 hooks 隔间消费。 */
  const canvas = createCanvasSource()
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'landou-assistant: dictionaries')

  // ── 普通新会话不许继承画布标记 ────────────────────────────────────
  // 每一次会话启动都经过 `uiWorkspace.startSession` 那个唯一漏斗,所以订阅它就能
  // **覆盖全部路径**:工作区行菜单、侧栏顶部的全局「新会话」按钮、⌘N、以及别的插件。
  //
  // 为什么必须挂在这里、不能靠组件的回调:侧栏顶部按钮和 ⌘N 这两条路下,
  // 本插件**没有任何组件挂载** —— 菜单没开,贡献项不在 DOM 里,回调没人调。
  // 实测过一版"组件登记回调"的写法,它只堵住了工作区行那一条路。
  //
  // 判据是待办:点「画布会话」时会先设待办再 startSession,所以走到这里是
  // "要去标记";没有待办就走到了这里,说明用户要的是**普通**会话 —— 而 DSH 会
  // 复用那个空白会话,它可能还带着上次的标记,于是"新会话"开成了画布。
  ctx.effect(() => {
    const workspace = ctx.get('uiWorkspace') as {
      readonly onSessionStart?: (listener: () => void) => () => void
    } | undefined
    if (workspace?.onSessionStart === undefined) return
    return workspace.onSessionStart(() => {
      if (pendingCanvasSession !== undefined) return
      const session = (ctx.get('uiSession') as { readonly mainRetainId?: string } | undefined)?.mainRetainId
      if (session === undefined) return
      const marked = readCanvasSessions()
      if (!marked.delete(session)) return
      writeCanvasSessions(marked)
    })
  }, 'landou: a plain Session start is not a canvas Session')

  // ── 画布产物的刷新 ────────────────────────────────────────────────
  // 产物列表本身能同步读,但**预览 URL 不能** —— resources 是异步加载的。不轮询刷新
  // 的话图片节点会永远停在"预览不可用":数据后来到了,却没有东西让组件重渲染。
  // 800ms:产物是低频事件,快没必要;而比"猜一个订阅接口"可靠得多 ——
  // 产物来自会话事件的折叠,那个折叠把状态放在内部结构里,没有可订阅的口子。
  ctx.effect(() => {
    const timer = window.setInterval(() => {
      const sessionId = (ctx.get('uiSession') as { readonly mainRetainId?: string } | undefined)?.mainRetainId
      if (sessionId === undefined) { canvas.publish([]); return }
      const artifacts = readSessionArtifacts(ctx.get('uiConversation'), sessionId)
      void Promise.all(artifacts.map(async (artifact) => {
        const url = previewUrlFor(ctx, sessionId, artifact.path)
        return { artifact, url, preview: await loadTextPreview(url, artifact.path) }
      })).then((nodes) => { canvas.publish(nodes) })
    }, 800)
    return () => { window.clearInterval(timer) }
  }, 'landou: canvas artifacts')

  // ── 画布会话的布局跟随 ────────────────────────────────────────────
  // 当前会话一换就决定用哪个布局:是画布会话就切到画布面板,不是就切回对话。
  // 这让"画布会话"成为**会话自身的属性**,而不是一次性的界面动作 —— 重载、从会话列表
  // 点回来、切到别的会话,行为都一致。
  //
  // **电平触发,不是边沿触发。** 只在"会话变化"时评估的写法漏掉了"人已经待在某个会话里、
  // 标记之后才写入"这一情形(实测:标记写进去了,面板没切)。每次都算一遍期望布局、
  // 和现状不符就纠正,一条规则同时覆盖会话切换、重载恢复、迟到标记三种情形。
  //
  // 用轮询而不是订阅:`uiSession.mainRetainId` 是普通字符串字段,不是可观察量
  // (`uiSession.current` 那个可观察量给的是绑定源,不含会话 id)。
  ctx.effect(() => {
    let lastSession = ''
    const timer = window.setInterval(() => {
      const session = (ctx.get('uiSession') as { readonly mainRetainId?: string } | undefined)?.mainRetainId
      if (session === undefined) return
      const changed = session !== lastSession
      lastSession = session
      const pending = pendingCanvasSession
      // **不等,一发现新会话就收尾。** 原来要等 1200ms,是因为 DSH 会复用空白会话、
      // id 可能根本不变,只能靠"等一小会儿还是同一个"来判定。现在每次新建都是**新的**
      // 会话(id 必变),那个等待就没有意义了 —— 而它正好造成肉眼可见的闪烁:
      // 先按普通会话渲染,一秒多之后才跳到画布。实测就是这个症状。
      //
      // 保留一个很短的兜底:万一某条路径真的复用了会话,也不至于永远收不了尾。
      const settled = pending !== undefined && (changed || Date.now() - pending.at > 250)
      const marked = readCanvasSessions()
      if (pending !== undefined && settled) {
        pendingCanvasSession = undefined
        marked.add(session)
        writeCanvasSessions(marked)
      } else if (pending !== undefined && Date.now() - pending.at > 8000) {
        // 迟迟收不了尾就丢掉,免得一个陈旧待办日后标记一个无关会话。
        pendingCanvasSession = undefined
      }
      const layout = ctx.get('layout') as {
        readonly panelInfo: { getSnapshot: () => { activePanelId: string | null } }
        readonly selectPanel: (id: string | null) => void
      } | undefined
      if (layout === undefined) return
      const active = layout.panelInfo.getSnapshot().activePanelId
      if (marked.has(session)) {
        if (active !== CANVAS_PANEL_ID) layout.selectPanel(CANVAS_PANEL_ID)
      } else if (active === CANVAS_PANEL_ID) {
        // 切回普通会话时把布局还回去,否则会停在一个不属于它的画布上。
        layout.selectPanel(null)
      }
    }, 400)
    return () => { window.clearInterval(timer) }
  }, 'landou: canvas layout follows the session')

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
    children: {
      'landou.canvas.toolbar': { kind: 'list', scope: 'session' },
      // 画布主体必须是 session 作用域:面板在 root 上拿不到 sessionId,而产物按会话取。
      // 顺带这也是框架给出 SessionProvider 的条件。
      'landou.canvas.body': { kind: 'single', scope: 'session' },
    },
  }, LandouCanvasPanel))

  // **这一项渲染在「新会话」按钮弹出的菜单里**,不是侧栏上一行独立按钮。
  //
  // **刻意不注册 `sidebar.panellist`。**
  //
  // 侧栏上面那排行是从 `sidebar.panellist` 的条目生成的(ui-sidebar 的
  // `entriesOfSlot('sidebar.panellist')`),不是从 `main` 的键。所以不注册就没有行 ——
  // 而 `main` 面板照旧存在、照旧能被 `layout.selectPanel` 选中。
  //
  // 画布会话应当**和普通会话一样排在它所属的工作区下面**,而不是在侧栏上方多出一行
  // 视图切换。这里少一行注册,正好就是那条要求。

  // ── 工作区行上的「画布会话」 ──────────────────────────────────────
  // 挂在**工作区那一行的「+」**上(`sidebar.workspaces.newsession.item`),不在侧栏上方的
  // 全局「新会话」里。位置是有意义的:画布会话就是**这个工作区**里的一个普通会话,
  // 它会像其它会话一样排在该工作区下面 —— 那么"新建它"的入口就该和"在该工作区新建会话"
  // 在一起,而不是在管所有工作区的全局按钮上。
  //
  // 这个 slot 是本工作区的第四处上游改动;那个「+」在有贡献项时变成菜单。
  ctx.slots.inject('sidebar.workspaces.newsession.item', () => ctx.slots.register({
    name: 'sidebar.workspaces.newsession.item',
    id: 'canvas-session',
    order: 10,
    locale: NS,
    inject: () => ({
      // 用户选了普通新会话 —— 撤销当前会话的画布标记。DSH 会复用那个空白会话,
      // 它可能还带着上次的标记,不撤销的话"新会话"会开成画布。
      forgetCanvasSession: () => {
        const session = (ctx.get('uiSession') as { readonly mainRetainId?: string } | undefined)?.mainRetainId
        if (session === undefined) return
        const marked = readCanvasSessions()
        if (!marked.delete(session)) return
        writeCanvasSessions(marked)
      },
      startCanvasSession: (workspaceId: string, startSession: () => void) => {
        // **先记待办再开会话。** DSH 会复用空白会话(id 不变),所以不能靠"新 id"判断;
        // 观察器按"点击那一刻的会话 + 一个短等待"收尾,两种情形都覆盖。
        pendingCanvasSession = {
          before: (ctx.get('uiSession') as { readonly mainRetainId?: string } | undefined)?.mainRetainId ?? '',
          at: Date.now(),
        }
        startSession()
        void workspaceId
      },
    }),
  }, LandouNewSessionAction))

  // ── 画布会话的标志 ────────────────────────────────────────────────
  // 挂在输入框那一列(模型/agent 选择器旁边)—— 会话列表里两种会话长得一样,
  // 用户需要一眼知道自己在哪种里。**普通会话返回 null**,不给它一个"非画布"的标记,
  // 那只会让两种会话都多一个噪音。
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'canvas-session-badge',
    order: 10,
    locale: NS,
    inject: (sessionId: string) => ({
      isCanvasSession: sessionId !== undefined && readCanvasSessions().has(sessionId),
    }),
  }, CanvasSessionBadge))

  // ── 画布主体 ──────────────────────────────────────────────────────
  // inject 闭包拿到的 ctx 与 entry 的 sessionId;主体据此读产物、算预览地址。
  ctx.slots.inject('landou.canvas.body', () => ctx.slots.register({
    name: 'landou.canvas.body',
    id: 'canvas-body',
    locale: NS,
    // hooks 隔间:渲染器把 `artifacts` 绑成 `useArtifacts`。业务组件不得自带
    // 订阅机制,而预览 URL 是异步到的 —— 这个隔间就是这两条之间的桥。
    // inject 必须是**函数** —— 写成对象字面量会在注册时抛
    // `TypeError: inject is not a function`,而报错只指向 slot 核心,
    // 症状是"画布主体整个不渲染"(既无网格也无空态)。
    // **参数不能省。** 写成 `() => ({...})` 时 `sessionId` 不在作用域里,报
    // `ReferenceError: sessionId is not defined` —— 而报错指的是 openArtifact,
    // 不是 inject,所以看起来像打开功能坏了,实际是签名少了一个参数。
    inject: (sessionId: string) => ({
      hooks: { artifacts: canvas.source },
      // 注册处注入而不是让组件自己取 ctx:业务组件看不到 ctx,这是 DSH 的硬规矩。
      openArtifact: (path: string, url: string) => { openArtifact(ctx, sessionId, path, url) },
    }),
  }, LandouCanvasBody))

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
