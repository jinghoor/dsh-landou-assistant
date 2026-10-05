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
export function LandouBrandName() {
  return (
    <>
      <span>蓝豆助手</span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 400,
          letterSpacing: '0.02em',
          opacity: 0.55,
          whiteSpace: 'nowrap',
        }}
      >
        by DeepSeek Harness
      </span>
    </>
  )
}
