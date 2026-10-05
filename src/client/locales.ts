/** 蓝豆助手的本地化文案。 */

/** 本插件渲染的文案键。 */
export type LandouLocaleKey = 'nav' | 'title' | 'intro' | 'placeholder'

/** 英文文案。 */
export const en: Record<LandouLocaleKey, string> = {
  nav: 'Landou Assistant',
  title: 'Landou Assistant',
  intro: 'Settings for the Landou Assistant plugin.',
  placeholder: 'This page is a placeholder. Settings will be added here.',
}

/** 简体中文文案。 */
export const zh: Record<LandouLocaleKey, string> = {
  nav: '蓝豆助手',
  title: '蓝豆助手',
  intro: '蓝豆助手插件的设置。',
  placeholder: '本页为占位内容，设置项将在这里补充。',
}
