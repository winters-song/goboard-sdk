import type { RaphaelElement, RaphaelPaper } from 'raphael'
import { markerColor } from './constants'
import type { GoLayout } from './coords'
import { go2ph } from './coords'
import type { ClickStatus, GoboardOptions, RaphaelNodeMap } from './types'

/** Marker 层所需的棋盘宿主最小接口 */
export interface MarkerHost {
  options: GoboardOptions
  paper?: RaphaelPaper
  markers: RaphaelNodeMap
  branchMarkers: RaphaelNodeMap
  clickStatus: ClickStatus
  currentMarker: string
  markerDummy?: RaphaelElement
  dummy?: RaphaelElement
  originX: number
  originY: number
  offsetX: number
  offsetY: number
}

export class MarkerLayer {
  constructor(private readonly board: MarkerHost) {}

  startDrawMarker() {
    const b = this.board
    b.clickStatus = 'marker'
    this.startMarkerDummy()
  }

  endDrawMarker() {
    const b = this.board
    b.clickStatus = ''
    b.currentMarker = ''
    this.endMarkerDummy()
  }

  clearMarkers() {
    const b = this.board
    for (const k in b.markers) {
      b.markers[k].remove()
    }
    b.markers = {}

    b.currentMarker = ''
    this.getNextMarker()
    this.updateMarkerDummy(b.currentMarker)
  }

  /** 查询现有 marker，给出接下来的字母标记 */
  getNextMarker() {
    const b = this.board
    if (!b.currentMarker) {
      b.currentMarker = 'A'
    } else {
      let max = ''

      for (const i in b.markers) {
        const mark = String(b.markers[i].attr('text') ?? '')
        if (mark > max && mark < 'Z') {
          max = mark
        }
      }
      if (!max) {
        b.currentMarker = 'A'
        return
      }
      const code = max.charCodeAt(0)
      b.currentMarker = String.fromCharCode(code + 1)
    }
  }

  getMarkers() {
    const b = this.board
    const list: string[] = []
    for (const k in b.markers) {
      const text = String(b.markers[k].attr('text') ?? '')
      // 不考虑三角等特殊标记
      if (text >= 'A' && text <= 'Z') {
        list.push(text)
      }
    }
    return list
  }

  startMarkerDummy(text?: string) {
    const b = this.board
    if (!text) {
      this.getNextMarker()
    }

    b.dummy?.hide()
    this.updateMarkerDummy(text || b.currentMarker)
  }

  updateMarkerDummy(marker: string) {
    const b = this.board
    if (b.markerDummy) {
      b.markerDummy.remove()
    }

    if (!marker) {
      return
    }

    b.markerDummy = b.paper?.text(0, 0, marker).attr({
      'font-size': b.options.markerSize,
      'font-weight': 'bold',
      fill: markerColor,
      opacity: 0.5,
    })

    b.markerDummy?.hide()
  }

  endMarkerDummy() {
    this.board.markerDummy?.hide()
  }

  drawMarker(mark: string, col: number, row: number) {
    const b = this.board
    const key = col + ',' + row

    if (col > b.options.boardSize || row > b.options.boardSize) {
      return
    }

    if (b.markers[key]) {
      b.markers[key].remove()
      delete b.markers[key]
    }

    const co = go2ph(col, row, this.layout())
    const el = b.paper?.text(co[0], co[1], mark).attr({
      'font-size': b.options.markerSize,
      'font-weight': 'bold',
      fill: markerColor,
    })
    if (el) {
      b.markers[key] = el
    }
  }

  removeMarker(col: number, row: number) {
    const b = this.board
    const key = col + ',' + row

    if (b.markers[key]) {
      b.markers[key].remove()
      delete b.markers[key]
    }
  }

  clearBranchMarkers() {
    const b = this.board
    for (const k in b.branchMarkers) {
      b.branchMarkers[k].remove()
    }
    b.branchMarkers = {}
  }

  renderBranchMarkers(list: { col: number; row: number }[]) {
    let index = 65
    list.forEach((item) => this.drawBranchMarker(String.fromCharCode(index++), item.col, item.row))
  }

  drawBranchMarker(mark: string, col: number, row: number) {
    const b = this.board
    const key = col + ',' + row

    if (col > b.options.boardSize || row > b.options.boardSize) {
      return
    }

    const co = go2ph(col, row, this.layout())
    const el = b.paper?.text(co[0], co[1], mark).attr({
      'font-size': b.options.markerSize,
      fill: 'blue',
    })
    if (el) {
      b.branchMarkers[key] = el
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
