/**
 * 产物的分类与展示信息。
 *
 * ## 为什么分类只能靠扩展名
 *
 * DSH 的产物数据里**没有类型字段** —— 实测两处来源都只有路径:
 *
 * ```ts
 * // packages/client/ui-deliverables/src/client/turn-deliverables.ts
 * interface DeliverablesTurnData {
 *   readonly produced: readonly { seq: number; path: string }[]
 *   readonly presented?: readonly PresentedPath[]        // 来自 present 工具
 * }
 * // packages/deliverables/tool-present/src/types.ts
 * export interface PresentedFile { path: string; description?: string }
 * ```
 *
 * 所以"图片 / 视频 / 文字"三分只能从路径判定。**先看 MIME 特征再退到扩展名**:
 * 有些产物路径带查询串或哈希后缀,直接取最后一段扩展名会判错。
 *
 * ## 为什么文字是兜底而不是白名单
 *
 * 需求是"目前只能出现三种产物"。把文字做成 `image`/`video` 之外的**兜底**,
 * 任何将来出现的新类型(音频、PDF、压缩包)都会落进文字节点而不是消失 ——
 * 用户至少能看到"这里有个东西"。反过来若把文字做成白名单,未知类型会静默不显示,
 * 那正是本插件一路在防的那类"东西不见了但没有任何提示"。
 */

/** 画布上的三类产物节点。 */
export type ArtifactKind = 'image' | 'video' | 'text'

/** 一个待渲染的产物。 */
export interface Artifact {
  /** 磁盘路径,兼作节点身份(同一路径重复产出时按最后一次去重)。 */
  readonly path: string
  /** 三类之一。 */
  readonly kind: ArtifactKind
  /** 展示用文件名(取路径最后一段,已去掉查询串与哈希前缀)。 */
  readonly name: string
  /** 小写扩展名,不含点;无扩展名时为空串。 */
  readonly extension: string
  /** 判定依据,写进节点 title 便于排查分类错误。 */
  readonly classifiedBy: 'mime' | 'extension' | 'fallback'
  /** 会话事件序号,决定画布上的先后。 */
  readonly seq: number
}

/** 图片扩展名。刻意收窄到浏览器 `<img>` 真能显示的格式。 */
const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico',
])

/** 视频扩展名。刻意收窄到 `<video>` 真能播放的容器。 */
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'ogv', 'mov', 'm4v',
])

/**
 * 路径里出现这些 MIME 片段时直接定性,优先于扩展名。
 *
 * 存在的理由:有些产物路径形如 `/out/img.1712345678.png?v=2` 或
 * `/cache/ab12cd34`(无扩展名但 MIME 写在路径里)。只看最后一段扩展名会判错。
 */
const MIME_HINTS: readonly (readonly [string, ArtifactKind])[] = [
  ['image/', 'image'],
  ['video/', 'video'],
  ['text/', 'text'],
]

/**
 * 从路径里取出真正参与判定的那一段。
 *
 * 去掉查询串与 URL 片段 —— 它们会污染扩展名(`.png?v=2` 的"扩展名"是 `png?v=2`)。
 * @param path - 原始路径或 URL 形式。
 * @returns 去掉查询串与片段后的路径。
 */
function stripQuery(path: string): string {
  const query = path.search(/[?#]/u)
  return query < 0 ? path : path.slice(0, query)
}

/**
 * 取路径最后一段作为展示名。
 * @param path - 已去掉查询串的路径。
 * @returns 文件名;路径以分隔符结尾时回退为整条路径。
 */
function baseName(path: string): string {
  const segments = path.split(/[\\/]/u)
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (segments[index] !== '') return segments[index]
  }
  return path
}

/**
 * 取小写扩展名。
 *
 * 只有点在最后一段**内部**才算扩展名:`/a.b/c` 的文件名是 `c`,没有扩展名。
 * 另外拒绝过长与含空白的"扩展名" —— 那是文件名的一部分,不是类型。
 * @param name - 文件名。
 * @returns 不含点的扩展名;判定不了时为空串。
 */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  const extension = name.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,8}$/u.test(extension) ? extension : ''
}

/**
 * 把一条产物路径分类。
 * @param path - 产物路径。
 * @param seq - 会话事件序号。
 * @returns 分类结果。
 */
export function classifyArtifact(path: string, seq: number): Artifact {
  const clean = stripQuery(path)
  const name = baseName(clean)
  const extension = extensionOf(name)
  const lower = clean.toLowerCase()

  for (const [hint, kind] of MIME_HINTS) {
    if (lower.includes(hint)) {
      return { path, kind, name, extension, classifiedBy: 'mime', seq }
    }
  }
  if (IMAGE_EXTENSIONS.has(extension)) return { path, kind: 'image', name, extension, classifiedBy: 'extension', seq }
  if (VIDEO_EXTENSIONS.has(extension)) return { path, kind: 'video', name, extension, classifiedBy: 'extension', seq }

  // 兜底:一切认不出的都落到文字节点,而不是消失。理由见文件头。
  return { path, kind: 'text', name, extension, classifiedBy: 'fallback', seq }
}

/**
 * 把散落的产物路径归并成画布要渲染的节点列表。
 *
 * 同一路径出现多次(多轮重复写出)时保留**最后一次**的 seq 并只留一个节点:
 * 画布是产物墙,不是流水账,同一张图被改写三次不该出现三个格子。
 * @param entries - 路径与序号,顺序不限。
 * @returns 按 seq 升序、路径去重后的节点列表。
 */
export function collectArtifacts(
  entries: readonly { readonly path: string; readonly seq: number }[],
): readonly Artifact[] {
  const byPath = new Map<string, Artifact>()
  for (const entry of entries) {
    const existing = byPath.get(entry.path)
    if (existing !== undefined && existing.seq >= entry.seq) continue
    byPath.set(entry.path, classifyArtifact(entry.path, entry.seq))
  }
  return [...byPath.values()].sort((left, right) => left.seq - right.seq)
}
