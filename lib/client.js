window.__ModuleLoader__.load({
	id: "dsh-landou-assistant",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
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
		//#region src/client/LandouCanvasBadge.tsx
		/**
		* 渲染画布会话的标识徽章。
		* @param props - 本地化文案。
		* @returns 带豆形标记的一行标签。
		*/
		function LandouCanvasBadge({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					whiteSpace: "nowrap"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LandouMark, { size: 13 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("canvas.badge") })]
			});
		}
		//#endregion
		//#region src/client/LandouCanvasIcon.tsx
		/**
		* 画布会话在侧栏面板行里的图标。
		*
		* 侧栏通过 `renderSlot('sidebar.panellist', { size, active }, { only: id })` 把
		* 图标插进面板行 —— 它给我尺寸和选中态,行本身的可访问名由侧栏拥有。
		*
		* 用内联 SVG 而不是图标库:本插件要在未经修改的 DSH 上工作,不依赖官方图标集里
		* 语义不贴切的现成字形。形状是一块带对角线的画板 —— 与官方的「新会话」图标
		* (对话气泡)在 14–18px 下也不会混。
		* @param props - 侧栏给的尺寸与选中态。
		* @returns 造型线框图标。
		*/
		function LandouCanvasIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.3,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				style: {
					flex: "none",
					display: "block"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.9",
					y: "2.6",
					width: "12.2",
					height: "10.8",
					rx: "1.6"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M1.9 12.6 12.2 3.4" })]
			});
		}
		//#endregion
		//#region src/client/LandouCanvasPanel.tsx
		/**
		* 画布布局的样式。
		*
		* 全部限定在 `[data-landou-canvas]` 子树内 —— **主面板那份会话一个像素都不会动**。
		*
		* 依据是实测出来的、不是猜的结构(`desktop_dom` 读的实时 DOM):
		*
		*     div[data-conversation-content]              flex column
		*     └── div[data-conversation-scroll]           flex column   ← 要改成 row
		*         ├── div[data-slot]                      display: contents
		*         └── div[data-composer-seat]             flex column, position: sticky
		*
		* 槽位包装是 `display: contents`,不是 flex 项 —— 它的子元素(消息流)才是。
		* 所以这里**只用 `order` 把输入框推到末位**,不去按索引选消息流那侧:
		* 那层包装有几个子元素由别人决定,按索引选迟早会错位。
		*/
		const CANVAS_CSS = `
/* 主轴由纵向改为横向:左边画布,右边输入框。 */
[data-landou-canvas] [data-conversation-scroll] {
  flex-direction: row;
  align-items: stretch;
}

/* 输入框从"贴底的整宽 sticky 条"变成"右侧固定宽的静态列"。 */
[data-landou-canvas] [data-conversation-scroll] > [data-composer-seat] {
  order: 2;
  position: static;
  flex: 0 0 var(--landou-canvas-composer-width, 420px);
  width: var(--landou-canvas-composer-width, 420px);
  max-width: 45%;
  border-left: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 无条件把输入框贴到右边缘。
   空白会话里画布那侧没有任何 flex 项(槽位包装是 display:contents 且没有子元素),
   此时输入框是唯一项 —— 只靠 order 它会落在左边。margin-left:auto 让两种情况
   都对:有内容时它排在画布之后,没内容时它被推到最右。 */
[data-landou-canvas] [data-conversation-scroll] > [data-composer-seat] {
  margin-left: auto;
}

/* 画布侧吃掉剩余宽度。
   注意选的是 [data-slot] 的**子元素**而不是它自己:槽位包装是 display:contents,
   不是 flex 项,给它加 flex 属性不会有任何效果 —— 实测踩过。 */
[data-landou-canvas] [data-conversation-scroll] > [data-slot] > * {
  order: 1;
  flex: 1 1 auto;
  min-width: 0;
}

/* 画布铺满可用高度。 */
[data-landou-canvas] [data-conversation-content],
[data-landou-canvas] [data-conversation-scroll] {
  height: 100%;
  min-height: 0;
}
`;
		/**
		* 渲染画布会话。
		* @param props - 框架座位与本地化文案。
		* @returns 托管的会话内容与画布布局容器。
		*/
		function LandouCanvasPanel(props) {
			const { SessionProvider, renderFactorySlot, renderSlot } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-landou-canvas": "",
				style: {
					height: "100%",
					minHeight: 0,
					display: "flex",
					flexDirection: "column"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CANVAS_CSS }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-landou-canvas-bar": "",
						style: {
							flex: "none",
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "6px 12px",
							fontSize: 12,
							opacity: .75,
							borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)"
						},
						children: renderSlot("landou.canvas.toolbar", {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: "1 1 auto",
							minHeight: 0
						},
						children: SessionProvider({ children: renderFactorySlot("conversation.content", {
							variant: "embedded",
							phase: "active",
							hero: false
						}) })
					})
				]
			});
		}
		//#endregion
		//#region src/client/LandouLauncherItem.tsx
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
		/** 本插件在设置里的分区键,与 `settings.section` 注册用的 id 必须一致。 */
		const SECTION_ID = "landou-assistant";
		/**
		* 渲染菜单里的一行「蓝豆助手」。
		* @param props - launcher 给的菜单控制能力与本地化文案。
		* @returns 一行菜单项。
		*/
		function LandouLauncherItem({ closeMenu, openSection, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LandouMark, { size: 16 }),
				onSelect: () => {
					closeMenu();
					openSection(SECTION_ID);
				},
				children: t("nav")
			});
		}
		//#endregion
		//#region src/client/LandouSettingsSection.tsx
		/**
		* 设置面板里的「蓝豆助手」页 —— 未登录时是注册/登录界面,登录后是账号页。
		*
		* 外观直接用官方 primitives(`Input` / `Button`):它们在平台模块表里,
		* 插件可以 import,而且宿主会把整个包的工厂交给插件 —— 视觉与设置面板其余部分
		* 天然一致,不需要自己复刻输入框的边框、内边距和焦点环。
		*
		* 这里**看不到访问令牌**:所有调用打到宿主半边,宿主只回非机密事实。
		*/
		const COLOR_PRIMARY = "var(--dsw-alias-label-primary)";
		const COLOR_TERTIARY = "var(--dsw-alias-label-tertiary)";
		const fieldStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "6px"
		};
		const labelStyle = {
			fontSize: "13px",
			fontWeight: 500,
			color: COLOR_PRIMARY
		};
		const errorStyle = {
			margin: 0,
			fontSize: "13px",
			color: "var(--dsw-alias-label-error, #d33)"
		};
		const noticeStyle = {
			margin: 0,
			fontSize: "13px",
			color: COLOR_TERTIARY
		};
		/** 一个带标签的文本输入。 */
		function Field(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: fieldStyle,
				htmlFor: props.id,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: labelStyle,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					id: props.id,
					type: props.type ?? "text",
					value: props.value,
					placeholder: props.placeholder,
					autoComplete: props.autoComplete,
					onChange: (event) => {
						props.onChange(event.target.value);
					}
				})]
			});
		}
		/** 一个同意勾选框。 */
		function Consent(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontSize: "13px",
					color: COLOR_PRIMARY
				},
				htmlFor: props.id,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: props.id,
					type: "checkbox",
					checked: props.checked,
					onChange: (event) => {
						props.onChange(event.target.checked);
					}
				}), props.label]
			});
		}
		/**
		* 渲染蓝豆助手的设置页。
		* @param props - 由设置外壳合成的 slot props。
		* @returns 登录/注册界面,或已登录的账号页。
		*/
		function LandouSettingsSection({ t, getSession, login, register, sendEmailCode, logout }) {
			const [session, setSession] = (0, react.useState)();
			const [loading, setLoading] = (0, react.useState)(true);
			const [mode, setMode] = (0, react.useState)("signIn");
			const [email, setEmail] = (0, react.useState)("");
			const [password, setPassword] = (0, react.useState)("");
			const [displayName, setDisplayName] = (0, react.useState)("");
			const [verificationCode, setVerificationCode] = (0, react.useState)("");
			const [inviteCode, setInviteCode] = (0, react.useState)("");
			const [acceptedTerms, setAcceptedTerms] = (0, react.useState)(false);
			const [acceptedCrossBorder, setAcceptedCrossBorder] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const [notice, setNotice] = (0, react.useState)();
			const [cooldown, setCooldown] = (0, react.useState)(0);
			const mounted = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			/** 拉一次会话。挂载时与每次登录状态变化后都走这里。 */
			const refresh = (0, react.useCallback)(async () => {
				const result = await getSession();
				if (!mounted.current) return;
				setSession(result.ok ? result.value : { authenticated: false });
				setLoading(false);
			}, [getSession]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (cooldown <= 0) return;
				const timer = setInterval(() => {
					setCooldown((value) => Math.max(0, value - 1));
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [cooldown]);
			/** 登录/注册成功后统一收尾。 */
			const accept = (0, react.useCallback)((next) => {
				setSession(next);
				setPassword("");
				setVerificationCode("");
			}, []);
			const submit = (0, react.useCallback)(async () => {
				setError(void 0);
				setNotice(void 0);
				if (email.trim() === "" || password === "" || mode === "signUp" && displayName.trim() === "") {
					setError(t("requiredFields"));
					return;
				}
				setBusy(true);
				const result = mode === "signIn" ? await login(email.trim(), password) : await register({
					email: email.trim(),
					password,
					displayName: displayName.trim(),
					verificationCode: verificationCode.trim() === "" ? void 0 : verificationCode.trim(),
					inviteCode: inviteCode.trim() === "" ? void 0 : inviteCode.trim(),
					acceptedTerms,
					acceptedCrossBorderTransfer: acceptedCrossBorder
				});
				if (!mounted.current) return;
				setBusy(false);
				if (result.ok) accept(result.value);
				else setError(result.message);
			}, [
				accept,
				acceptedCrossBorder,
				acceptedTerms,
				displayName,
				email,
				inviteCode,
				login,
				mode,
				password,
				register,
				t,
				verificationCode
			]);
			const requestCode = (0, react.useCallback)(async () => {
				setError(void 0);
				setNotice(void 0);
				if (email.trim() === "") {
					setError(t("requiredFields"));
					return;
				}
				setBusy(true);
				const result = await sendEmailCode(email.trim(), "register");
				if (!mounted.current) return;
				setBusy(false);
				if (!result.ok) {
					setError(result.message);
					return;
				}
				setNotice(t("codeSent"));
				setCooldown(result.value.resendCooldownSeconds > 0 ? result.value.resendCooldownSeconds : 60);
			}, [
				email,
				sendEmailCode,
				t
			]);
			const signOut = (0, react.useCallback)(async () => {
				setBusy(true);
				setError(void 0);
				const result = await logout();
				if (!mounted.current) return;
				setBusy(false);
				if (!result.ok) {
					setError(result.message);
					return;
				}
				accept({ authenticated: false });
				setEmail("");
				setDisplayName("");
			}, [accept, logout]);
			const header = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
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
			});
			const sectionStyle = {
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				maxWidth: "720px",
				color: COLOR_PRIMARY
			};
			if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				style: sectionStyle,
				children: header
			});
			if (session?.authenticated === true) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: sectionStyle,
				children: [
					header,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "6px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: 0,
								fontSize: "14px",
								fontWeight: 500
							},
							children: t("signedInAs").replace("{name}", session.displayName ?? session.userId ?? "")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: noticeStyle,
							children: t("signedInHint")
						})]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: errorStyle,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						disabled: busy,
						onClick: () => {
							signOut();
						},
						children: busy ? t("working") : t("signOut")
					}) })
				]
			});
			const tabStyle = (active) => ({
				padding: "6px 14px",
				fontSize: "13px",
				fontWeight: active ? 600 : 400,
				color: active ? COLOR_PRIMARY : COLOR_TERTIARY,
				background: "none",
				border: "none",
				borderBottom: `2px solid ${active ? "currentColor" : "transparent"}`,
				cursor: "pointer"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: sectionStyle,
				children: [
					header,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: "13px",
							color: COLOR_TERTIARY
						},
						children: t("signInIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: "13px",
							color: COLOR_TERTIARY
						},
						children: t("gateHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: "4px",
							borderBottom: "1px solid var(--dsw-alias-border-subtle, rgba(127,127,127,.24))"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: tabStyle(mode === "signIn"),
							onClick: () => {
								setMode("signIn");
								setError(void 0);
							},
							children: t("signIn")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: tabStyle(mode === "signUp"),
							onClick: () => {
								setMode("signUp");
								setError(void 0);
							},
							children: t("signUp")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "12px",
							maxWidth: "360px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								id: "landou-email",
								label: t("email"),
								value: email,
								onChange: setEmail,
								type: "email",
								autoComplete: "email"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								id: "landou-password",
								label: t("password"),
								value: password,
								onChange: setPassword,
								type: "password",
								autoComplete: mode === "signIn" ? "current-password" : "new-password"
							}),
							mode === "signUp" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: "landou-name",
									label: t("displayName"),
									value: displayName,
									onChange: setDisplayName,
									autoComplete: "name"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: "6px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
											id: "landou-code",
											label: t("verificationCode"),
											value: verificationCode,
											onChange: setVerificationCode
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: "8px"
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: busy || cooldown > 0,
												style: {
													whiteSpace: "nowrap",
													flex: "none"
												},
												onClick: () => {
													requestCode();
												},
												children: cooldown > 0 ? t("resendIn").replace("{seconds}", String(cooldown)) : t("sendCode")
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: "12px",
												color: COLOR_TERTIARY
											},
											children: t("verificationHint")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									id: "landou-invite",
									label: `${t("inviteCode")} · ${t("inviteOptional")}`,
									value: inviteCode,
									onChange: setInviteCode
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Consent, {
									id: "landou-terms",
									label: t("acceptTerms"),
									checked: acceptedTerms,
									onChange: setAcceptedTerms
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Consent, {
									id: "landou-cross-border",
									label: t("acceptCrossBorder"),
									checked: acceptedCrossBorder,
									onChange: setAcceptedCrossBorder
								})
							] }),
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: errorStyle,
								children: error
							}),
							notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: noticeStyle,
								children: notice
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy,
								onClick: () => {
									submit();
								},
								children: busy ? t("working") : mode === "signIn" ? t("submitSignIn") : t("submitSignUp")
							}) })
						]
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
			signInIntro: "Sign in with your Blue Bean ERP account to use this plugin.",
			signIn: "Sign in",
			signUp: "Create account",
			email: "Email",
			password: "Password",
			displayName: "Display name",
			verificationCode: "Email code",
			inviteCode: "Invite code",
			inviteOptional: "Optional",
			verificationHint: "Send a code to this address, then enter it here. Leave empty if the server does not require one.",
			sendCode: "Send code",
			resendIn: "Resend in {seconds}s",
			codeSent: "Code sent. Check your inbox.",
			acceptTerms: "I accept the terms of service",
			acceptCrossBorder: "I consent to cross-border data transfer",
			submitSignIn: "Sign in",
			submitSignUp: "Create account",
			working: "Working…",
			signedInAs: "Signed in as {name}",
			signedInHint: "This device stays signed in until you sign out. The access token is kept by the local Blue Bean service, not in this page.",
			signOut: "Sign out",
			"canvas.panel": "Canvas session",
			"canvas.badge": "Canvas session",
			"canvas.toolbarHint": "Canvas",
			gateHint: "The sidebar shows the Blue Bean brand whether or not you are signed in. Signing in unlocks this page’s settings and features.",
			requiredFields: "Fill in every required field"
		};
		/** 简体中文文案。 */
		const zh = {
			nav: "蓝豆助手",
			title: "蓝豆助手",
			signInIntro: "用你的蓝豆 ERP 账号登录后即可使用本插件。",
			signIn: "登录",
			signUp: "注册账号",
			email: "邮箱",
			password: "密码",
			displayName: "显示名称",
			verificationCode: "邮箱验证码",
			inviteCode: "邀请码",
			inviteOptional: "选填",
			verificationHint: "先向该邮箱发送验证码,再填到这里。服务端不要求时可留空。",
			sendCode: "发送验证码",
			resendIn: "{seconds} 秒后可重发",
			codeSent: "验证码已发送,请查收邮箱。",
			acceptTerms: "我已阅读并同意服务条款",
			acceptCrossBorder: "我同意数据跨境传输",
			submitSignIn: "登录",
			submitSignUp: "注册",
			working: "处理中…",
			signedInAs: "已登录:{name}",
			signedInHint: "本机在退出登录前保持登录状态。访问令牌由本机蓝豆服务保存,不在这个页面里。",
			signOut: "退出登录",
			"canvas.panel": "画布会话",
			"canvas.badge": "画布会话",
			"canvas.toolbarHint": "画布",
			gateHint: "侧栏品牌名与登录无关,装上插件即可见。登录用于解锁本页的设置与功能。",
			requiredFields: "请填写所有必填项"
		};
		//#endregion
		//#region src/client/session.ts
		/**
		* 浏览器半边访问蓝豆 ERP 的唯一通道。
		*
		* 全部走**相对路径**,打到宿主 webserver 上由宿主半边代理转发到 ERP。
		* 浏览器不直连 `dmaierp.com`:实测该站预检返回 `vary: Origin` 但不下发
		* `access-control-allow-origin`,`dsh-app://app` 不在白名单里。
		*
		* 这里**永远拿不到访问令牌** —— 宿主只回"是否已登录 + 显示名 + user_id"。
		* 令牌留在宿主进程与 0600 文件里,不进浏览器、不进 React 状态、不进日志。
		*/
		/** 宿主路由前缀,与宿主半边的 `ROUTE_PREFIX` 一致。 */
		const BASE = "/landou-assistant";
		/** 调用宿主路由。网络本身出错(宿主没起来、被中断)也折叠成可展示的消息。 */
		async function call(path, init) {
			try {
				const response = await fetch(`${BASE}${path}`, {
					method: init?.method ?? "GET",
					headers: {
						accept: "application/json",
						...init?.body === void 0 ? {} : { "content-type": "application/json" }
					},
					...init?.body === void 0 ? {} : { body: JSON.stringify(init.body) }
				});
				const text = await response.text();
				let payload;
				try {
					payload = text === "" ? void 0 : JSON.parse(text);
				} catch {
					payload = void 0;
				}
				if (!response.ok) return {
					ok: false,
					message: typeof payload === "object" && payload !== null && "message" in payload ? String(payload.message) : `Request failed (${String(response.status)})`
				};
				return {
					ok: true,
					value: payload
				};
			} catch {
				return {
					ok: false,
					message: "Cannot reach the local Blue Bean service"
				};
			}
		}
		/** 读取当前会话。这是唯一的登录状态来源。 */
		function getSession() {
			return call("/session");
		}
		/** 登录。 */
		function login(email, password) {
			return call("/session/login", {
				method: "POST",
				body: {
					email,
					password
				}
			});
		}
		/** 注册。成功后 ERP 直接下发令牌,等同于已登录。 */
		function register(input) {
			return call("/session/register", {
				method: "POST",
				body: input
			});
		}
		/** 发送邮箱验证码。 */
		function sendEmailCode(email, purpose) {
			return call("/session/email-code", {
				method: "POST",
				body: {
					email,
					purpose
				}
			});
		}
		/** 退出登录。宿主会同时撤销服务端会话并删掉本地令牌文件。 */
		function logout() {
			return call("/session/logout", { method: "POST" });
		}
		//#endregion
		//#region src/client/index.ts
		/** 本插件拥有的文案命名空间。 */
		const NS = "landou-assistant";
		/**
		* 本插件在设置里的分区键。
		*
		* 菜单入口与设置分区两处注册共用同一个值:菜单行要指向分区,分区要用它做 id,
		* 两边写死字符串迟早会改一处漏一处,那样菜单点了会落到"没有这个分区"。
		*/
		const LANDOU_SECTION_ID = "landou-assistant";
		/**
		* 画布会话在主面板里的键。同一个值同时用于三处:main 面板的 key、侧栏行的 id、
		* 以及 `layout.selectPanel` 的目标 —— 写死三遍迟早会漂。
		*/
		const CANVAS_PANEL_ID = "landou-canvas";
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
			ctx.slots.inject("settings.launcher.menu.item", () => ctx.slots.register({
				name: "settings.launcher.menu.item",
				id: LANDOU_SECTION_ID,
				order: -100,
				locale: NS
			}, LandouLauncherItem));
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: CANVAS_PANEL_ID,
				locale: NS,
				children: { "landou.canvas.toolbar": {
					kind: "list",
					scope: "session"
				} }
			}, LandouCanvasPanel));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: CANVAS_PANEL_ID,
				order: 20,
				locale: NS,
				label: () => t("canvas.panel")
			}, LandouCanvasIcon));
			ctx.slots.inject("landou.canvas.toolbar", () => ctx.slots.register({
				name: "landou.canvas.toolbar",
				id: "canvas-badge",
				order: 0,
				locale: NS
			}, LandouCanvasBadge));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: LANDOU_SECTION_ID,
				order: 30,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({
					getSession,
					login,
					register,
					sendEmailCode,
					logout
				})
			}, LandouSettingsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map