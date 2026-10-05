//#region src/index.ts
/**
* 蓝豆助手 —— 宿主半边。
*
* 本插件只贡献浏览器端呈现(侧栏品牌位),宿主侧没有服务、没有配置项,
* 所以 apply 为空。这不是占位:DSH 的客户端插件必须是「双面包」,
* 宿主半边给 Loader 一个可加载的 entry,浏览器半边才按 dsh.client 投递。
* 官方品牌插件 (ui-brand-official) 的宿主半边同样为空。
*/
/** 宿主插件体 —— 本包只贡献浏览器呈现。 */
function apply() {}
//#endregion
export { apply };

//# sourceMappingURL=index.js.map