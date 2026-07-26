import type { RaphaelElement, RaphaelSet } from 'raphael'
import { STATES } from './constants'

/** 棋子颜色：1 黑，2 白（历史代码偶发 0） */
export type StoneColor = number

export type BoardSize = 9 | 13 | 19

/** true 全手数，'last' 仅最后一手，false 隐藏 */
export type ShowOrderMode = boolean | 'last'

export type ClickStatus = '' | 'marker' | 'markdead'

export type BoardPosition = 't' | 'c'

export type BoardStatus = (typeof STATES)[keyof typeof STATES]

export interface BoardStyle {
  borderColor: string
  lineColor: string
  bgColor: string
  kid: boolean
  borderWidth: number
  lineWidth: number
  outerLineWidth: number
  stoneOffsetX: number
  stoneOffsetY: number
  helperLineColor: string
}

export interface SizeSetting {
  PIECE_RADIUS: number
  UNIT_LENGTH: number
  fontSize: number
  markerSize: number
  boardImg?: string
}

export type SizeSettings = Record<number, SizeSetting>

export interface GoboardOptions {
  clientColor: StoneColor
  whoFirst: StoneColor
  /** aigame / class / history 等业务场景标记 */
  type: string

  WIDTH: number
  BOARD_WIDTH: number
  PLACE_WIDTH: number
  PIECE_RADIUS: number
  UNIT_LENGTH: number
  stoneOpacity: number
  boardSize: BoardSize | number
  fontSize: number
  markerSize: number

  readonly: boolean
  showOrder: ShowOrderMode
  showCoordinates: boolean
  showHelperLines: boolean
  playConfirm: boolean
  sound: boolean
  resizable: boolean

  zoom: number
  position: BoardPosition | string

  boardImg: string
  useBoardImg: boolean
  svgBoardImg: string
  style: BoardStyle
  stoneShadow: boolean
  coordinateColor: string
  coordinateDistance: number
  sizeSettings: SizeSettings
}

/** 构造参数：必填容器，其余覆盖默认 options */
export type GoboardConfig = Partial<Omit<GoboardOptions, 'style' | 'sizeSettings'>> & {
  el: HTMLDivElement
  blackImg?: string
  whiteImg?: string
  style?: Partial<BoardStyle>
  sizeSettings?: SizeSettings
}

export type RaphaelNodeMap = Record<string, RaphaelElement>
export type PieceMap = Record<string, RaphaelElement | RaphaelSet>

/** 轻量 SVG 文本节点（坐标等），避免 Raphael text 的 getBBox Forced reflow */
export interface BoardTextElement {
  node: SVGTextElement
  show(): BoardTextElement
  hide(): BoardTextElement
  attr(name: string, value: string | number): BoardTextElement
  remove(): void
}

export type BoardTextMap = Record<string, BoardTextElement>

export interface BoardPoint {
  col: number
  row: number
}

/** 旧协议：大写 Col/Row（形势判断等） */
export interface TerritoryVertex {
  Col: number
  Row: number
}

export interface TerritoryGroup {
  Color: number
  Moyos: TerritoryVertex[]
}

/** 盘面点颜色表：key 为 "col,row" */
export type StoneColorMap = Record<string, StoneColor>

export type TextAttrs = Record<string, string | number | undefined>

export type PlayCallback = (color: StoneColor, col: number, row: number) => void
export type MarkCallback = (marker: string, col: number, row: number) => void
export type MarkDeadCallback = (col: number, row: number) => void
export type HelperLineCallback = (col: number, row: number) => void

/** 鼠标 / 触摸落到棋盘上的最小事件面 */
export interface BoardPointerEvent {
  offsetX: number
  offsetY: number
  button?: number
  preventDefault?: () => void
  changedTouches?: Array<{
    clientX: number
    clientY: number
    offsetX?: number
    offsetY?: number
  }>
}
