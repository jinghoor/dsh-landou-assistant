/**
 * 蓝豆助手的独立构建配置。
 *
 * 刻意不 import 任何东西:本插件不在 DSH 仓库的 pnpm workspace 里,
 * 配置里的模块说明符会相对本文件解析,一旦 import 'tsdown' 就会因
 * 找不到 node_modules 而失败。纯对象导出绕开了这一点。
 *
 * 产物契约来自 packages/client/tsdown.client.ts 的 clientConfig():
 * 客户端半边是 CJS,外面包一层 `window.__ModuleLoader__.load({id, factory})`,
 * 由浏览器内核在首次 materialize 时执行 factory。外部依赖只有平台模块表 ——
 * 其余全部内联。包装格式与 packages/client/ui-brand-official/lib/client.js
 * 的实际产物对齐(那是地面真值)。
 */

/** 与 packages/client/web/src/platform.ts 的 PLATFORM_MODULES 逐字一致。 */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const PACKAGE_NAME = 'dsh-landou-assistant'

export default [
  // 宿主半边:普通 ESM,Loader 直接 import。空 apply,只给 Loader 一个锚点。
  {
    name: `${PACKAGE_NAME}/host`,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: true,
  },
  // 浏览器半边:必须是 loader 约定的闭包工厂包装,文件名必须是 client.js。
  {
    name: `${PACKAGE_NAME}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2024',
    dts: false,
    clean: false,
    sourcemap: true,
    // 平台模块表里的说明符保持 import,由 loader 的模块表回答;
    // 其余一律内联 —— 表外的 require 在浏览器里必然抛错。
    deps: { neverBundle: (specifier: string) => PLATFORM_MODULES.includes(specifier) },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({\n\tid: ${JSON.stringify(PACKAGE_NAME)},\n\tfactory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
]
