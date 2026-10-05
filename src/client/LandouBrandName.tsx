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
export function LandouBrandName() {
  return (
    <>
      <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>蓝豆助手</span>
      <span
        style={{
          flexShrink: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
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
