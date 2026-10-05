window.__ModuleLoader__.load({
	id: "dsh-landou-assistant",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/LandouBrandName.tsx
		/**
		* 侧栏品牌名位上的「蓝豆助手 by DeepSeek Harness」。
		*
		* 版式由宿主容器决定 —— `.brandName` 已经是
		* `inline-flex / gap 6px / height 24px / 18px / 600 / letter-spacing .04em`,
		* 所以两个 span 之间的间距由容器的 gap 给出,这里只区分主次层级,
		* 不重复声明字号与字重以外的东西。
		*
		* 宽度退化是这个组件的关键约束。实测:侧栏 280px 时,宿主链上的
		* `.brand`(252px,`overflow:hidden`)+ 官方鲸鱼图标(24px)+ gap 占掉
		* 32px,留给品牌名的是 219px —— 正好塞满,**余量为 1px**。
		* 侧栏或窗口一旦变窄,父级的 `overflow:hidden` 会直接**硬切**字符,
		* 而不是给省略号。所以这里显式声明退化顺序:
		*   1. 主名 `flexShrink: 0` —— 「蓝豆助手」永不压缩
		*   2. 副名 `flexShrink: 1` + `minWidth: 0` + 省略号 —— 先被截短
		* 这样窄栏下呈现为「蓝豆助手 by DeepS…」,而不是切掉半个字。
		*
		* 用内联样式而不是 CSS Module:本插件独立于 DSH 仓库构建,不引入
		* lightningcss 之类的构建期 CSS 管线,产物就只剩 lib/client.js 一个文件。
		* @returns 品牌名内容,作为宿主容器的两个 flex 子项。
		*/
		function LandouBrandName() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					flexShrink: 0,
					whiteSpace: "nowrap"
				},
				children: "蓝豆助手"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					flexShrink: 1,
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					fontSize: "13px",
					fontWeight: 400,
					letterSpacing: "0.02em",
					opacity: .55,
					whiteSpace: "nowrap"
				},
				children: "by DeepSeek Harness"
			})] });
		}
		//#endregion
		//#region src/client/LandouMark.tsx
		/**
		* 蓝豆助手的豆形标记。
		*
		* 用内联 SVG 而不是图标库:本插件要在**未经修改的** DSH 上工作,
		* 不能用只存在于某个本地补丁里的扩展点,也不想依赖官方图标集里
		* 语义不贴切的现成字形。
		*
		* 形状用单条 path + `fill-rule="evenodd"`:豆身是椭圆,豆缝是同一条 path 里
		* 的第二个子路径,靠 evenodd 被**镂空**成一道缝。这样在任何背景色上都成立 ——
		* 换成"画一条线"的版本会在深色/浅色下需要不同的缝色,而且细线加细环
		* 在小尺寸下会读成禁止符号。
		*
		* 填充用 `currentColor`,深浅色主题自动跟随。
		* @param props - 渲染尺寸,默认 28。
		* @returns 豆形标记。
		*/
		function LandouMark({ size = 28 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 32 32",
				"aria-hidden": "true",
				style: {
					flex: "none",
					display: "block"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
					transform: "rotate(-38 16 16)",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "currentColor",
						fillRule: "evenodd",
						d: "M27 16a11 7.8 0 1 0-22 0 11 7.8 0 1 0 22 0Z M20.4 16a4.4 1 0 1 0-8.8 0 4.4 1 0 1 0 8.8 0Z"
					})
				})
			});
		}
		//#endregion
		//#region src/client/LandouSettingsSection.tsx
		/**
		* 渲染蓝豆助手的设置页。
		* @param props - 由设置外壳合成的 slot props。
		* @returns 占位内容列。
		*/
		function LandouSettingsSection({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					maxWidth: "720px",
					color: "var(--dsw-alias-label-primary)"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "10px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LandouMark, { size: 26 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								margin: 0,
								fontSize: "18px",
								fontWeight: 600
							},
							children: t("title")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: "13px",
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: t("intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: "13px",
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: t("placeholder")
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** 英文文案。 */
		const en = {
			nav: "Landou Assistant",
			title: "Landou Assistant",
			intro: "Settings for the Landou Assistant plugin.",
			placeholder: "This page is a placeholder. Settings will be added here."
		};
		/** 简体中文文案。 */
		const zh = {
			nav: "蓝豆助手",
			title: "蓝豆助手",
			intro: "蓝豆助手插件的设置。",
			placeholder: "本页为占位内容，设置项将在这里补充。"
		};
		//#endregion
		//#region src/client/index.ts
		/** 本插件拥有的文案命名空间。 */
		const NS = "landou-assistant";
		/** 必需服务:UI slot 注册表 + 本地化字典。 */
		const inject = ["slots", "locale"];
		/**
		* 注册本插件的全部浏览器贡献。
		* @param ctx - 浏览器根上下文。
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "landou-assistant: dictionaries");
			ctx.slots.inject("sidebar.brand.name", function* () {
				yield ctx.slots.register({
					name: "sidebar.brand.name",
					priority: -1
				}, LandouBrandName);
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "landou-assistant",
				order: 30,
				label: () => t("nav"),
				locale: NS
			}, LandouSettingsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map