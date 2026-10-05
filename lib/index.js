import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
//#region src/index.ts
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
/** Cordis 插件名。 */
const name = "landou-assistant";
/** 必需服务:宿主 web 服务器(路由挂载点)。 */
const inject = ["webServer"];
/** 客户端 fetch 的相对前缀。除静态资源外的任意路径都会被 Electron 转发到宿主。 */
const ROUTE_PREFIX = "/landou-assistant";
/** 蓝豆 ERP API 基址。默认与 landou-erp-mcp 一致,可用环境变量指向测试部署。 */
const ERP_API_BASE = (process.env.LANDOU_API_BASE_URL ?? process.env.ERP_API_BASE_URL ?? "https://dmaierp.com/api").replace(/\/+$/u, "");
/** ERP 用来区分客户端的值 —— 固定声明为蓝豆助手,便于服务端侧统计与风控。 */
const CLIENT_TYPE = "landou_assistant";
/** 单次 ERP 请求的超时。登录有交互等待,给足但仍要有上限。 */
const REQUEST_TIMEOUT_MS = 2e4;
/** 请求体上限。认证请求体很小,超出的一律拒绝,避免被当成内存放大器。 */
const MAX_BODY_BYTES = 64 * 1024;
/**
* 解析 DSH home。
*
* 刻意**不 import `@deepseek-ai/dsh-home-paths`** —— 那是 DSH 的内部包,
* 本插件装在 profile 的 node_modules 里,Node 会相对插件自身解析,
* 找不到它(构建时也会报 UNRESOLVED_IMPORT)。这里按 DSH 自己公布的规则算:
* `$DSH_HOME`,否则 `~/.dsh`。
*/
function resolveDshHome() {
	const fromEnvironment = process.env.DSH_HOME;
	if (typeof fromEnvironment === "string" && fromEnvironment.trim() !== "") return fromEnvironment;
	return join(homedir(), ".dsh");
}
/** 落盘位置。 */
function sessionFile() {
	return join(resolveDshHome(), "landou-assistant", "session.json");
}
/** 把 ERP 的错误体折叠成一句人话;不泄露内部细节。 */
function erpErrorMessage(status, payload) {
	const detail = typeof payload === "object" && payload !== null && "detail" in payload ? payload.detail : void 0;
	if (typeof detail === "string" && detail.trim() !== "") return detail;
	if (Array.isArray(detail)) {
		const first = detail.find((entry) => typeof entry === "object" && entry !== null && "msg" in entry);
		if (first !== void 0) return String(first.msg);
	}
	if (status === 401) return "Invalid email or password";
	if (status === 429) return "Too many attempts, try again later";
	return `Request failed (${String(status)})`;
}
/** 带超时的 ERP 调用。禁用重定向 —— 凭据绝不跟随跳转离开既定主机。 */
async function erp(path, init) {
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort();
	}, REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(`${ERP_API_BASE}${path}`, {
			method: init.method,
			redirect: "error",
			signal: controller.signal,
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				...init.token === void 0 ? {} : { authorization: `Bearer ${init.token}` }
			},
			...init.body === void 0 ? {} : { body: JSON.stringify(init.body) }
		});
		const text = await response.text();
		let payload;
		try {
			payload = text === "" ? void 0 : JSON.parse(text);
		} catch {
			payload = void 0;
		}
		if (!response.ok) return {
			ok: false,
			status: response.status,
			message: erpErrorMessage(response.status, payload)
		};
		return {
			ok: true,
			value: payload
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			message: error instanceof Error && error.name === "AbortError" ? "Blue Bean ERP did not respond in time" : "Could not reach Blue Bean ERP"
		};
	} finally {
		clearTimeout(timer);
	}
}
/** 读取已落盘的会话;文件缺失或损坏都当作未登录,并顺手清掉损坏文件。 */
async function readSession() {
	let raw;
	try {
		raw = await readFile(sessionFile(), "utf8");
	} catch {
		return;
	}
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed.accessToken !== "string" || typeof parsed.userId !== "string") throw new Error("shape");
		return {
			accessToken: parsed.accessToken,
			userId: parsed.userId,
			displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
			expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : 0,
			deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : randomUUID()
		};
	} catch {
		await rm(sessionFile(), { force: true }).catch(() => void 0);
		return;
	}
}
/** 原子落盘并收紧权限:先写临时文件并 chmod,再 rename,不出现权限宽松的窗口。 */
async function writeSession(session) {
	const file = sessionFile();
	await mkdir(dirname(file), {
		recursive: true,
		mode: 448
	});
	const temporary = `${file}.tmp`;
	await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, { mode: 384 });
	await chmod(temporary, 384);
	await rename(temporary, file);
}
/** 令牌响应 → 持久化形态。 */
function toStored(response, deviceIdValue) {
	return {
		accessToken: response.access_token,
		userId: response.user_id,
		displayName: response.display_name,
		expiresAt: Date.now() + Math.max(0, response.expires_in_seconds - 60) * 1e3,
		deviceId: deviceIdValue
	};
}
/** 持久化形态 → 浏览器可见视图(**不含令牌**)。 */
function toView(session) {
	return {
		authenticated: true,
		userId: session.userId,
		displayName: session.displayName,
		expiresAt: session.expiresAt
	};
}
/**
* 稳定的设备标识。退出登录会删掉会话文件,所以标识先取出来再复用,
* 否则同一台机器每次登录都会以新设备身份出现。
*/
async function deviceId() {
	return (await readSession())?.deviceId ?? randomUUID();
}
/**
* 解析会话:读取 → 必要时续期 → 仅在服务端明确否认时清理。
*
* 网络错误**不清令牌** —— 否则断网一次就把用户踢下线了。
* @returns 有效会话,或 undefined 表示未登录。
*/
async function currentSession() {
	const session = await readSession();
	if (session === void 0) return void 0;
	if (session.expiresAt > Date.now()) return session;
	const renewed = await erp("/auth/renew", {
		method: "POST",
		token: session.accessToken
	});
	if (renewed.ok) {
		const next = toStored(renewed.value, session.deviceId);
		await writeSession(next);
		return next;
	}
	if (renewed.status === 401 || renewed.status === 403) {
		await rm(sessionFile(), { force: true }).catch(() => void 0);
		return;
	}
	return session;
}
/** 读取请求体并做上限与 JSON 校验。 */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_BODY_BYTES) return void 0;
		chunks.push(buffer);
	}
	if (size === 0) return {};
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : void 0;
	} catch {
		return;
	}
}
/** 只回 JSON,且**不带任何 CORS 头** —— 其他源的浏览器脚本因此读不到响应。 */
function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"content-length": Buffer.byteLength(body)
	});
	res.end(body);
}
/** 取一个必填的非空字符串字段。 */
function requiredString(body, key) {
	const value = body[key];
	return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
/** 取一个可选的非空字符串字段。 */
function optionalString(body, key) {
	const value = body[key];
	return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
/** 登录/注册成功后的共同收尾。 */
async function completeAuth(res, response) {
	const stored = toStored(response, await deviceId());
	await writeSession(stored);
	sendJson(res, 200, toView(stored));
}
/**
* 挂载宿主路由。
* @param ctx - 宿主上下文;`webServer` 由 inject 保证存在。
*/
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: ROUTE_PREFIX,
		handler: async (req, res) => {
			const path = (req.url ?? "").split("?")[0]?.slice(17) ?? "";
			const method = req.method ?? "GET";
			if (method === "GET" && path === "/session") {
				const session = await currentSession();
				sendJson(res, 200, session === void 0 ? { authenticated: false } : toView(session));
				return;
			}
			if (method === "POST" && path === "/session/login") {
				const body = await readJsonBody(req);
				const email = body === void 0 ? void 0 : requiredString(body, "email");
				const password = body === void 0 ? void 0 : requiredString(body, "password");
				if (email === void 0 || password === void 0) {
					sendJson(res, 400, { message: "Email and password are required" });
					return;
				}
				const result = await erp("/auth/login", {
					method: "POST",
					body: {
						email,
						password,
						client_type: CLIENT_TYPE,
						device_id: await deviceId()
					}
				});
				if (!result.ok) {
					sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message });
					return;
				}
				await completeAuth(res, result.value);
				return;
			}
			if (method === "POST" && path === "/session/register") {
				const body = await readJsonBody(req);
				const email = body === void 0 ? void 0 : requiredString(body, "email");
				const password = body === void 0 ? void 0 : requiredString(body, "password");
				const displayName = body === void 0 ? void 0 : requiredString(body, "displayName");
				if (body === void 0 || email === void 0 || password === void 0 || displayName === void 0) {
					sendJson(res, 400, { message: "Email, password and display name are required" });
					return;
				}
				const verificationCode = optionalString(body, "verificationCode");
				const inviteCode = optionalString(body, "inviteCode");
				const result = await erp("/auth/register", {
					method: "POST",
					body: {
						email,
						password,
						display_name: displayName,
						client_type: CLIENT_TYPE,
						device_id: await deviceId(),
						accepted_terms: body.acceptedTerms === true,
						accepted_cross_border_transfer: body.acceptedCrossBorderTransfer === true,
						...verificationCode === void 0 ? {} : { verification_code: verificationCode },
						...inviteCode === void 0 ? {} : { invite_code: inviteCode }
					}
				});
				if (!result.ok) {
					sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message });
					return;
				}
				await completeAuth(res, result.value);
				return;
			}
			if (method === "POST" && path === "/session/email-code") {
				const body = await readJsonBody(req);
				const email = body === void 0 ? void 0 : requiredString(body, "email");
				const purpose = body === void 0 ? void 0 : requiredString(body, "purpose");
				if (email === void 0 || purpose !== "register" && purpose !== "reset_password") {
					sendJson(res, 400, { message: "Email and a valid purpose are required" });
					return;
				}
				const result = await erp("/auth/email-code", {
					method: "POST",
					body: {
						email,
						purpose
					}
				});
				if (!result.ok) {
					sendJson(res, result.status === 0 ? 502 : result.status, { message: result.message });
					return;
				}
				sendJson(res, 200, {
					sent: result.value.sent === true,
					expiresInSeconds: result.value.expires_in_seconds ?? 0,
					resendCooldownSeconds: result.value.resend_cooldown_seconds ?? 0
				});
				return;
			}
			if (method === "POST" && path === "/session/logout") {
				const session = await readSession();
				if (session !== void 0) await erp("/auth/logout", {
					method: "POST",
					token: session.accessToken
				});
				await rm(sessionFile(), { force: true }).catch(() => void 0);
				sendJson(res, 200, { authenticated: false });
				return;
			}
			sendJson(res, 404, { message: "Not found" });
		}
	}), "landou-assistant: authentication routes");
}
//#endregion
export { ROUTE_PREFIX, apply, inject, name };

//# sourceMappingURL=index.js.map