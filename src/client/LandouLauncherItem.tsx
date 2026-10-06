/**
 * 蓝豆助手 —— 账号菜单顶部的入口行。
 *
 * 点它 = 打开设置面板并**直接落在**「蓝豆助手」分区,而不是先开设置再自己找。
 *
 * 位置:`settings.launcher.menu.item`。这个 slot 由账号菜单的占位者
 * (ui-settings-account)声明并渲染 —— 菜单里的行原本是硬编码的,没有扩展点。
 * **未经修改的 DSH 不声明它**,`ctx.slots.inject` 会一直等,既不报错也不插入,
 * 所以本插件在旧 DSH 上照样干净加载,只是少这一行。
 *
 * 行本身必须走 `MenuItemButton`:它画出的标记与数据行完全一致,因此能自动进入
 * 菜单的键盘遍历与选中后的焦点归还 —— 自己写 `<button>` 会掉出这两条。
 */
import { MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouMark } from './LandouMark.tsx'
import type { LandouLocaleKey } from './locales.ts'

/**
 * 菜单行从 launcher 拿到的两个能力。
 *
 * 这里就地声明形状而不是从 DSH 的契约包 import:本插件独立于 DSH 仓库构建
 * (装在 profile 的 node_modules 下,解析不到 `@deepseek-ai/dsh-client-ui-settings`)。
 * 形状必须与 `SettingsLauncherMenuItemOwnerProps` 保持一致。
 */
export interface LandouLauncherItemProps extends PropsLocale<'landou-assistant'> {
  /** 关掉菜单 —— 菜单的开合由 launcher 自己拥有。 */
  closeMenu: () => void
  /** 打开设置面板并选中某个已注册的分区。 */
  openSection: (id: string) => void
}

/** 本插件在设置里的分区键,与 `settings.section` 注册用的 id 必须一致。 */
const SECTION_ID = 'landou-assistant'

/**
 * 渲染菜单里的一行「蓝豆助手」。
 * @param props - launcher 给的菜单控制能力与本地化文案。
 * @returns 一行菜单项。
 */
export function LandouLauncherItem({ closeMenu, openSection, t }: LandouLauncherItemProps) {
  return (
    <MenuItemButton
      icon={<LandouMark size={16} />}
      onSelect={() => {
        // 先关菜单再开面板:菜单是 portal 出去的浮层,留着它会盖在新面板上。
        closeMenu()
        openSection(SECTION_ID)
      }}
    >
      {t('nav')}
    </MenuItemButton>
  )
}
