/**
 * 画布会话的标志 —— 挂在输入框那一列(模型/agent 选择器旁边),用来把画布会话
 * 和普通会话区分开。
 *
 * 为什么标在这里:会话列表里两种会话长得一样,标题也一样,而**用户需要一眼知道
 * 自己在哪种会话里** —— 尤其"新会话开成了画布"那类问题,有标志就不会再被误认成
 * 普通会话。输入框那一列是每次都在视线里的地方,不用去找。
 *
 * 不是画布会话时**渲染 null**,不是渲染一个灰色的:标志的语义是"这是画布会话",
 * 给普通会话一个"非画布"的标记只会让两种会话都多一个噪音。
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouCanvasIcon } from './LandouCanvasIcon.tsx'

/** 本组件需要的 props。 */
export interface CanvasSessionBadgeProps extends PropsLocale<'landou-assistant'> {
  /** 本会话是不是画布会话。 */
  isCanvasSession: boolean
}

const BADGE_STYLE: Record<string, string | number> = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  flex: 'none',
  padding: '1px 7px',
  borderRadius: 999,
  fontSize: 11,
  lineHeight: 1.6,
  whiteSpace: 'nowrap',
  color: 'inherit',
  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  background: 'color-mix(in srgb, currentColor 6%, transparent)',
  opacity: 0.75,
}

/**
 * 渲染画布会话标志。
 * @param props - 是否为画布会话,以及本地化文案。
 * @returns 标志;普通会话返回 null。
 */
export function CanvasSessionBadge({ isCanvasSession, t }: CanvasSessionBadgeProps) {
  if (!isCanvasSession) return null
  return (
    <span data-landou-canvas-badge="" title={t('canvas.badge')} style={BADGE_STYLE}>
      <LandouCanvasIcon size={12} />
      {t('canvas.badge')}
    </span>
  )
}
