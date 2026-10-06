/**
 * 画布会话工具条里的徽章。
 *
 * 它注册进 `landou.canvas.toolbar` —— 那是画布面板**自己声明**的 session 作用域座位,
 * 走的是和任何第三方贡献者完全相同的路。这样做而不是在面板里直接写死文案,有两个理由:
 *
 * 1. 声明一个座位却只由自己塞一个写死的元素,那个声明就是装饰;
 * 2. 工具条将来要放的东西(缩放、重置、导出)本来就属于座位,不属于面板骨架。
 *
 * 顺带说明:**这个座位的声明同时是拿到 `SessionProvider` 的前提** ——
 * 框架只在注册声明了 session / session-maybe 作用域子 slot 时才提供那个座位。
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouMark } from './LandouMark.tsx'

/** 徽章只需要文案。 */
export type LandouCanvasBadgeProps = PropsLocale<'landou-assistant'>

/**
 * 渲染画布会话的标识徽章。
 * @param props - 本地化文案。
 * @returns 带豆形标记的一行标签。
 */
export function LandouCanvasBadge({ t }: LandouCanvasBadgeProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <LandouMark size={13} />
      <span>{t('canvas.badge')}</span>
    </span>
  )
}
