/**
 * 从运行中的会话里取出产物节点。
 *
 * ## 这条路是怎么找到的
 *
 * DSH 的产物数据**没有任何公开服务**。实测记录:
 *
 * - `ctx.uiConversation` 可达(它在 ui-conversation 的 apply 里构造,但确实挂在 ctx 上,
 *   声明进 `inject` 就能用 —— 这一条我一开始判错了,写成"不是公开服务")
 * - 它上面有 `bindings`,按会话键着 `{source, binding, disposeScope}`
 * - `binding.assembler.locationIndex` 里有 `turnDataStores` /
 *   `seqsByTurn` / `stepsByTurn` / `coordinates`
 * - 每个 turn 的 data store 里,`deliverables` 键下就是
 *   `{ produced: [{seq, path}], presented?: PresentedPath[] }`
 *
 * 也就是 ui-deliverables 自己用的那个键:`owner.turn.data.get('deliverables')`。
 * 这里只是从外面走同一条路进去。
 *
 * ## 为什么全程防御式读取
 *
 * 上面全是**内部结构**:插件名是公开的,`binding.assembler.locationIndex` 不是。
 * 官方换一次字段名,这里就会失效。所以每一步都 try + 逐层校验,
 * **取不到时返回空数组而不是抛错** —— 画布显示"暂无产物"是降级,画布崩掉是故障。
 * 真要改结构时,这个文件是唯一要跟着改的地方。
 */
import type { Artifact } from './artifacts.ts'
import { collectArtifacts } from './artifacts.ts'

/** 一条 `{path, seq}` 记录,与 DSH 的 produced/presented 两种形态都对得上。 */
function readEntry(value: unknown): { path: string; seq: number } | null {
  if (value === null || typeof value !== 'object') return null
  const record = value as { path?: unknown; seq?: unknown }
  if (typeof record.path !== 'string') return null
  return { path: record.path, seq: typeof record.seq === 'number' ? record.seq : 0 }
}

/**
 * 把一个 turn 的 data store 读成产物条目。
 * @param store - 该 turn 的数据存储,应为 Map 形态。
 * @returns 条目列表;结构不符时为空。
 */
function entriesFromTurnData(store: unknown): { path: string; seq: number }[] {
  if (store === null || typeof store !== 'object') return []
  const get = (store as { get?: unknown }).get
  if (typeof get !== 'function') return []
  let deliverables: unknown
  try {
    deliverables = (get as (key: string) => unknown).call(store, 'deliverables')
  } catch (_error) {
    return []
  }
  if (deliverables === null || typeof deliverables !== 'object') return []
  const data = deliverables as { produced?: unknown; presented?: unknown }
  const entries: { path: string; seq: number }[] = []
  for (const group of [data.produced, data.presented]) {
    if (!Array.isArray(group)) continue
    for (const item of group) {
      const entry = readEntry(item)
      if (entry !== null) entries.push(entry)
    }
  }
  return entries
}

/**
 * 从 `locationIndex.turnDataStores` 取全部 turn 的产物条目。
 *
 * `turnDataStores` 在实测里是个 Map(turn → store)。这里不假定它的类型:
 * 是 Map 就走 `values()`,是对象就取自己的值 —— 两种都见得到同样的东西。
 * @param turnDataStores - 组装器的 turn 数据存储集合。
 * @returns 条目列表。
 */
function entriesFromIndex(turnDataStores: unknown): { path: string; seq: number }[] {
  if (turnDataStores === null || turnDataStores === undefined) return []
  const entries: { path: string; seq: number }[] = []
  let stores: unknown[]
  if (typeof (turnDataStores as { values?: unknown }).values === 'function') {
    try {
      stores = Array.from((turnDataStores as { values: () => Iterable<unknown> }).values())
    } catch (_error) {
      stores = []
    }
  } else if (Array.isArray(turnDataStores)) {
    stores = turnDataStores
  } else {
    stores = Object.values(turnDataStores as Record<string, unknown>)
  }
  for (const store of stores) entries.push(...entriesFromTurnData(store))
  return entries
}

/** 会话绑定在内部长什么样,只声明我们用到的两跳。 */
interface BindingLike {
  readonly binding?: { readonly assembler?: { readonly locationIndex?: { readonly turnDataStores?: unknown } } }
}

/**
 * 取当前会话的绑定。
 *
 * ## 为什么不按 sessionId 匹配
 *
 * 我原本想用 `bindings.keys` 把 sessionId 对上 —— **做不到**。实测:
 *
 * ```
 * bindings.keys      → WeakMap   ← 键是对象,枚举不了也查不了(WeakMap 不接受字符串键)
 * bindings.valueSet  → Set       ← 可以枚举
 * bindings.values    → Set
 * ```
 *
 * `keys` 是 WeakMap 这一点决定了按 id 匹配这条路根本不存在,不是实现麻烦。
 *
 * ## 那怎么确定是哪条
 *
 * DSH **只为正在查看的会话保留绑定**(其余在切换时释放),所以 `valueSet` 通常恰好一条,
 * 那条就是当前会话的。这是本文件最依赖假设的一处,所以:
 *
 * - 只有一条时直接用它;
 * - **多于一条时不猜** —— 猜错会把别的会话的产物显示成当前会话的,那比不显示更糟。
 *   返回 null 让画布显示空态,并把这个限制写在这里而不是悄悄发生。
 *
 * @param bindings - `ctx.uiConversation.bindings`。
 * @returns 绑定对象;取不到或无法确定时返回 null。
 */
function pickBinding(bindings: unknown): BindingLike | null {
  if (bindings === null || typeof bindings !== 'object') return null
  const valueSet = (bindings as { valueSet?: unknown }).valueSet
  if (valueSet === null || valueSet === undefined) return null
  let values: unknown[]
  try {
    values = Array.from(valueSet as Iterable<unknown>)
  } catch (_error) {
    return null
  }
  // 多于一条时不猜:无法把条和目标会话对上,而显示错会话的产物比不显示更糟。
  return values.length === 1 ? (values[0] as BindingLike) : null
}

/**
 * 读出某个会话当前的产物节点。
 * @param uiConversation - `ctx.uiConversation`。
 * @param sessionId - 目标会话。
 * @returns 按 seq 升序、路径去重后的产物列表;取不到时为空数组。
 */
export function readSessionArtifacts(uiConversation: unknown, sessionId: string | undefined): readonly Artifact[] {
  try {
    // sessionId 目前只用于上层判断"有没有会话",不参与挑绑定 —— 挑不了,见 pickBinding 的说明。
    void sessionId
    const container = (uiConversation as { bindings?: unknown } | null)?.bindings
    const picked = pickBinding(container)
    const stores = picked?.binding?.assembler?.locationIndex?.turnDataStores
    return collectArtifacts(entriesFromIndex(stores))
  } catch (_error) {
    // 内部结构变了就是这里兜住:画布显示"暂无产物",而不是让整块面板崩掉。
    return []
  }
}
