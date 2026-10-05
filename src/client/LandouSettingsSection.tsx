/**
 * 设置面板里的「蓝豆助手」页 —— 当前是占位。
 *
 * 版式照抄官方 section(见 ui-agent-preset 的 AgentPresetSection.module.css):
 * 一个 `flex column / gap 12px / max-width 720px` 的内容列,`h2` 是 18px/600
 * 标题,说明文字 13px 走 tertiary 色。颜色用主题变量而不是硬编码,
 * 这样跟随深浅色而不需要引入 CSS 构建管线。
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LandouLocaleKey } from './locales.ts'

/** 渲染器为本 section 绑定的 props。 */
export type LandouSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'landou-assistant', LandouLocaleKey>

/**
 * 渲染蓝豆助手的设置页。
 * @param props - 由设置外壳合成的 slot props。
 * @returns 占位内容列。
 */
export function LandouSettingsSection({ t }: LandouSettingsSectionProps) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '720px',
        color: 'var(--dsw-alias-label-primary)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('title')}</h2>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' }}>{t('intro')}</p>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' }}>{t('placeholder')}</p>
    </section>
  )
}
