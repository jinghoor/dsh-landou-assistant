/**
 * 「画布会话」—— 新建会话处的第二个入口。
 *
 * 放在 `sidebar.newsession.action` 里,它渲染在**新会话按钮旁边**,而不是下面那排
 * 面板导航里:面板导航是"切到哪个视图",这里是"怎么开一个新会话",读起来不该混。
 *
 * 本行做两件事,顺序不能反:
 *   1. `startSession()` —— 走侧栏自己那个按钮的同一条路,拿到一个新会话
 *   2. 把主面板切到画布键 —— 新会话才出现在画布里
 *
 * 合成一个 `startCanvasSession` 由注册处注入,而不是让组件自己拼:组件拿不到 ctx,
 * 这是 DSH 的硬规矩(业务组件看不到 ctx)。
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouCanvasIcon } from './LandouCanvasIcon.tsx'

/** 本行需要的能力。 */
export interface LandouNewSessionActionInjected {
  /** 开一个新会话并把主面板切到画布。 */
  startCanvasSession: () => void
}

/** 本行的全部 props。 */
export interface LandouNewSessionActionProps extends PropsLocale<'landou-assistant'>, LandouNewSessionActionInjected {
  /** 侧栏是否展开;收起时只渲染图标。 */
  wide: boolean
}

/**
 * 渲染「画布会话」这一行。
 * @param props - 侧栏宽度、开画布会话的动作与本地化文案。
 * @returns 与新会话按钮同一行的入口按钮。
 */
export function LandouNewSessionAction({ wide, startCanvasSession, t }: LandouNewSessionActionProps) {
  const label = t('canvas.panel')
  return (
    <button
      type="button"
      data-landou-newsession="canvas"
      aria-label={label}
      title={label}
      onClick={() => { startCanvasSession() }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        // 与侧栏自己的新会话按钮同一套视觉:同一层级的动作不该长得不一样。
        padding: wide ? '6px 10px' : '6px',
        justifyContent: wide ? 'flex-start' : 'center',
        border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
        borderRadius: 8,
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <LandouCanvasIcon size={14} />
      {wide && <span>{label}</span>}
    </button>
  )
}
