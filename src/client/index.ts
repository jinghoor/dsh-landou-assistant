/**
 * 蓝豆助手 —— 浏览器半边。
 *
 * 三处贡献,其中一处受登录状态约束:
 *
 *  1. `sidebar.brand.name` —— **仅在已登录时占用**,把官方品牌名换成
 *     「蓝豆助手 by DeepSeek Harness」。未登录时完全不注册,侧栏保持官方原样。
 *     这就是"登录后才能使用本插件"的实现点:登出即撤掉占用,官方品牌自然回归。
 *  2. `settings.section` —— 设置面板里的「蓝豆助手」页。**始终注册**,
 *     否则未登录的用户找不到登录入口。未登录显示注册/登录表单,已登录显示账号页。
 *  3. 本地化字典。
 *
 * 登录状态由宿主半边判定(`GET /landou-assistant/session`),浏览器只拿到
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
import { LandouSettingsSection } from './LandouSettingsSection.tsx'
import { en, zh } from './locales.ts'
import { getSession, login, logout, register, sendEmailCode } from './session.ts'

/** 本插件拥有的文案命名空间。 */
const NS = 'landou-assistant'

/** 必需服务:UI slot 注册表 + 本地化字典。 */
export const inject = ['slots', 'locale']

/**
 * 注册本插件的全部浏览器贡献。
 * @param ctx - 浏览器根上下文。
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'landou-assistant: dictionaries')

  // ── 登录状态:插件是否可用的唯一判据 ──────────────────────────────
  let authenticated = false
  let brandDisposer: (() => void) | undefined

  /**
   * 让侧栏品牌的注册与登录状态保持一致。
   *
   * `slots.inject` 返回 disposer,所以登出时能真正撤掉那个占用 ——
   * 官方品牌插件从未被禁用,我们的注册消失后它自然重新成为唯一占用者。
   */
  const syncBrand = (): void => {
    if (authenticated && brandDisposer === undefined) {
      brandDisposer = ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, LandouBrandName)
      })
    } else if (!authenticated && brandDisposer !== undefined) {
      brandDisposer()
      brandDisposer = undefined
    }
  }

  /**
   * 向宿主问一次会话并同步品牌。
   * @returns 是否拿到了**明确答复**。false 表示请求本身失败(宿主未就绪、网络抖动),
   *   此时**不能**据此认定用户未登录 —— 那会让已登录的用户看不到品牌。
   */
  const refreshSession = async (): Promise<boolean> => {
    const result = await getSession()
    if (!result.ok) return false
    const next = result.value.authenticated
    if (next !== authenticated) {
      authenticated = next
      syncBrand()
    }
    return true
  }

  // 启动竞态:客户端脚本可能比宿主路由先就绪,一次失败就放弃会让已登录用户
  // 看不到品牌。重试到拿到明确答复为止,仍失败则保持未登录(下一次复查会纠正)。
  const STARTUP_RETRY_MS = 1_500
  const STARTUP_ATTEMPTS = 6
  void (async () => {
    for (let attempt = 0; attempt < STARTUP_ATTEMPTS; attempt += 1) {
      if (await refreshSession()) return
      await new Promise((resolve) => { setTimeout(resolve, STARTUP_RETRY_MS) })
    }
  })()

  // 会话可能在别处变化 —— 在设置页登录(已由 notifySessionChanged 覆盖)、
  // 宿主重启、或用户在别处退出。窗口重新可见/获得焦点时复查一次,让状态自愈。
  if (typeof document !== 'undefined') {
    const recheck = (): void => {
      if (document.visibilityState === 'visible') void refreshSession()
    }
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    ctx.effect(() => () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('focus', recheck)
    }, 'landou-assistant: session re-check listeners')
  }

  // ── 设置页导航项 ──────────────────────────────────────────────────
  // `settings.section` 是列表 slot,导航身份由注册选项给出:
  //   id    —— 分区键,也是 shell 选图标时的匹配键
  //   order —— 导航位置;官方分区是 account -10 / general 0 / models 10 /
  //            plugins 15 / agent-presets 20,这里排最后
  //   label —— 注册方自行本地化的显示文本
  // shell 没有自己的文案,全部来自注册方。
  //
  // 这一项**不受登录状态约束**:未登录的用户必须能在这里找到登录入口。
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'landou-assistant',
    order: 30,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({
      getSession,
      login,
      register,
      sendEmailCode,
      logout,
      // 页面里登录/登出完成后回调这里,让侧栏品牌立刻跟着变。
      notifySessionChanged: () => { void refreshSession() },
    }),
  }, LandouSettingsSection))
}
