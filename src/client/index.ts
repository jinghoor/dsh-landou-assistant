/**
 * 蓝豆助手 —— 浏览器半边。
 *
 * 两处贡献:
 *  1. `sidebar.brand.name` —— 把默认的 "DeepSeek Harness" 换成
 *     "蓝豆助手 by DeepSeek Harness"
 *  2. `settings.section`   —— 设置面板左栏新增「蓝豆助手」页(当前占位)
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only:拉入 locale 服务的 Context merge (ctx.locale)。
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only:设置外壳的 SlotMap merge ('settings.section')。跨插件协作只走 slot,
// 绝不值导入 —— 客户端 bundle 的纯度门禁会拒绝跨插件的值导入。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { LandouBrandName } from './LandouBrandName.tsx'
import { LandouSettingsSection } from './LandouSettingsSection.tsx'
import { en, zh } from './locales.ts'

/** 本插件拥有的文案命名空间。 */
const NS = 'landou-assistant'

/** 必需服务:UI slot 注册表 + 本地化字典。 */
export const inject = ['slots', 'locale']

/**
 * 注册本插件的全部浏览器贡献。
 * @param ctx - 浏览器根上下文。
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'landou-assistant: dictionaries')

  // ── 侧栏品牌名 ────────────────────────────────────────────────────────
  // 遮蔽机制:官方品牌插件 (ui-brand-official) 以默认优先级 0 占用同一 slot。
  // slot 的占用冲突**只在相同优先级上才抛错**,不同优先级是遮蔽关系,且
  // **数值最低者渲染** (`packages/client/ui-slots/src/index.ts`) ——
  // 所以 -1 稳定压过官方品牌名,而官方插件本身不报错、无需禁用。
  //
  // 只动 brand.name,不碰 brand.mark —— 鲸鱼图标保持官方原样。
  ctx.slots.inject('sidebar.brand.name', function* () {
    yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, LandouBrandName)
  })

  // ── 设置页导航项 ──────────────────────────────────────────────────────
  // `settings.section` 是列表 slot,导航身份由注册选项给出:
  //   id    —— 分区键,也是 shell 选图标时的匹配键
  //   order —— 导航位置;官方分区是 account -10 / general 0 / models 10 /
  //            plugins 15 / agent-presets 20,这里排最后
  //   label —— 注册方自行本地化的显示文本
  // shell 没有自己的文案,全部来自注册方。
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'landou-assistant',
    order: 30,
    label: () => t('nav'),
    locale: NS,
  }, LandouSettingsSection))
}
