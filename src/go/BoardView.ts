import type { BoardPoint, ShowOrderMode, StoneColor } from './goboard/types'

/** Required board methods shared by SVG Goboard and headless adapters. */
export interface BoardViewCore {
  options: {
    boardSize: number
    readonly: boolean
    playConfirm?: boolean
    showOrder?: ShowOrderMode
    showCoordinates?: boolean
    showHelperLines?: boolean
    sound?: boolean

    [key: string]: any
  }

  clientColor: StoneColor
  currentColor: StoneColor
  whoFirst: StoneColor
  branch: boolean
  branchStep: number
  addedStoneNum?: number
  trace: string[]

  markers: Record<string, any>

  onPlayCb?: (color: number, col: number, row: number) => void

  onPlay(cb: (color: number, col: number, row: number) => void): this
  onMark?(cb: (mark: string, col: number, row: number) => void): this
  onUpdateHelperLine?(cb: (col: number, row: number) => void): this

  add(color: number, col: number, row: number, silent: boolean): boolean
  addPiece(
    key: string,
    col: number,
    row: number,
    color: number,
    order?: number,
    isRecover?: boolean,
  ): void
  eat(vertexes: BoardPoint[]): void
  removePiece(key: string): void
  recoverPiece(col: number, row: number, color: number): void

  showHead(): void
  hideHead(): void
  clearBoard(): void
  setClientColor(c: number): void
  setCurrentColor(c?: number): void
  setReadonly?(b: boolean): void
  oppositeColor(c: number): number

  showHelperLine?(col: number, row: number): void
  hideHelperLine?(): void
  showLastOrder?(): void
  showOrder?(): void
  updateDummyColor?(): void
  clearMarkers?(): void
  drawMarker?(mark: string, col: number, row: number): void
  changeTheme?(settings: unknown): void
  destroy?(): void
}

/**
 * Board surface for GoboardPlayer.
 * Intersection keeps a documented core while allowing Raphael-only fields.
 */

export type BoardView = BoardViewCore & Record<string, any>

export type CreateBoardFactory = (cfg: Record<string, unknown>) => BoardView
