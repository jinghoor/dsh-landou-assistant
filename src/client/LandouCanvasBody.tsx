/**
 * 画布主体 —— 左侧那块墙,渲染产物节点。
 *
 * ## 为什么它是 session 作用域的子座位,而不是直接写在面板里
 *
 * 面板注册在 `main` 上,scope 是 `root` —— **拿不到 sessionId**。而产物是按会话取的,
 * 没有 sessionId 就只能猜,猜错会把别的会话的产物显示成当前会话的,那比不显示更糟。
 *
 * 所以画布主体做成面板**自己声明的** session 作用域座位:`scope: 'session'` 的条目
 * 会从框架拿到当前会话 id。同一份声明还顺带满足框架给出 `SessionProvider` 的条件。
 *
 * ## 三类节点
 *
 * | 产物 | 判定 | 节点 |
 * |---|---|---|
 * | 图片 | `image/*` 或图片扩展名 | 缩略图,点击在新窗口打开 |
 * | 视频 | `video/*` 或视频扩展名 | `<video controls>` 内联可预览 |
 * | 文字 | 其余一切(兜底) | 文件名 + 扩展名标记 |
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { Artifact } from './artifacts.ts'
import type { CanvasNode } from './canvas-store.ts'
import { LandouMark } from './LandouMark.tsx'

/** 本组件从注册时的 inject 闭包拿到的能力。 */
export interface LandouCanvasBodyInjected {
  /**
   * 产物节点来源。
   *
   * 由注册时的 `hooks` 隔间绑定成 `useArtifacts` —— 业务组件不得自带订阅机制,
   * 而预览 URL 是异步到的,不订阅就永远看不到图。
   */
  useArtifacts: (select: (nodes: readonly CanvasNode[]) => readonly CanvasNode[]) => readonly CanvasNode[]
  /** 在右侧文档面板里打开一个产物;拿不到服务时退回新窗口。 */
  openArtifact: (path: string, url: string) => void
}

/** 本组件需要的全部 props。 */
export interface LandouCanvasBodyProps extends PropsLocale<'landou-assistant'>, LandouCanvasBodyInjected {
  /** 当前会话 id;无会话时为 undefined。 */
  sessionId?: string
}

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
const GRID_STYLE: Record<string, string | number> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gridAutoFlow: 'dense',
  gap: 12,
  padding: 12,
  alignContent: 'start',
}

/** 图片与视频占两列;文字一列。 */
const WIDE_SPAN = { gridColumn: 'span 2' } as const

