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
		* 用内联样式而不是 CSS Module:本插件独立于 DSH 仓库构建,不引入
		* lightningcss 之类的构建期 CSS 管线,产物就只剩 lib/client.js 一个文件。
		* @returns 品牌名内容,作为宿主容器的两个 flex 子项。
		*/
		function LandouBrandName() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "蓝豆助手" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							margin: 0,
							fontSize: "18px",
							fontWeight: 600
						},
						children: t("title")
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