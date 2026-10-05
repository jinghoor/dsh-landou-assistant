/**
 * 浏览器半边访问蓝豆 ERP 的唯一通道。
 *
 * 全部走**相对路径**,打到宿主 webserver 上由宿主半边代理转发到 ERP。
 * 浏览器不直连 `dmaierp.com`:实测该站预检返回 `vary: Origin` 但不下发
 * `access-control-allow-origin`,`dsh-app://app` 不在白名单里。
 *
 * 这里**永远拿不到访问令牌** —— 宿主只回"是否已登录 + 显示名 + user_id"。
 * 令牌留在宿主进程与 0600 文件里,不进浏览器、不进 React 状态、不进日志。
 */

/** 宿主路由前缀,与宿主半边的 `ROUTE_PREFIX` 一致。 */
const BASE = '/landou-assistant'

/** 宿主返回的会话视图。 */
export interface SessionView {
  authenticated: boolean
  userId?: string
  displayName?: string
  /** 令牌到期时刻(毫秒),仅用于界面提示。 */
  expiresAt?: number
}

/** 一次调用的结果。失败带一句可直接展示给用户的话。 */
export type CallResult<T> = { ok: true; value: T } | { ok: false; message: string }

/** 注册所需的输入。 */
export interface RegisterInput {
  email: string
  password: string
  displayName: string
  /** 邮箱验证码;ERP 的注册接口接受它作为可选字段。 */
  verificationCode?: string
  /** 邀请码,可选。 */
  inviteCode?: string
  acceptedTerms: boolean
  acceptedCrossBorderTransfer: boolean
}

/** 调用宿主路由。网络本身出错(宿主没起来、被中断)也折叠成可展示的消息。 */
async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<CallResult<T>> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: { accept: 'application/json', ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
    const text = await response.text()
    let payload: unknown
    try { payload = text === '' ? undefined : JSON.parse(text) } catch { payload = undefined }
    if (!response.ok) {
      const message = typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed (${String(response.status)})`
      return { ok: false, message }
    }
    return { ok: true, value: payload as T }
  } catch {
    return { ok: false, message: 'Cannot reach the local Blue Bean service' }
  }
}

/** 读取当前会话。这是唯一的登录状态来源。 */
export function getSession(): Promise<CallResult<SessionView>> {
  return call<SessionView>('/session')
}

/** 登录。 */
export function login(email: string, password: string): Promise<CallResult<SessionView>> {
  return call<SessionView>('/session/login', { method: 'POST', body: { email, password } })
}

/** 注册。成功后 ERP 直接下发令牌,等同于已登录。 */
export function register(input: RegisterInput): Promise<CallResult<SessionView>> {
  return call<SessionView>('/session/register', { method: 'POST', body: input })
}

/** 发送邮箱验证码。 */
export function sendEmailCode(
  email: string,
  purpose: 'register' | 'reset_password',
): Promise<CallResult<{ sent: boolean; expiresInSeconds: number; resendCooldownSeconds: number }>> {
  return call('/session/email-code', { method: 'POST', body: { email, purpose } })
}

/** 退出登录。宿主会同时撤销服务端会话并删掉本地令牌文件。 */
export function logout(): Promise<CallResult<SessionView>> {
  return call<SessionView>('/session/logout', { method: 'POST' })
}
