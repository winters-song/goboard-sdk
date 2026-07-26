import type { RaphaelPaper } from 'raphael'
import { STATES } from './constants'
import type { GoLayout } from './coords'
import { go2ph } from './coords'
import type {
  BoardStatus,
  GoboardOptions,
  PieceMap,
  RaphaelNodeMap,
  StoneColor,
  TerritoryGroup,
  TerritoryVertex,
} from './types'

/** Territory / 死子标记所需的棋盘宿主最小接口 */
export interface TerritoryHost {
  options: GoboardOptions
  paper?: RaphaelPaper
  places: RaphaelNodeMap
  pieces: PieceMap
  boardStatus: BoardStatus
  originX: number
  originY: number
  offsetX: number
  offsetY: number
  hideOrder(): void
  recoverOrder(): void
}

function placeFill(color: StoneColor) {
  if (color === 1) {
    return 'black'
  }
  if (color === 2) {
    return 'white'
  }
  return 'red'
}

function pieceColor(piece: PieceMap[string]): number | undefined {
  // @ts-expect-error raphael runtime attrs used by no-shadow stones
  return piece?.attrs?.color
}

export class TerritoryLayer {
  constructor(private readonly board: TerritoryHost) {}

  clearTerritoryMarkers() {
    const b = this.board
    for (const k in b.places) {
      b.places[k].remove()
    }
    b.places = {}
  }

  markTerritories(territories: TerritoryGroup[]) {
    for (let i = 0; i < territories.length; i++) {
      this.drawPlaces(territories[i].Color, territories[i].Moyos)
    }
  }

  startMarkDead(territories: TerritoryGroup[]) {
    const b = this.board
    b.boardStatus = STATES.MARK_DEAD
    this.setMarkDead(true)
    this.markTerritories(territories)
    b.hideOrder()
  }

  endMarkDead() {
    const b = this.board
    b.boardStatus = STATES.DEFAULT
    this.setMarkDead(false)
    b.recoverOrder()
  }

  setMarkDead(enabled: boolean) {
    if (!enabled) {
      this.clearTerritoryMarkers()
    }
  }

  drawTerritories(arr: number[], skipStone: boolean = false, threshold: number = 0.6) {
    const b = this.board
    for (let i = 0; i < b.options.boardSize; i++) {
      for (let j = 0; j < b.options.boardSize; j++) {
        const key = `${j},${i}`
        const index = j + i * b.options.boardSize
        const color = arr[index] >= 0 ? 1 : 2
        const weight = Math.abs(arr[index])
        if (weight < threshold) {
          continue
        }
        const stoneColor = b.pieces[key] ? pieceColor(b.pieces[key]) : undefined
        if (
          skipStone &&
          stoneColor !== undefined &&
          ((arr[index] > 0 && stoneColor === 1) || (arr[index] < 0 && stoneColor === 2))
        ) {
          continue
        }
        this.addPlace(key, j, i, color, weight)
      }
    }
  }

  drawPlaces(color: StoneColor, vertexes: TerritoryVertex[]) {
    for (let i = 0; i < vertexes.length; i++) {
      const key = vertexes[i].Col + ',' + vertexes[i].Row
      this.addPlace(key, vertexes[i].Col, vertexes[i].Row, color)
    }
  }

  addPlace(key: string, col: number, row: number, color: StoneColor, opacity?: number) {
    const b = this.board
    const co = go2ph(col, row, this.layout())
    const offset = b.options.PLACE_WIDTH / 2

    const el = b.paper
      ?.rect(co[0] - offset, co[1] - offset, b.options.PLACE_WIDTH, b.options.PLACE_WIDTH)
      .attr({
        fill: placeFill(color),
        opacity: opacity === undefined ? 0.7 : opacity,
      })
    if (el) {
      b.places[key] = el
    }
  }

  private layout(): GoLayout {
    const b = this.board
    return {
      UNIT_LENGTH: b.options.UNIT_LENGTH,
      originX: b.originX,
      originY: b.originY,
      offsetX: b.offsetX,
      offsetY: b.offsetY,
    }
  }
}
