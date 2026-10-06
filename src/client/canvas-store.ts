/**
 * 画布产物的响应式来源。
 *
 * ## 为什么不能"渲染时读一次"
 *
 * 产物列表能同步读到(会话事件已经是过去时),但**预览 URL 不能**:
 * `resources.source(address)` 是异步加载的,第一次读必然拿不到 url。
 * 如果组件只在渲染时读一次,图片节点就会永远停在"预览不可用" ——
 * 数据其实后来到了,但没有任何东西让组件重渲染。
 *
 * ## 为什么做成 store 而不是让组件自己订阅
 *
 * `packages/client/AGENTS.md` 写着业务组件不得自带订阅机制,注册方私有的响应式事实
 * 走注册时的 `hooks` 隔间(裸可观察量,由渲染器绑成 `use<Name>`)。
 * 所以这里是一个裸来源,由插件侧刷新,组件侧通过 `useArtifacts` 消费。
 *
 * ## 刷新为什么是轮询
 *
 * 产物来自会话事件的折叠结果,那个折叠没有暴露可订阅的口子(实测:
 * `assembler.locationIndex.turnDataStores` 是内部结构)。轮询是这里唯一
 * 不依赖猜测的做法,间隔取 800ms —— 产物是低频事件,快没必要。
 */
import type { Artifact } from './artifacts.ts'

/** 画布上一条已就绪的节点。 */
export interface CanvasNode {
  /** 产物本身(路径、类型、展示名)。 */
  readonly artifact: Artifact
  /** 浏览器能加载的 URL;拿不到时为 null,节点显示占位。 */
  readonly url: string | null
}

/** 裸可观察量:渲染器绑成 `use<Name>` 所需的最小接口。 */
export interface CanvasSource {
  /** @returns 当前快照;内容不变时必须返回同一个引用。 */
  getSnapshot: () => readonly CanvasNode[]
  /** @param listener - 快照变化时调用。 @returns 取消订阅。 */
  subscribe: (listener: () => void) => () => void
}

/** 建一个画布产物的来源。 */
export function createCanvasSource(): {
  /** 渲染器消费的那一面。 */
  readonly source: CanvasSource
  /** 用新的一批节点替换当前快照;内容相同则不发通知。 */
  readonly publish: (nodes: readonly CanvasNode[]) => void
} {
  // 空数组是稳定引用,且刻意让"空"与"有内容"走同一套比较 ——
  // 特殊对待空列表会让"清空画布"少一次通知。
  const empty: readonly CanvasNode[] = []
  let snapshot: readonly CanvasNode[] = empty
  const listeners = new Set<() => void>()

  /** 两条节点是否指向同一个东西且预览态一致。 */
  const same = (left: CanvasNode, right: CanvasNode): boolean =>
    left.artifact.path === right.artifact.path
    && left.artifact.kind === right.artifact.kind
    && left.artifact.name === right.artifact.name
    && left.url === right.url

  return {
    source: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
    publish: (nodes) => {
      if (nodes.length === snapshot.length && nodes.every((node, index) => same(node, snapshot[index] as CanvasNode))) return
      snapshot = nodes.length === 0 ? empty : nodes
      for (const listener of listeners) listener()
    },
  }
}
