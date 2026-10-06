/**
 * 蓝豆助手 —— 宿主半边。
 *
 * 这一半做三件事,全部必须在 Node 侧完成:
 *
 * 1. **代打到蓝豆 ERP**。浏览器半边不能直连 `dmaierp.com` ——
 *    实测预检返回 `vary: Origin` 但不回 `access-control-allow-origin`,
 *    也就是服务端只对白名单源放行,`dsh-app://app` 不在其中。
 * 2. **持有访问令牌**。令牌只留在宿主进程与磁盘上,**绝不发给浏览器**。
 *    客户端拿到的只有"是否已登录 + 显示名 + user_id"这些非机密事实。
 * 3. **落盘**。存在 `$DSH_HOME/landou-assistant/session.json`,权限 0600。
 *    这与 DSH 自带的 `credentials-local` 是同一模型(它同样是 harness home 下的
 *    私有文件,而非系统钥匙串)。
 *
 * 路由挂在宿主 webserver 上。Desktop 的 Electron 会把 `dsh-app://app` 下
 * 除静态资源外的**任意路径**原样转发给宿主(见 `apps/desktop/src/web-document.ts`
 * 的 `forwardWebRequest`),所以客户端用相对路径 fetch 即可,同源、无 CORS。
 * Web 载体下客户端页面本来就在宿主源上,同样成立。
 *
 * @module dsh-landou-assistant/host
 */
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { homedir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'

/** Cordis 插件名。 */
export const name = 'landou-assistant'

/** 必需服务:宿主 web 服务器(路由挂载点)。 */
export const inject = ['webServer']

/** 客户端 fetch 的相对前缀。除静态资源外的任意路径都会被 Electron 转发到宿主。 */
export const ROUTE_PREFIX = '/landou-assistant'

/** 蓝豆 ERP API 基址。默认与 landou-erp-mcp 一致,可用环境变量指向测试部署。 */
const ERP_API_BASE = (process.env.LANDOU_API_BASE_URL ?? process.env.ERP_API_BASE_URL ?? 'https://dmaierp.com/api').replace(/\/+$/u, '')

/** ERP 用来区分客户端的值 —— 固定声明为蓝豆助手,便于服务端侧统计与风控。 */
const CLIENT_TYPE = 'landou_assistant'

/** 单次 ERP 请求的超时。登录有交互等待,给足但仍要有上限。 */
const REQUEST_TIMEOUT_MS = 20_000

/** 请求体上限。认证请求体很小,超出的一律拒绝,避免被当成内存放大器。 */
const MAX_BODY_BYTES = 64 * 1024

/**
 * 解析 DSH home。
 *
 * 刻意**不 import `@deepseek-ai/dsh-home-paths`** —— 那是 DSH 的内部包,
 * 本插件装在 profile 的 node_modules 里,Node 会相对插件自身解析,
 * 找不到它(构建时也会报 UNRESOLVED_IMPORT)。这里按 DSH 自己公布的规则算:
 * `$DSH_HOME`,否则 `~/.dsh`。
 */
function resolveDshHome(): string {
  const fromEnvironment = process.env.DSH_HOME
  if (typeof fromEnvironment === 'string' && fromEnvironment.trim() !== '') return fromEnvironment
  return join(homedir(), '.dsh')
}

/**
 * 画布预览用的 MIME 表。
 *
 * 只列画布会渲染的三类:图片、视频、文字。表外的扩展名一律 `application/octet-stream` ——
 * 猜错的 MIME 会让浏览器把文件当别的东西处理,比不认得还糟。
 */
const PREVIEW_MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v',
  '.ogv': 'video/ogg',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.ts': 'text/plain; charset=utf-8',
}

/** 工作区表缓存:路径与会话归属在一次进程生命周期内基本不变。 */
let workspaceCache: { at: number; bySession: Map<string, string> } | undefined

/** 缓存有效期。够短,真的移动了工作区也不会长期用旧的。 */
const WORKSPACE_TTL_MS = 15_000

/**
 * 会话 → 它的工作区根。
 *
 * 读 `$DSH_HOME/storages/workspace.json`:每个工作区带 `path` 与 `sessionIds`,
 * 所以会话归属是从 DSH 自己的记录里查出来的,**不是客户端说了算**。
 *
 * 启动早期这份存储还没落盘,读到空表就等于"什么都不服务" —— 而浏览器对失败过的
 * `<img>` 不会自己重试,首次失败是粘住的(实测:重启后前几个预览全 403,手工再打
 * 同一个 URL 立刻 200,页面上却永远空着)。所以空结果**刻意不入缓存**,
 * 让存储落盘后的下一次请求自己恢复。
 * @returns 会话 id 到工作区根绝对路径的映射。
 */
