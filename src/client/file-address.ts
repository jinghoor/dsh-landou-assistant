/**
 * `dsh-resource://file/…` 地址的构造。
 *
 * ## 为什么要把这段抄一遍
 *
 * 官方的实现在 `@deepseek-ai/dsh-util-workspace-path` 里(`file-address.ts`),
 * 而本插件装在 profile 的 node_modules 下,**解析不到仓库内的包**,所以 import 不了。
 * 抄语法不抄实现 —— 这里只用到 `session` 作用域那一种,36 行,语法写在下面,
 * 官方改格式时这个文件是唯一要跟着改的地方。
 *
 * ## 为什么用 session 作用域而不是 absolute
 *
 * 操作者的要求是"每个画布会话都必须依托一个工作区,不同工作区的会话是隔离的"。
 * `session` 作用域正是这条约束的执行点:**宿主按该会话自己持有的 workspace root
 * 解析路径**,地址里带的就是 sessionId。用 `absolute` 会绕开工作区解析 ——
 * 那既丢了隔离,也让同一路径在不同工作区下指向同一个文件。
 *
 * ## 语法(取自 file-address.ts 的模块说明)
 *
 * ```
 * dsh-resource://file/session/<sessionId>/<path>
 * ```
 *
 * 每一段都做 component-encode,但 `:` 保持字面(盘符要按原样读)。
 */

/** 所有文件地址共同的前缀。 */
const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'

/**
 * 编码一段 id 或路径段。
 * @param segment - 原始段。
 * @returns 编码后的段;`:` 保持字面。
 */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%3A/giu, ':')
}

/**
 * 按段编码一条 `/` 分隔的路径。
 * @param path - 已规范化为 `/` 分隔的路径。
 * @returns 编码后的路径。
 */
function encodePath(path: string): string {
  return path.split('/').map(encodeSegment).join('/')
}

/**
 * 构造某个会话读取某个文件的地址。
 *
 * 路径可以是绝对的,也可以是相对该会话工作区根的 —— **两种都由宿主按会话的
 * workspace root 解析**,所以调用方不需要自己判断。
 * @param sessionId - 解析该路径的会话。
 * @param path - 绝对或工作区相对路径;反斜杠会被规范化为 `/`,开头的 `./` 会被去掉。
 * @returns `dsh-resource://file/session/<sessionId>/<path>` 地址。
 */
export function sessionFileAddress(sessionId: string, path: string): string {
  const normalized = path.replace(/\\/gu, '/').replace(/^(?:\.\/)+/u, '')
  return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`
}