/** 节点统一的卡片样式。 */
const NODE_STYLE: Record<string, string | number> = {
  border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
  borderRadius: 8,
  overflow: 'hidden',
  background: 'color-mix(in srgb, currentColor 3%, transparent)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}

/**
 * 渲染一个图片节点。
 * @param props - 产物与 URL 解析器。
 * @returns 缩略图卡片。
 */
function ImageNode({ artifact, url, t, onOpen }: { artifact: Artifact; url: string | null; t: LandouCanvasBodyProps['t']; onOpen: LandouCanvasBodyProps['openArtifact'] }) {
  return (
    <figure style={{ ...NODE_STYLE, ...WIDE_SPAN, margin: 0 }} data-landou-node="image" data-landou-path={artifact.path} title={artifact.path}>
      <div style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {url === null
          ? <span style={{ fontSize: 11, opacity: 0.45, padding: 8, textAlign: 'center' }}>{t('canvas.noPreview')}</span>
          : <img src={url} alt={artifact.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />}
      </div>
      <figcaption style={{ display: 'flex' }}>
        <NodeOpenButton artifact={artifact} url={url} onOpen={onOpen} />
      </figcaption>
    </figure>
  )
}

/**
 * 渲染一个视频节点。
 * @param props - 产物与 URL 解析器。
 * @returns 可预览的播放器卡片。
 */
function VideoNode({ artifact, url, t, onOpen }: { artifact: Artifact; url: string | null; t: LandouCanvasBodyProps['t']; onOpen: LandouCanvasBodyProps['openArtifact'] }) {
  return (
    <figure style={{ ...NODE_STYLE, ...WIDE_SPAN, margin: 0 }} data-landou-node="video" data-landou-path={artifact.path} title={artifact.path}>
      <div style={{ aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}>
        {url === null
          ? <span style={{ fontSize: 11, opacity: 0.45, color: '#fff' }}>{t('canvas.noPreview')}</span>
          : <video src={url} controls preload="metadata" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />}
      </div>
      <figcaption style={{ display: 'flex' }}>
        <NodeOpenButton artifact={artifact} url={url} onOpen={onOpen} />
      </figcaption>
    </figure>
  )
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
function NodeOpenButton({ artifact, url, onOpen, align = 'stretch' }: {
  readonly artifact: Artifact
  readonly url: string
  readonly onOpen: LandouCanvasBodyProps['openArtifact']
  readonly align?: 'start' | 'stretch'
}) {
  return (
    <button
      type="button"
      data-landou-open=""
      onClick={() => { onOpen(artifact.path, url) }}
      title={artifact.path}
      style={{
        flex: align === 'stretch' ? 1 : '0 1 auto',
        minWidth: 0,
        textAlign: 'left',
        font: 'inherit',
        fontSize: 12,
        color: 'inherit',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textDecoration: 'underline',
        textDecorationColor: 'color-mix(in srgb, currentColor 28%, transparent)',
        textUnderlineOffset: 3,
      }}
    >
      {artifact.name}
    </button>
  )
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
function TextNode({ artifact, preview, url, onOpen }: { artifact: Artifact; preview?: string | null; url: string; onOpen: LandouCanvasBodyProps['openArtifact'] }) {
  const hasBody = typeof preview === 'string' && preview.trim() !== ''
  return (
    <div style={{ ...NODE_STYLE, padding: 10, gap: 8 }} data-landou-node="text" data-landou-path={artifact.path} title={artifact.path}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, padding: '1px 5px', borderRadius: 4, border: '1px solid color-mix(in srgb, currentColor 20%, transparent)', opacity: 0.7, flex: 'none' }}
        >
          {artifact.extension === '' ? 'text' : artifact.extension}
        </span>
        <NodeOpenButton artifact={artifact} url={url} onOpen={onOpen} align="start" />
      </div>
      {hasBody
        ? <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.5, opacity: 0.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 132, overflow: 'hidden', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{preview}</pre>
        : <span style={{ fontSize: 11, opacity: 0.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left' }}>{artifact.path}</span>}
    </div>
  )
}

/**
 * 渲染画布上的产物节点墙。
 * @param props - 会话 id、产物读取器、URL 解析器与本地化文案。
 * @returns 节点网格,或空状态。
 */
export function LandouCanvasBody(props: LandouCanvasBodyProps) {
  const { useArtifacts, openArtifact, t } = props
  const nodes = useArtifacts(all => all)

  if (nodes.length === 0) {
    return (
      <div
        data-landou-canvas-empty=""
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', padding: 24, fontSize: 13, opacity: 0.5, textAlign: 'center' }}
      >
        <LandouMark size={22} />
        <span>{t('canvas.empty')}</span>
      </div>
    )
  }

  return (
    <div data-landou-canvas-grid="" style={GRID_STYLE}>
      {nodes.map((node) => {
        const { artifact, url } = node
        if (artifact.kind === 'image') return <ImageNode key={artifact.path} artifact={artifact} url={url} t={t} onOpen={openArtifact} />
        if (artifact.kind === 'video') return <VideoNode key={artifact.path} artifact={artifact} url={url} t={t} onOpen={openArtifact} />
        return <TextNode key={artifact.path} artifact={artifact} preview={node.preview} url={url} onOpen={openArtifact} />
      })}
    </div>
  )
}