async function sessionWorkspaces(): Promise<Map<string, string>> {
  if (workspaceCache !== undefined && Date.now() - workspaceCache.at < WORKSPACE_TTL_MS) return workspaceCache.bySession
  const bySession = new Map<string, string>()
  try {
    const raw = await readFile(join(resolveDshHome(), 'storages', 'workspace.json'), 'utf8')
    const parsed = JSON.parse(raw) as { tables?: { workspaces?: Record<string, { path?: unknown; sessionIds?: unknown }> } }
    for (const entry of Object.values(parsed.tables?.workspaces ?? {})) {
      if (typeof entry.path !== 'string' || !Array.isArray(entry.sessionIds)) continue
      for (const id of entry.sessionIds) {
        if (typeof id === 'string') bySession.set(id, resolve(entry.path))
      }
    }
  } catch (_error) {
    return bySession
  }
  if (bySession.size > 0) workspaceCache = { at: Date.now(), bySession }
  return bySession
}

/** 目标是否落在根之下。 */
function underRoot(target: string, root: string): boolean {
  return target === root || target.startsWith(root.endsWith(sep) ? root : root + sep)
}

/** 落盘位置。 */
function sessionFile(): string {
  return join(resolveDshHome(), 'landou-assistant', 'session.json')
}

/** 持久化的会话形态。令牌只存在这个文件里。 */
interface StoredSession {
  readonly accessToken: string
  readonly userId: string
  readonly displayName: string
  /** 绝对到期时刻(毫秒)。用于决定是否先续期再发请求。 */
  readonly expiresAt: number
  /** 与 ERP 约定的客户端设备标识,注册/登录时上报,登录后保持不变。 */
  readonly deviceId: string
}

/** ERP 认证接口的统一响应体。 */
interface ErpTokenResponse {
  access_token: string
  token_type?: string
  user_id: string
  display_name: string
  expires_in_seconds: number
}

/** 发给浏览器的会话视图 —— **不含令牌**。 */
export interface SessionView {
  authenticated: boolean
  userId?: string
  displayName?: string
  /** 令牌到期时刻(毫秒)。仅用于界面提示,不含任何机密。 */
  expiresAt?: number
}

/** 一次 ERP 调用的结果。 */
type ErpResult<T> = { ok: true; value: T } | { ok: false; status: number; message: string }

/** 把 ERP 的错误体折叠成一句人话;不泄露内部细节。 */
function erpErrorMessage(status: number, payload: unknown): string {
  const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
    ? (payload as { detail?: unknown }).detail
    : undefined
  if (typeof detail === 'string' && detail.trim() !== '') return detail
  if (Array.isArray(detail)) {
    const first = detail.find(entry => typeof entry === 'object' && entry !== null && 'msg' in entry)
    if (first !== undefined) return String((first as { msg: unknown }).msg)
  }
  if (status === 401) return 'Invalid email or password'
  if (status === 429) return 'Too many attempts, try again later'
  return `Request failed (${String(status)})`
}

