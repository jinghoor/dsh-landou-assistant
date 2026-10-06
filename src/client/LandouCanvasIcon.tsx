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
export function LandouCanvasIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', display: 'block' }}
    >
      {/* 画板外框 */}
      <rect x="1.9" y="2.6" width="12.2" height="10.8" rx="1.6" />
      {/* 对角线:把它与「对话气泡」类图标区分开 */}
      <path d="M1.9 12.6 12.2 3.4" />
    </svg>
  )
}
