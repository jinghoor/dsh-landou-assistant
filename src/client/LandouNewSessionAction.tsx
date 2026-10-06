/**
 * 「画布会话」—— 新建会话处的第二个入口。
 *
 * 放在 `sidebar.newsession.action` 里。「新会话」按钮在有贡献项时会变成菜单,
 * 本行就是菜单里的一项 —— **不是侧栏上一行独立按钮**。
 *
 * 这一点是刻意的:画布会话就是一个普通会话,它会像其它会话一样排在所属工作区
 * 的下面,所以不该在侧栏上方再占一行。
 *
 * 本行做两件事,顺序不能反:
 *   1. `startSession()` —— 走侧栏自己那个按钮的同一条路,拿到一个新会话
 *   2. 把主面板切到画布键 —— 新会话才出现在画布里
 *
 * 合成一个 `startCanvasSession` 由注册处注入,而不是让组件自己拼:组件拿不到 ctx,
 * 这是 DSH 的硬规矩(业务组件看不到 ctx)。
 */
import { MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouCanvasIcon } from './LandouCanvasIcon.tsx'

/** 本行需要的能力。 */
export interface LandouNewSessionActionInjected {
  /**
   * 在该工作区里开一个新会话,并把它记成画布会话。
   * @param workspaceId - 目标工作区。
   * @param startSession - 该行自己的新建会话动作,用的是同一条路。
   */
  startCanvasSession: (workspaceId: string, startSession: () => void) => void
}

/** 本行的全部 props。 */
export interface LandouNewSessionActionProps extends PropsLocale<'landou-assistant'>, LandouNewSessionActionInjected {
  /** 这一行属于哪个工作区。 */
  workspaceId: string
  /** 该工作区自己的新建会话动作 —— 同一条路,不另开一条。 */
  startSession: () => void
  /**
   * 关掉新会话菜单。
   *
   * 本行渲染在「新会话」按钮弹出的**菜单里**(见 ui-sidebar 的 `sidebar.newsession.action`),
   * 不是侧栏上一行独立按钮 —— 画布会话就是一个普通会话,它会像其它会话一样排在所属
   * 工作区下面,不需要在上面多占一行。
   */
  closeMenu: () => void
}

/**
 * 渲染「画布会话」这一行。
 * @param props - 侧栏宽度、开画布会话的动作与本地化文案。
 * @returns 与新会话按钮同一行的入口按钮。
 */
export function LandouNewSessionAction({ workspaceId, startSession, startCanvasSession, closeMenu, t }: LandouNewSessionActionProps) {
  return (
    <MenuItemButton
      icon={<LandouCanvasIcon size={16} />}
      onSelect={() => {
        // 先关菜单:它是 portal 出去的浮层,留着会盖在新会话上。
        closeMenu()
        startCanvasSession(workspaceId, startSession)
      }}
    >
      {t('canvas.panel')}
    </MenuItemButton>
  )
}
