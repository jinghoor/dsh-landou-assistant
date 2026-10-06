window.__ModuleLoader__.load({
	id: "dsh-landou-assistant",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
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
		//#region src/client/LandouCanvasBody.tsx
		/**
		* 画布网格:按类型自动排版。
		*
		* `auto-fill` + `minmax` 让列数随画布宽度自动定,`dense` 让大小不一的格子回填空洞
		* (没有它,一个跨两列的图片后面会留下一个永远填不上的缺口)。
		*
		* 尺寸按类型分:图片和视频是"看"的,给两列;文字是"认"的,一列足够。
		* 这样一屏里视觉重心自然落在图上,而不需要谁去指定位置 —— 手动摆位在产物
		* 陆续到来时会不断失效。
		*/
		const GRID_STYLE = {
			display: "grid",
			gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
			gridAutoFlow: "dense",
			gap: 12,
			padding: 12,
			alignContent: "start"
		};
		/** 图片与视频占两列;文字一列。 */
		const WIDE_SPAN = { gridColumn: "span 2" };
		/** 节点统一的卡片样式。 */
		const NODE_STYLE = {
			border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
			borderRadius: 8,
			overflow: "hidden",
			background: "color-mix(in srgb, currentColor 3%, transparent)",
			display: "flex",
			flexDirection: "column",
			minWidth: 0
		};
		/**
		* 渲染一个图片节点。
		* @param props - 产物与 URL 解析器。
		* @returns 缩略图卡片。
		*/
		function ImageNode({ artifact, url, t, onOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
				style: {
					...NODE_STYLE,
					...WIDE_SPAN,
					margin: 0
				},
				"data-landou-node": "image",
				"data-landou-path": artifact.path,
				title: artifact.path,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						aspectRatio: "4 / 3",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden"
					},
					children: url === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 11,
							opacity: .45,
							padding: 8,
							textAlign: "center"
						},
						children: t("canvas.noPreview")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: url,
						alt: artifact.name,
						style: {
							maxWidth: "100%",
							maxHeight: "100%",
							objectFit: "contain",
							display: "block"
						}
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
					style: { display: "flex" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeOpenButton, {
						artifact,
						url,
						onOpen
					})
				})]
			});
		}
		/**
		* 渲染一个视频节点。
		* @param props - 产物与 URL 解析器。
		* @returns 可预览的播放器卡片。
		*/
		function VideoNode({ artifact, url, t, onOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
				style: {
					...NODE_STYLE,
					...WIDE_SPAN,
					margin: 0
				},
				"data-landou-node": "video",
				"data-landou-path": artifact.path,
				title: artifact.path,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						aspectRatio: "16 / 9",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
						background: "#000"
					},
					children: url === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 11,
							opacity: .45,
							color: "#fff"
						},
						children: t("canvas.noPreview")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
						src: url,
						controls: true,
						preload: "metadata",
						style: {
							maxWidth: "100%",
							maxHeight: "100%",
							display: "block"
						}
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
					style: { display: "flex" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeOpenButton, {
						artifact,
						url,
						onOpen
					})
				})]
			});
		}
		/**
		* 节点底部那一行可点的文件名。
		*
		* 产物节点不该是死图:**看到之后下一步总是"打开它"**,所以文件名本身就是入口。
		* 点击走注册处注入的 `openArtifact(路径, 兜底 URL)` —— 组件拿不到 ctx,这是硬规矩;
		* 而兜底 URL 让服务缺席时至少还能在新窗口里打开。
		* @param props - 产物、兜底 URL、打开动作与对齐方式。
		* @returns 一个按钮。
		*/
		function NodeOpenButton({ artifact, url, onOpen, align = "stretch" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-landou-open": "",
				onClick: () => {
					onOpen(artifact.path, url);
				},
				title: artifact.path,
				style: {
					flex: align === "stretch" ? 1 : "0 1 auto",
					minWidth: 0,
					textAlign: "left",
					font: "inherit",
					fontSize: 12,
					color: "inherit",
					background: "transparent",
					border: "none",
					padding: 0,
					cursor: "pointer",
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					textDecoration: "underline",
					textDecorationColor: "color-mix(in srgb, currentColor 28%, transparent)",
					textUnderlineOffset: 3
				},
				children: artifact.name
			});
		}
		/**
		* 渲染一个文字节点。
		*
		* 有内容预览时以内容为主、文件名为辅 —— 文字产物的信息全在内容里,只写文件名
		* 等于什么都没说。预览按等宽字体呈现并限高,因为它的用途是"一眼认出来",
		* 不是阅读;超出部分`overflow: hidden` 裁掉而不是省略号,免得看起来像内容就这么多。
		* @param props - 产物与已取到的内容预览。
		* @returns 文字卡片。
		*/
		function TextNode({ artifact, preview, url, onOpen }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const hasBody = typeof preview === "string" && preview.trim() !== "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...NODE_STYLE,
					padding: 10,
					gap: 8
				},
				"data-landou-node": "text",
				"data-landou-path": artifact.path,
				title: artifact.path,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 6,
						minWidth: 0
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							fontSize: 10,
							textTransform: "uppercase",
							letterSpacing: .4,
							padding: "1px 5px",
							borderRadius: 4,
							border: "1px solid color-mix(in srgb, currentColor 20%, transparent)",
							opacity: .7,
							flex: "none"
						},
						children: artifact.extension === "" ? "text" : artifact.extension
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeOpenButton, {
						artifact,
						url,
						onOpen,
						align: "start"
					})]
				}), hasBody ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "button",
					tabIndex: 0,
					onClick: () => {
						setExpanded((value) => !value);
					},
					onKeyDown: (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							setExpanded((value) => !value);
						}
					},
					style: { cursor: "pointer" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						style: {
							margin: 0,
							fontSize: 11,
							lineHeight: 1.5,
							opacity: .8,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							maxHeight: expanded ? "none" : 132,
							overflow: "hidden",
							fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
						},
						children: preview
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 11,
						opacity: .45,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						direction: "rtl",
						textAlign: "left"
					},
					children: artifact.path
				})]
			});
		}
		/**
		* 渲染画布上的产物节点墙。
		* @param props - 会话 id、产物读取器、URL 解析器与本地化文案。
		* @returns 节点网格,或空状态。
		*/
		function LandouCanvasBody(props) {
			const { useArtifacts, openArtifact, t } = props;
			const nodes = useArtifacts((all) => all);
			if (nodes.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-landou-canvas-empty": "",
				style: {
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					height: "100%",
					padding: 24,
					fontSize: 13,
					opacity: .5,
					textAlign: "center"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LandouMark, { size: 22 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("canvas.empty") })]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-landou-canvas-grid": "",
				style: GRID_STYLE,
				children: nodes.map((node) => {
					const { artifact, url } = node;
					if (artifact.kind === "image") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageNode, {
						artifact,
						url,
						t,
						onOpen: openArtifact
					}, artifact.path);
					if (artifact.kind === "video") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VideoNode, {
						artifact,
						url,
						t,
						onOpen: openArtifact
					}, artifact.path);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextNode, {
						artifact,
						preview: node.preview,
						url,
						onOpen: openArtifact
					}, artifact.path);
				})
			});
		}
		//#endregion
		//#region src/client/artifacts.ts
		/** 图片扩展名。刻意收窄到浏览器 `<img>` 真能显示的格式。 */
		const IMAGE_EXTENSIONS = new Set([
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"avif",
			"bmp",
			"svg",
			"ico"
		]);
		/** 视频扩展名。刻意收窄到 `<video>` 真能播放的容器。 */
		const VIDEO_EXTENSIONS = new Set([
			"mp4",
			"webm",
			"ogv",
			"mov",
			"m4v"
		]);
		/**
		* 路径里出现这些 MIME 片段时直接定性,优先于扩展名。
		*
		* 存在的理由:有些产物路径形如 `/out/img.1712345678.png?v=2` 或
		* `/cache/ab12cd34`(无扩展名但 MIME 写在路径里)。只看最后一段扩展名会判错。
		*/
		const MIME_HINTS = [
			["image/", "image"],
			["video/", "video"],
			["text/", "text"]
		];
		/**
		* 从路径里取出真正参与判定的那一段。
		*
		* 去掉查询串与 URL 片段 —— 它们会污染扩展名(`.png?v=2` 的"扩展名"是 `png?v=2`)。
		* @param path - 原始路径或 URL 形式。
		* @returns 去掉查询串与片段后的路径。
		*/
		function stripQuery(path) {
			const query = path.search(/[?#]/u);
			return query < 0 ? path : path.slice(0, query);
		}
		/**
		* 取路径最后一段作为展示名。
		* @param path - 已去掉查询串的路径。
		* @returns 文件名;路径以分隔符结尾时回退为整条路径。
		*/
		function baseName(path) {
			const segments = path.split(/[\\/]/u);
			for (let index = segments.length - 1; index >= 0; index -= 1) if (segments[index] !== "") return segments[index];
			return path;
		}
		/**
		* 取小写扩展名。
		*
		* 只有点在最后一段**内部**才算扩展名:`/a.b/c` 的文件名是 `c`,没有扩展名。
		* 另外拒绝过长与含空白的"扩展名" —— 那是文件名的一部分,不是类型。
		* @param name - 文件名。
		* @returns 不含点的扩展名;判定不了时为空串。
		*/
		function extensionOf(name) {
			const dot = name.lastIndexOf(".");
			if (dot <= 0 || dot === name.length - 1) return "";
			const extension = name.slice(dot + 1).toLowerCase();
			return /^[a-z0-9]{1,8}$/u.test(extension) ? extension : "";
		}
		/**
		* 把一条产物路径分类。
		* @param path - 产物路径。
		* @param seq - 会话事件序号。
		* @returns 分类结果。
		*/
		function classifyArtifact(path, seq) {
			const clean = stripQuery(path);
			const name = baseName(clean);
			const extension = extensionOf(name);
			const lower = clean.toLowerCase();
			for (const [hint, kind] of MIME_HINTS) if (lower.includes(hint)) return {
				path,
				kind,
				name,
				extension,
				classifiedBy: "mime",
				seq
			};
			if (IMAGE_EXTENSIONS.has(extension)) return {
				path,
				kind: "image",
				name,
				extension,
				classifiedBy: "extension",
				seq
			};
			if (VIDEO_EXTENSIONS.has(extension)) return {
				path,
				kind: "video",
				name,
				extension,
				classifiedBy: "extension",
				seq
			};
			return {
				path,
				kind: "text",
				name,
				extension,
				classifiedBy: "fallback",
				seq
			};
		}
		/**
		* 把散落的产物路径归并成画布要渲染的节点列表。
		*
		* 同一路径出现多次(多轮重复写出)时保留**最后一次**的 seq 并只留一个节点:
		* 画布是产物墙,不是流水账,同一张图被改写三次不该出现三个格子。
		* @param entries - 路径与序号,顺序不限。
		* @returns 按 seq 升序、路径去重后的节点列表。
		*/
		function collectArtifacts(entries) {
			const byPath = /* @__PURE__ */ new Map();
			for (const entry of entries) {
				const existing = byPath.get(entry.path);
				if (existing !== void 0 && existing.seq >= entry.seq) continue;
				byPath.set(entry.path, classifyArtifact(entry.path, entry.seq));
			}
			return [...byPath.values()].sort((left, right) => left.seq - right.seq);
		}
		//#endregion
		//#region src/client/canvas-artifacts.ts
		/** 一条 `{path, seq}` 记录,与 DSH 的 produced/presented 两种形态都对得上。 */
		function readEntry(value) {
			if (value === null || typeof value !== "object") return null;
			const record = value;
			if (typeof record.path !== "string") return null;
			return {
				path: record.path,
				seq: typeof record.seq === "number" ? record.seq : 0
			};
		}
		/**
		* 把一个 turn 的 data store 读成产物条目。
		* @param store - 该 turn 的数据存储,应为 Map 形态。
		* @returns 条目列表;结构不符时为空。
		*/
		function entriesFromTurnData(store) {
			if (store === null || typeof store !== "object") return [];
			const get = store.get;
			if (typeof get !== "function") return [];
			let deliverables;
			try {
				deliverables = get.call(store, "deliverables");
			} catch (_error) {
				return [];
			}
			if (deliverables === null || typeof deliverables !== "object") return [];
			const data = deliverables;
			const entries = [];
			for (const group of [data.produced, data.presented]) {
				if (!Array.isArray(group)) continue;
				for (const item of group) {
					const entry = readEntry(item);
					if (entry !== null) entries.push(entry);
				}
			}
			return entries;
		}
		/**
		* 从 `locationIndex.turnDataStores` 取全部 turn 的产物条目。
		*
		* `turnDataStores` 在实测里是个 Map(turn → store)。这里不假定它的类型:
		* 是 Map 就走 `values()`,是对象就取自己的值 —— 两种都见得到同样的东西。
		* @param turnDataStores - 组装器的 turn 数据存储集合。
		* @returns 条目列表。
		*/
		function entriesFromIndex(turnDataStores) {
			if (turnDataStores === null || turnDataStores === void 0) return [];
			const entries = [];
			let stores;
			if (typeof turnDataStores.values === "function") try {
				stores = Array.from(turnDataStores.values());
			} catch (_error) {
				stores = [];
			}
			else if (Array.isArray(turnDataStores)) stores = turnDataStores;
			else stores = Object.values(turnDataStores);
			for (const store of stores) entries.push(...entriesFromTurnData(store));
			return entries;
		}
		/**
		* 取当前会话的绑定。
		*
		* ## 为什么不按 sessionId 匹配
		*
		* 我原本想用 `bindings.keys` 把 sessionId 对上 —— **做不到**。实测:
		*
		* ```
		* bindings.keys      → WeakMap   ← 键是对象,枚举不了也查不了(WeakMap 不接受字符串键)
		* bindings.valueSet  → Set       ← 可以枚举
		* bindings.values    → Set
		* ```
		*
		* `keys` 是 WeakMap 这一点决定了按 id 匹配这条路根本不存在,不是实现麻烦。
		*
		* ## 那怎么确定是哪条
		*
		* DSH **只为正在查看的会话保留绑定**(其余在切换时释放),所以 `valueSet` 通常恰好一条,
		* 那条就是当前会话的。这是本文件最依赖假设的一处,所以:
		*
		* - 只有一条时直接用它;
		* - **多于一条时不猜** —— 猜错会把别的会话的产物显示成当前会话的,那比不显示更糟。
		*   返回 null 让画布显示空态,并把这个限制写在这里而不是悄悄发生。
		*
		* @param bindings - `ctx.uiConversation.bindings`。
		* @returns 绑定对象;取不到或无法确定时返回 null。
		*/
		function pickBinding(bindings) {
			if (bindings === null || typeof bindings !== "object") return null;
			const valueSet = bindings.valueSet;
			if (valueSet === null || valueSet === void 0) return null;
			let values;
			try {
				values = Array.from(valueSet);
			} catch (_error) {
				return null;
			}
			return values.length === 1 ? values[0] : null;
		}
		/**
		* 读出某个会话当前的产物节点。
		* @param uiConversation - `ctx.uiConversation`。
		* @param sessionId - 目标会话。
		* @returns 按 seq 升序、路径去重后的产物列表;取不到时为空数组。
		*/
		function readSessionArtifacts(uiConversation, sessionId) {
			try {
				const container = uiConversation?.bindings;
				const stores = pickBinding(container)?.binding?.assembler?.locationIndex?.turnDataStores;
				return collectArtifacts(entriesFromIndex(stores));
			} catch (_error) {
				return [];
			}
		}
		//#endregion
		//#region src/client/canvas-store.ts
		/** 建一个画布产物的来源。 */
		function createCanvasSource() {
			const empty = [];
			let snapshot = empty;
			const listeners = /* @__PURE__ */ new Set();
			/** 两条节点是否指向同一个东西且预览态一致。 */
			const same = (left, right) => left.artifact.path === right.artifact.path && left.artifact.kind === right.artifact.kind && left.artifact.name === right.artifact.name && left.url === right.url && left.preview === right.preview;
			return {
				source: {
					getSnapshot: () => snapshot,
					subscribe: (listener) => {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
						};
					}
				},
				publish: (nodes) => {
					if (nodes.length === snapshot.length && nodes.every((node, index) => same(node, snapshot[index]))) return;
					snapshot = nodes.length === 0 ? empty : nodes;
					for (const listener of listeners) listener();
				}
			};
		}
		//#endregion
		//#region src/client/file-address.ts
		/**
		* `dsh-resource://file/…` 地址的构造。
		*
		* ## 为什么要把这段抄一遍
		*
		* 官方的实现在 `@deepseek-ai/dsh-util-workspace-path` 里(`file-address.ts`),
		* 而本插件装在 profile 的 node_modules 下,**解析不到仓库内的包**,所以 import 不了。
		* 抄语法不抄实现 —— 这里只用到 `session` 作用域那一种,36 行,语法写在下面,
		* 官方改格式时这个文件是唯一要跟着改的地方。
		*
		* ## 为什么用 session 作用域而不是 absolute
		*
		* 操作者的要求是"每个画布会话都必须依托一个工作区,不同工作区的会话是隔离的"。
		* `session` 作用域正是这条约束的执行点:**宿主按该会话自己持有的 workspace root
		* 解析路径**,地址里带的就是 sessionId。用 `absolute` 会绕开工作区解析 ——
		* 那既丢了隔离,也让同一路径在不同工作区下指向同一个文件。
		*
		* ## 语法(取自 file-address.ts 的模块说明)
		*
		* ```
		* dsh-resource://file/session/<sessionId>/<path>
		* ```
		*
		* 每一段都做 component-encode,但 `:` 保持字面(盘符要按原样读)。
		*/
		/** 所有文件地址共同的前缀。 */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
		/**
		* 编码一段 id 或路径段。
		* @param segment - 原始段。
		* @returns 编码后的段;`:` 保持字面。
		*/
		function encodeSegment(segment) {
			return encodeURIComponent(segment).replace(/%3A/giu, ":");
		}
		/**
		* 按段编码一条 `/` 分隔的路径。
		* @param path - 已规范化为 `/` 分隔的路径。
		* @returns 编码后的路径。
		*/
		function encodePath(path) {
			return path.split("/").map(encodeSegment).join("/");
		}
		/**
		* 构造某个会话读取某个文件的地址。
		*
		* 路径可以是绝对的,也可以是相对该会话工作区根的 —— **两种都由宿主按会话的
		* workspace root 解析**,所以调用方不需要自己判断。
		* @param sessionId - 解析该路径的会话。
		* @param path - 绝对或工作区相对路径;反斜杠会被规范化为 `/`,开头的 `./` 会被去掉。
		* @returns `dsh-resource://file/session/<sessionId>/<path>` 地址。
		*/
		function sessionFileAddress(sessionId, path) {
			const normalized = path.replace(/\\/gu, "/").replace(/^(?:\.\/)+/u, "");
			return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
		}
		//#endregion
		//#region src/client/LandouCanvasPanel.tsx
		/**
		* 画布会话的外层布局。
		*
		* **刻意不碰会话内部的任何东西。** 上一版我改过 `[data-conversation-scroll]` 的
		* 主轴和 `[data-composer-seat]` 的 position —— 那是在拆别人的内部排布,现在整段删掉。
		* 需求是右侧"正常的 agent 对话区域",那么右侧就该是**原样的那一份**,一行 CSS 都不加。
		*
		* 这里只做一件事:把一块画布放到会话左边。
		*
		* 选择器只落在两个自己拥有的属性上:
		*   [data-landou-canvas]         本面板的根
		*   [data-landou-canvas-left]    我自己那块画布
		* 其余兄弟节点(会话内容)只当 flex 项处理,不选它、不碰它。
		*/
		const CANVAS_CSS = `
[data-landou-canvas] {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

/* 左侧画布:固定初始宽度,可拖拽调整(拖拽手柄见下面的 JSX)。 */
[data-landou-canvas-left] {
  flex: 0 0 var(--landou-canvas-width, 46%);
  width: var(--landou-canvas-width, 46%);
  min-width: 220px;
  max-width: 80%;
  min-height: 0;
  border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  overflow: auto;
}

/* 右侧会话:吃掉剩余宽度。min-width 归零让它内部自己滚动,不被内容撑开。 */
[data-landou-canvas] > :not([data-landou-canvas-left]) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
`;
		/**
		* 渲染画布会话。
		* @param props - 框架座位与本地化文案。
		* @returns 托管的会话内容与画布布局容器。
		*/
		function LandouCanvasPanel(props) {
			const { SessionProvider, renderFactorySlot, renderSlot, t } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-landou-canvas": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CANVAS_CSS }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						"data-landou-canvas-left": "",
						"aria-label": t("canvas.panel"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-landou-canvas-bar": "",
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "6px 12px",
								fontSize: 12,
								opacity: .75,
								borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)"
							},
							children: renderSlot("landou.canvas.toolbar", {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								height: "calc(100% - 32px)",
								minHeight: 0,
								overflow: "auto"
							},
							children: renderSlot("landou.canvas.body", {})
						})]
					}),
					SessionProvider({ children: renderFactorySlot("conversation.content", {
						variant: "main",
						phase: "active",
						hero: false
					}) })
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
		//#region src/client/LandouNewSessionAction.tsx
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
		/**
		* 渲染「画布会话」这一行。
		* @param props - 侧栏宽度、开画布会话的动作与本地化文案。
		* @returns 与新会话按钮同一行的入口按钮。
		*/
		function LandouNewSessionAction({ workspaceId, startSession, startCanvasSession, closeMenu, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LandouCanvasIcon, { size: 16 }),
				onSelect: () => {
					closeMenu();
					startCanvasSession(workspaceId, startSession);
				},
				children: t("canvas.panel")
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
			"canvas.empty": "No artifacts yet. Ask the agent to create an image, a video, or text.",
			"canvas.noPreview": "Preview unavailable",
			"canvas.open": "Open in the document panel",
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
			"canvas.empty": "画布上还没有产物。让 agent 生成图片、视频或文字,产物会出现在这里。",
			"canvas.noPreview": "预览不可用",
			"canvas.open": "在文档面板中打开",
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
		/** 宿主半边的路由前缀;与 `src/index.ts` 的 `ROUTE_PREFIX` 一致。 */
		const LANDOU_ROUTE_PREFIX = "/landou-assistant";
		/**
		* 哪些会话是画布会话。
		*
		* 存 localStorage 而不是内存:重载后要能回到画布布局,否则每次刷新都掉回普通对话。
		* DSH 的会话实体里没有"种类"这个字段(实测),所以这个映射只能由本插件持有 ——
		* 它是本插件对自己会话的标注,不是 DSH 的数据。
		*/
		const CANVAS_SESSIONS_KEY = "dsh-landou.canvasSessions";
		/** 读回画布会话集合;内容损坏时返回空集而不是抛错。 */
		function readCanvasSessions() {
			try {
				const raw = window.localStorage.getItem(CANVAS_SESSIONS_KEY);
				const parsed = raw === null ? [] : JSON.parse(raw);
				return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
			} catch (_error) {
				return /* @__PURE__ */ new Set();
			}
		}
		/** 写回画布会话集合。 */
		function writeCanvasSessions(ids) {
			try {
				window.localStorage.setItem(CANVAS_SESSIONS_KEY, JSON.stringify([...ids]));
			} catch (_error) {}
		}
		/** 必需服务:UI slot 注册表 + 本地化字典。 */
		const inject = [
			"slots",
			"locale",
			"uiConversation",
			"resources",
			"layout",
			"uiWorkspace",
			"uiSession"
		];
		/**
		* 注册本插件的全部浏览器贡献。
		* @param ctx - 浏览器根上下文。
		*/
		/**
		* 把一个磁盘路径变成浏览器能加载的 URL。
		*
		* 走**插件宿主半边**自己开的文件路由。为什么不能用 DSH 的资源模型:
		* `file` 协议的 provider 只产出元数据 —— 原话是 "a workspace file's **metadata**
		* as a stream of RemoteResult frames",值是 `{absolutePath, version, bytes}`,
		* **既不含字节也不含 URL**。所以浏览器侧没有任何内置途径把工作区文件读成图片;
		* 官方的图片预览是从调用方拿字节的,那条通道不属于插件。
		*
		* 相对路径由宿主侧解析(路由只接受绝对路径,这里传的就是产物自带的绝对路径),
		* 而**授权面在宿主**:路由只服务已登记工作区根下面的常规文件,根之外一律 403。
		* @param path - 产物路径。
		* @returns 同源可加载的 URL。
		*/
		function previewUrlFor(ctx, sessionId, path) {
			return `${LANDOU_ROUTE_PREFIX}/file?${`path=${encodeURIComponent(absoluteArtifactPath(ctx, sessionId, path))}&session=${encodeURIComponent(sessionId)}`}`;
		}
		/** 会被当作文字预览的扩展名。二进制文件也归 `text` 一类(分类的兜底),但不该去读它。 */
		const TEXTUAL_EXTENSIONS = new Set([
			"md",
			"markdown",
			"txt",
			"json",
			"csv",
			"tsv",
			"log",
			"yaml",
			"yml",
			"toml",
			"ini",
			"html",
			"css",
			"js",
			"ts",
			"tsx",
			"jsx",
			"py",
			"sh",
			"rs",
			"go",
			"java",
			"c",
			"h",
			"cpp"
		]);
		/** 预览字符上限。节点是"一眼看到",不是阅读器。 */
		const PREVIEW_CHARS = 600;
		/**
		* 文字产物内容的缓存。
		*
		* 按**路径 + 预览 URL** 缓存而不是只按路径:URL 里带着路径,文件被改写后内容会变,
		* 而这里没有版本号可用。简单起见缓存进程生命周期 —— 画布会话里同一路径的内容
		* 在一次浏览中通常不变,真变了刷新页面即可。
		*/
		const previewCache = /* @__PURE__ */ new Map();
		/**
		* 取文字产物的内容预览。
		*
		* 只对**已知是文字的扩展名**发请求:`text` 是分类的兜底类,一个 .zip 也会落到那里,
		* 去读它只会拿到乱码。取不到就返回 null,节点退回只显示文件名。
		* @param url - 该产物的预览 URL。
		* @param path - 产物路径(用于判断扩展名)。
		* @returns 预览文本;不适用或失败时为 null。
		*/
		async function loadTextPreview(url, path) {
			const dot = path.lastIndexOf(".");
			const extension = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
			if (!TEXTUAL_EXTENSIONS.has(extension)) return null;
			const cached = previewCache.get(url);
			if (cached !== void 0) return cached;
			let result = null;
			try {
				const response = await fetch(url);
				if (response.ok) result = (await response.text()).slice(0, PREVIEW_CHARS);
			} catch (_error) {
				result = null;
			}
			previewCache.set(url, result);
			return result;
		}
		/**
		* 取会话的工作区根。
		* @param ctx - 插件上下文。
		* @param sessionId - 会话。
		* @returns 规范化后的根路径;取不到时返回 undefined。
		*/
		function workspaceRootOf(ctx, sessionId) {
			try {
				const cwd = (ctx.get("uiConversation")?.sessions)?.list?.getSnapshot().byId?.[sessionId]?.cwd;
				return typeof cwd === "string" && cwd !== "" ? cwd.replace(/[/\\]+$/u, "") : void 0;
			} catch (_error) {
				return;
			}
		}
		/**
		* 在 DSH 的右侧文档面板里打开一个产物。
		*
		* 走官方入口 `sidebarRight.openResource(地址)` —— `ui-reference` 就是这么做的。
		* 地址用 **session 作用域**(`dsh-resource://file/session/<id>/<相对路径>`):
		* 宿主按该会话自己持有的 workspace root 解析,与预览字节那条路由同一套隔离。
		*
		* 服务缺席或打不开时退回在新窗口里打开插件自己的预览路由 —— 那至少能让用户看到东西,
		* 而节点点了毫无反应是最差的。
		* @param ctx - 插件上下文。
		* @param sessionId - 会话。
		* @param path - 产物路径。
		* @param url - 插件预览路由的 URL,作为兜底。
		* @returns 无。
		*/
		function openArtifact(ctx, sessionId, path, url) {
			const root = workspaceRootOf(ctx, sessionId);
			const relative = root !== void 0 && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
			try {
				const sidebarRight = ctx.get("sidebarRight");
				if (sidebarRight?.openResource !== void 0) {
					sidebarRight.openResource(sessionFileAddress(sessionId, relative));
					return;
				}
			} catch (_error) {}
			try {
				window.open(url, "_blank", "noopener,noreferrer");
			} catch (_error) {}
		}
		/**
		* 把产物路径补成绝对路径。
		*
		* 产物的 `produced` 路径**有时相对有时绝对** —— 实测同一个工作区里,
		* `apple.svg` 是相对的,而另一个会话产出的是绝对路径。宿主路由只接受绝对路径
		* (`resolve()` 会把相对路径丢到宿主自己的 cwd 上,于是不在任何工作区根下,直接 403),
		* 所以这里用会话自己的工作区根补齐。
		*
		* 补不齐时**原样返回** —— 让宿主按不在工作区内拒绝,而不是猜一个别的文件出来。
		* @param ctx - 插件上下文。
		* @param sessionId - 会话。
		* @param path - 产物路径,绝对或相对。
		* @returns 绝对路径,或原路径。
		*/
		function absoluteArtifactPath(ctx, sessionId, path) {
			if (path.startsWith("/")) return path;
			const root = workspaceRootOf(ctx, sessionId);
			return root === void 0 ? path : `${root}/${path.replace(/^\/+/u, "")}`;
		}
		function apply(ctx) {
			/**
			* 「画布会话」被点过、但目标会话还没确定。
			*
			* **不是布尔标志。** 布尔标志会被"下一个出现的当前会话"消费 —— 而切换快过一次
			* 轮询时,那可能不是用户点的那一个。实测踩过:连着点两次后,标记落到了上一个会话上,
			* 当前会话反而没被标记,画布面板也就没切过去。
			*
			* 记录点击那一刻的会话与时间,收尾时按这两种情形判定:
			* - `startSession()` 真的开了新会话 → 当前会话与那时不同,记新的那个;
			* - **DSH 复用了空白会话**(实测常态,id 根本不变)→ 等一小会儿仍是同一个,就记它。
			* 超时未收尾就丢弃,免得一个陈旧的待办在几分钟后标记一个无关会话。
			*/
			let pendingCanvasSession;
			/** 画布产物的响应式来源;下面那个轮询负责刷新它,画布主体通过 hooks 隔间消费。 */
			const canvas = createCanvasSource();
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "landou-assistant: dictionaries");
			ctx.effect(() => {
				const timer = window.setInterval(() => {
					const sessionId = ctx.get("uiSession")?.mainRetainId;
					if (sessionId === void 0) {
						canvas.publish([]);
						return;
					}
					const artifacts = readSessionArtifacts(ctx.get("uiConversation"), sessionId);
					Promise.all(artifacts.map(async (artifact) => {
						const url = previewUrlFor(ctx, sessionId, artifact.path);
						return {
							artifact,
							url,
							preview: await loadTextPreview(url, artifact.path)
						};
					})).then((nodes) => {
						canvas.publish(nodes);
					});
				}, 800);
				return () => {
					window.clearInterval(timer);
				};
			}, "landou: canvas artifacts");
			ctx.effect(() => {
				let lastSession = "";
				const timer = window.setInterval(() => {
					const session = ctx.get("uiSession")?.mainRetainId;
					if (session === void 0) return;
					const changed = session !== lastSession;
					lastSession = session;
					const pending = pendingCanvasSession;
					const settled = pending !== void 0 && (changed || Date.now() - pending.at > 1200);
					const marked = readCanvasSessions();
					if (pending !== void 0 && settled) {
						pendingCanvasSession = void 0;
						marked.add(session);
						writeCanvasSessions(marked);
					} else if (pending !== void 0 && Date.now() - pending.at > 8e3) pendingCanvasSession = void 0;
					const layout = ctx.get("layout");
					if (layout === void 0) return;
					const active = layout.panelInfo.getSnapshot().activePanelId;
					if (marked.has(session)) {
						if (active !== CANVAS_PANEL_ID) layout.selectPanel(CANVAS_PANEL_ID);
					} else if (active === CANVAS_PANEL_ID) layout.selectPanel(null);
				}, 400);
				return () => {
					window.clearInterval(timer);
				};
			}, "landou: canvas layout follows the session");
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
				children: {
					"landou.canvas.toolbar": {
						kind: "list",
						scope: "session"
					},
					"landou.canvas.body": {
						kind: "single",
						scope: "session"
					}
				}
			}, LandouCanvasPanel));
			ctx.slots.inject("sidebar.workspaces.newsession.item", () => ctx.slots.register({
				name: "sidebar.workspaces.newsession.item",
				id: "canvas-session",
				order: 10,
				locale: NS,
				inject: () => ({ startCanvasSession: (workspaceId, startSession) => {
					pendingCanvasSession = {
						before: ctx.get("uiSession")?.mainRetainId ?? "",
						at: Date.now()
					};
					startSession();
				} })
			}, LandouNewSessionAction));
			ctx.slots.inject("landou.canvas.body", () => ctx.slots.register({
				name: "landou.canvas.body",
				id: "canvas-body",
				locale: NS,
				inject: (sessionId) => ({
					hooks: { artifacts: canvas.source },
					openArtifact: (path, url) => {
						openArtifact(ctx, sessionId, path, url);
					}
				})
			}, LandouCanvasBody));
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