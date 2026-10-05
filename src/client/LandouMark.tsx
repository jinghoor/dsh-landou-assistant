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
export function LandouMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ flex: 'none', display: 'block' }}
    >
      {/* 旋转 38° 让豆子斜躺;两个子路径:x 方向椭圆豆身 + 中央极扁椭圆豆缝 */}
      <g transform="rotate(-38 16 16)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M27 16a11 7.8 0 1 0-22 0 11 7.8 0 1 0 22 0Z M20.4 16a4.4 1 0 1 0-8.8 0 4.4 1 0 1 0 8.8 0Z"
        />
      </g>
    </svg>
  )
}