/** 带超时的 ERP 调用。禁用重定向 —— 凭据绝不跟随跳转离开既定主机。 */
async function erp<T>(path: string, init: { method: string; body?: unknown; token?: string }): Promise<ErpResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${ERP_API_BASE}${path}`, {
      method: init.method,
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(init.token === undefined ? {} : { authorization: `Bearer ${init.token}` }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
    const text = await response.text()
    let payload: unknown
    try { payload = text === '' ? undefined : JSON.parse(text) } catch { payload = undefined }
    if (!response.ok) return { ok: false, status: response.status, message: erpErrorMessage(response.status, payload) }
    return { ok: true, value: payload as T }
  } catch (error) {
    // 中止、DNS、TLS、网络不可达都归到这里;区分它们对用户没有意义。
    const aborted = error instanceof Error && error.name === 'AbortError'
    return { ok: false, status: 0, message: aborted ? 'Blue Bean ERP did not respond in time' : 'Could not reach Blue Bean ERP' }
  } finally {
    clearTimeout(timer)
  }
}

/** 读取已落盘的会话;文件缺失或损坏都当作未登录,并顺手清掉损坏文件。 */
async function readSession(): Promise<StoredSession | undefined> {
  let raw: string
  try {
    raw = await readFile(sessionFile(), 'utf8')
  } catch {
    return undefined
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (typeof parsed.accessToken !== 'string' || typeof parsed.userId !== 'string') throw new Error('shape')
    return {
      accessToken: parsed.accessToken,
      userId: parsed.userId,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0,
      deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : randomUUID(),
    }
  } catch {
    await rm(sessionFile(), { force: true }).catch(() => undefined)
    return undefined
  }
}

/** 原子落盘并收紧权限:先写临时文件并 chmod,再 rename,不出现权限宽松的窗口。 */
async function writeSession(session: StoredSession): Promise<void> {
  const file = sessionFile()
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 })
  await chmod(temporary, 0o600)
  await rename(temporary, file)
}

/** 令牌响应 → 持久化形态。 */
function toStored(response: ErpTokenResponse, deviceIdValue: string): StoredSession {
  return {
    accessToken: response.access_token,
    userId: response.user_id,
    displayName: response.display_name,
    // 留 60 秒余量,避免"刚好卡在边界上"的请求被拒。
    expiresAt: Date.now() + Math.max(0, response.expires_in_seconds - 60) * 1000,
    deviceId: deviceIdValue,
  }
}

/** 持久化形态 → 浏览器可见视图(**不含令牌**)。 */
function toView(session: StoredSession): SessionView {
  return { authenticated: true, userId: session.userId, displayName: session.displayName, expiresAt: session.expiresAt }
}

/**
 * 稳定的设备标识。退出登录会删掉会话文件,所以标识先取出来再复用,
 * 否则同一台机器每次登录都会以新设备身份出现。
 */
async function deviceId(): Promise<string> {
  const existing = await readSession()
  return existing?.deviceId ?? randomUUID()
}

/**
 * 解析会话:读取 → 必要时续期 → 仅在服务端明确否认时清理。
 *
 * 网络错误**不清令牌** —— 否则断网一次就把用户踢下线了。
 * @returns 有效会话,或 undefined 表示未登录。
 */
async function currentSession(): Promise<StoredSession | undefined> {
  const session = await readSession()
  if (session === undefined) return undefined
  if (session.expiresAt > Date.now()) return session

  const renewed = await erp<ErpTokenResponse>('/auth/renew', { method: 'POST', token: session.accessToken })
  if (renewed.ok) {
    const next = toStored(renewed.value, session.deviceId)
    await writeSession(next)
    return next
  }
  if (renewed.status === 401 || renewed.status === 403) {
    await rm(sessionFile(), { force: true }).catch(() => undefined)
    return undefined
  }
  return session
}

/** 读取请求体并做上限与 JSON 校验。 */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  if (size === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

/** 只回 JSON,且**不带任何 CORS 头** —— 其他源的浏览器脚本因此读不到响应。 */
function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/** 取一个必填的非空字符串字段。 */
function requiredString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** 取一个可选的非空字符串字段。 */
function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** 登录/注册成功后的共同收尾。 */
async function completeAuth<T extends ErpTokenResponse>(res: ServerResponse, response: T): Promise<void> {
  const stored = toStored(response, await deviceId())
  await writeSession(stored)
  sendJson(res, 200, toView(stored))
}

/**
 * 挂载宿主路由。
 * @param ctx - 宿主上下文;`webServer` 由 inject 保证存在。
 */
export function apply(ctx: Context): void {
  // 启动就预热一次,让第一个预览请求落在已缓存的根上,而不是撞上"存储还没落盘"。
  void sessionWorkspaces()

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: async (req, res) => {
      const path = (req.url ?? '').split('?')[0]?.slice(ROUTE_PREFIX.length) ?? ''
      const method = req.method ?? 'GET'

      // ── 画布预览的文件字节 ────────────────────────────────────────
      // 存在的理由:`file` 资源协议只给元数据(`{absolutePath, version, bytes}`),
      // **不含字节也不含 URL**(实测读 providers/workspace-files/src/client/provider.ts),
      // 所以浏览器侧没有任何内置途径把工作区文件读成图片。官方图片预览是从调用方
      // 拿字节的,那条通道不属于插件。这里补的正是这一段。
      if (method === 'GET' && path === '/file') {
        const query = new URL(req.url ?? '/', 'http://localhost').searchParams
        const requested = query.get('path')
        const sessionId = query.get('session')
        if (requested === null || requested === '' || sessionId === null || sessionId === '') {
          sendJson(res, 400, { error: 'path 与 session 都必填' })
          return
        }
        // **按会话授权,不是按"任意已登记工作区"。** 根从 DSH 自己的 workspace 记录里
        // 查出来,客户端只负责说"我在哪个会话里",说不了"我可以读哪里"。
        // 认不出这个会话就拒绝 —— 拒绝是安全侧的失败方向,而产物只会在 agent 跑过之后
        // 才存在,那时会话已经记进 workspace.json 了。
        const root = (await sessionWorkspaces()).get(sessionId)
        if (root === undefined) { sendJson(res, 403, { error: '会话不属于任何已登记工作区' }); return }
        const target = resolve(requested)
        if (!underRoot(target, root)) { sendJson(res, 403, { error: '不在该会话的工作区内' }); return }
        let info
        try {
          info = await stat(target)
        } catch (_error) {
          sendJson(res, 404, { error: '文件不存在' }); return
        }
        if (!info.isFile()) { sendJson(res, 400, { error: '不是常规文件' }); return }
        const bytes = await readFile(target)
        res.writeHead(200, {
          'content-type': PREVIEW_MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
          // 产物会被后续轮次覆盖,所以不能长缓存;`no-cache` 仍允许 304 协商。
          'cache-control': 'no-cache',
          'content-length': bytes.byteLength,
          // 这是用户自己的工作区文件,但标签页不该拿到它的脚本执行权。
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          'x-content-type-options': 'nosniff',
        })
        res.end(bytes)
        return
      }

      // ── 当前会话:客户端启动与每次登录状态检查都打这里 ──────────────
      if (method === 'GET' && path === '/session') {
        const session = await currentSession()
        sendJson(res, 200, session === undefined ? { authenticated: false } satisfies SessionView : toView(session))
        return
      }

      // ── 登录 ──────────────────────────────────────────────────────
      if (method === 'POST' && path === '/session/login') {
        const body = await readJsonBody(req)
        const email = body === undefined ? undefined : requiredString(body, 'email')
        const password = body === undefined ? undefined : requiredString(body, 'password')
        if (email === undefined || password === undefined) {
          sendJson(res, 400, { message: 'Email and password are required' })
          return
        }
        const result = await erp<ErpTokenResponse>('/auth/login', {
          method: 'POST',
          body: { email, password, client_type: CLIENT_TYPE, device_id: await deviceId() },
        })
        if (!result.ok) { sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message }); return }
        await completeAuth(res, result.value)
        return
      }

      // ── 注册 ──────────────────────────────────────────────────────
      if (method === 'POST' && path === '/session/register') {
        const body = await readJsonBody(req)
        const email = body === undefined ? undefined : requiredString(body, 'email')
        const password = body === undefined ? undefined : requiredString(body, 'password')
        const displayName = body === undefined ? undefined : requiredString(body, 'displayName')
        if (body === undefined || email === undefined || password === undefined || displayName === undefined) {
          sendJson(res, 400, { message: 'Email, password and display name are required' })
          return
        }
        const verificationCode = optionalString(body, 'verificationCode')
        const inviteCode = optionalString(body, 'inviteCode')
        const result = await erp<ErpTokenResponse>('/auth/register', {
          method: 'POST',
          body: {
            email,
            password,
            display_name: displayName,
            client_type: CLIENT_TYPE,
            device_id: await deviceId(),
            // 注册前必须在界面上勾选,这里如实上报两个同意位。
            accepted_terms: body.acceptedTerms === true,
            accepted_cross_border_transfer: body.acceptedCrossBorderTransfer === true,
            ...(verificationCode === undefined ? {} : { verification_code: verificationCode }),
            ...(inviteCode === undefined ? {} : { invite_code: inviteCode }),
          },
        })
        if (!result.ok) { sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message }); return }
        await completeAuth(res, result.value)
        return
      }

      // ── 邮箱验证码(注册与重置密码共用)───────────────────────────
      if (method === 'POST' && path === '/session/email-code') {
        const body = await readJsonBody(req)
        const email = body === undefined ? undefined : requiredString(body, 'email')
        const purpose = body === undefined ? undefined : requiredString(body, 'purpose')
        if (email === undefined || (purpose !== 'register' && purpose !== 'reset_password')) {
          sendJson(res, 400, { message: 'Email and a valid purpose are required' })
          return
        }
        const result = await erp<{ sent?: boolean; expires_in_seconds?: number; resend_cooldown_seconds?: number }>(
          '/auth/email-code',
          { method: 'POST', body: { email, purpose } },
        )
        if (!result.ok) { sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message }); return }
        sendJson(res, 200, {
          sent: result.value.sent === true,
          expiresInSeconds: result.value.expires_in_seconds ?? 0,
          resendCooldownSeconds: result.value.resend_cooldown_seconds ?? 0,
        })
        return
      }

      // ── 退出登录 ──────────────────────────────────────────────────
      if (method === 'POST' && path === '/session/logout') {
        const session = await readSession()
        // 先尽力通知服务端撤销,失败也照样清本地 —— 用户点了退出就必须退出。
        if (session !== undefined) await erp('/auth/logout', { method: 'POST', token: session.accessToken })
        await rm(sessionFile(), { force: true }).catch(() => undefined)
        sendJson(res, 200, { authenticated: false } satisfies SessionView)
        return
      }

      sendJson(res, 404, { message: 'Not found' })
    },
  }), 'landou-assistant: authentication routes')
}
