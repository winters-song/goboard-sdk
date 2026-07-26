import Raphael, { type RaphaelAttributes, RaphaelElement, RaphaelPaper, RaphaelSet } from 'raphael'
import { HOSHI } from './constants'
import type { GoboardOptions, HelperLineCallback, RaphaelNodeMap, TextAttrs } from './types'

/** 棋盘渲染层所需的棋盘宿主最小接口 */
export interface BoardRendererHost {
  el: HTMLDivElement
  options: GoboardOptions
  paper?: RaphaelPaper
  drawCache?: RaphaelSet
  boardMesh?: RaphaelElement
  coordinates: RaphaelNodeMap
  blackImg: string
  whiteImg: string
  width: number
  height: number
  offsetX: number
  offsetY: number
  originX: number
  originY: number
  REAL_UNIT_LENGTH: number
  centerX: number
  centerY: number
  real_originX: number
  real_originY: number
  boundX1: number
  boundX2: number
  boundY1: number
  boundY2: number
  helperLinePos: [number, number] | number[]
  helperLineX?: RaphaelElement
  helperLineY?: RaphaelElement
  helperLineCircle?: RaphaelElement
  helperLineDummy?: RaphaelElement
  helperLineMark?: RaphaelElement
  helperShowed: boolean
  dummy?: RaphaelElement
  head?: RaphaelElement
  onUpdateHelperLineCb: HelperLineCallback
  initPieces(): void
}

export class BoardRenderer {
  constructor(private readonly board: BoardRendererHost) {}

  initPaper() {
    const b = this.board
    // 配置棋盘路数相关设置
    const size = b.options.boardSize
    Object.assign(b.options, b.options.sizeSettings[size])
    // 设置宽高
    b.height = b.width = b.options.WIDTH

    b.el.style.width = String(b.width)
    b.el.style.height = String(b.height)

    b.paper = Raphael(b.el, b.width, b.height)
    b.paper.setViewBox(0, 0, b.options.WIDTH, b.options.WIDTH)
    // @ts-ignore
    b.paper.setSize('100%', '100%')
  }

  initPosition() {
    const b = this.board
    if (!b.el.parentNode) {
      return
    }
    b.width = (b.el.parentNode as HTMLElement).clientWidth
    b.height = (b.el.parentNode as HTMLElement).clientHeight

    // 中心到边界格数
    const grids = (b.options.boardSize - 1) / 2
    //（文字区 + 棋盘边缘）宽度
    b.originX = b.options.WIDTH / 2 - grids * b.options.UNIT_LENGTH
    b.originY = b.options.WIDTH / 2 - grids * b.options.UNIT_LENGTH

    const width = b.options.WIDTH
    let ratio

    //fit height
    if (b.width >= b.height) {
      b.width = b.height
      ratio = width / b.height
      b.offsetX = (b.width - width) / 2 - ((b.width - b.height) / 2) * ratio
      b.offsetY = -(width - b.height) / 2
    } else {
      b.height = b.width
      ratio = width / b.width
      b.offsetX = -(width - b.width) / 2
      b.offsetY = (b.height - width) / 2 - ((b.width - b.height) / 2) * ratio
    }

    b.el.style.width = b.width + 'px'
    b.el.style.height = b.height + 'px'

    const dw = b.width * ratio
    const dh = b.height * ratio
    b.paper?.setViewBox(b.offsetX, b.offsetY, dw, dh)
  }

  initParams() {
    const b = this.board
    const ratio = b.width / b.options.WIDTH
    // 中心到边界格数
    const grids = (b.options.boardSize - 1) / 2
    const half = (b.options.BOARD_WIDTH * ratio) / 2

    b.REAL_UNIT_LENGTH = b.options.UNIT_LENGTH * ratio
    b.centerX = b.width / 2
    b.centerY = b.height / 2
    //real_origin: 实际(0,0)点坐标
    b.real_originX = b.centerX - grids * b.REAL_UNIT_LENGTH
    b.real_originY = b.centerY - grids * b.REAL_UNIT_LENGTH

    b.boundX1 = b.centerX - half
    b.boundX2 = b.centerX + half
    b.boundY1 = b.centerY - half
    b.boundY2 = b.centerY + half
  }

  // 使用棋盘图片或绘制棋盘
  initChessBoard() {
    const b = this.board
    if (!b.paper) {
      return
    }
    const width = b.options.BOARD_WIDTH
    const x = b.centerX - width / 2
    const y = b.centerY - width / 2

    // 带线棋盘图
    if (b.options.useBoardImg) {
      b.boardMesh = b.paper.image(b.options.boardImg, x, y, width, width)
    } else {
      const {
        lineColor,
        borderColor,
        bgColor,
        kid,
        borderWidth = 5,
        lineWidth = 2,
        outerLineWidth = 2,
      } = b.options.style

      if (b.drawCache) {
        this.clearDrawCache()
      }
      b.drawCache = b.paper.set()

      // 背景图
      if (b.options.svgBoardImg) {
        b.boardMesh = b.paper.image(b.options.svgBoardImg, x, y, width, width)
      } else {
        // 背景色
        b.boardMesh = b.paper.rect(x, y, width, width, width / 20)
        // @ts-ignore
        b.boardMesh?.attr({
          fill: kid ? lineColor : bgColor,
          stroke: borderColor,
          'stroke-width': `${borderWidth}px`,
        })
      }
      if (b.boardMesh) {
        b.drawCache?.push(b.boardMesh)
      }

      // 1线
      const x0 = b.originX + b.offsetX
      const y0 = b.originY + b.offsetY
      const innerWidth = b.options.UNIT_LENGTH * (b.options.boardSize - 1)
      const border = b.paper.rect(x0, y0, innerWidth, innerWidth).attr({
        stroke: lineColor || borderColor,
        'stroke-width': outerLineWidth,
        fill: kid ? bgColor : 'none',
      })

      if (border) {
        b.drawCache?.push(border)
      }

      for (let i = 1; i < b.options.boardSize - 1; i++) {
        const pos = this.getHelperLinePos(i, i)
        const lineX = b.paper.path(pos[0]).attr({
          stroke: lineColor || borderColor,
          'stroke-width': lineWidth,
        })
        const lineY = b.paper.path(pos[1]).attr({
          stroke: lineColor || borderColor,
          'stroke-width': lineWidth,
        })
        b.drawCache?.push(lineX)
        b.drawCache?.push(lineY)
      }

      // 星位
      const hoshi = HOSHI[b.options.boardSize]
      if (hoshi) {
        for (let i = 0; i < hoshi.length; i++) {
          const hx = hoshi[i][0] * b.options.UNIT_LENGTH + b.offsetX + b.originX
          const hy = hoshi[i][1] * b.options.UNIT_LENGTH + b.offsetY + b.originY
          const dot = b.paper.circle(hx, hy, 5).attr({
            fill: lineColor || borderColor,
            'stroke-width': 0,
          })
          b.drawCache.push(dot)
        }
      }

      b.drawCache.toBack()
      border.toBack()
      b.boardMesh.toBack()
    }
  }

  clearDrawCache() {
    if (this.board.drawCache) {
      this.board.drawCache.remove()
    }
  }

  getHelperMarkPath() {
    const r = this.board.options.PIECE_RADIUS

    // 1.73/2 = 0.86
    return [
      'M' + r + ' ' + r * 0.2,
      'L' + Math.floor(r * 1.78) + ' ' + Math.floor(r * 1.5),
      'L' + Math.floor(r * (1 - 0.78)) + ' ' + Math.floor(r * 1.5),
      'Z',
    ].join('')
  }

  /**
   *  坐标省略I(容易歧义), 纵坐标从下至上
   */
  initCoordinates() {
    const b = this.board
    let alpha
    if (b.options.boardSize === 9) {
      alpha = 'ABCDEFGHJ'
    } else if (b.options.boardSize === 13) {
      alpha = 'ABCDEFGHJKLMN'
    } else {
      alpha = 'ABCDEFGHJKLMNOPQRST'
    }

    //坐标文本上下左右基线坐标
    // 坐标到棋盘距离
    const distance = b.options.coordinateDistance
    const colYT = b.centerY - b.options.BOARD_WIDTH / 2 - distance
    const colYB = b.centerY + b.options.BOARD_WIDTH / 2 + distance
    const colXL = b.centerX - b.options.BOARD_WIDTH / 2 - distance
    const colXR = b.centerX + b.options.BOARD_WIDTH / 2 + distance

    const cfg = {
      'font-size': b.options.fontSize,
      'font-weight': 400,
      'font-family': 'Arial',
      fill: b.options.coordinateColor,
    }

    let text

    for (let i = 0; i < b.options.boardSize; i++) {
      const x = (i - Math.floor(b.options.boardSize / 2)) * b.options.UNIT_LENGTH + b.centerX

      text = this.createText(x, colYT, alpha[i], cfg)
      b.coordinates['ct' + i] = text

      text.node.setAttribute('class', 'coordinate-text top')

      text = this.createText(x, colYB, alpha[i], cfg)
      b.coordinates['cb' + i] = text
      text.node.setAttribute('class', 'coordinate-text bottom')

      const y = (i - Math.floor(b.options.boardSize / 2)) * b.options.UNIT_LENGTH + b.centerY

      text = this.createText(colXL, y, (b.options.boardSize - i).toString(), cfg)
      b.coordinates['rl' + i] = text
      text.node.setAttribute('class', 'coordinate-text left')

      text = this.createText(colXR, y, (b.options.boardSize - i).toString(), cfg)
      b.coordinates['rr' + i] = text
      text.node.setAttribute('class', 'coordinate-text right')
    }
  }

  /** 创建辅助线 */
  createHelperLines() {
    const b = this.board
    const col = Math.floor(b.options.boardSize / 2)
    const row = col

    b.helperLinePos = [col, row]
    const pos = this.getHelperLinePos(col, row)

    const cfg = {
      stroke: b.options.style.helperLineColor,
      'stroke-width': 3,
    }

    b.helperLineX = b.paper?.path(pos[0]).attr(cfg).hide()
    b.helperLineY = b.paper?.path(pos[1]).attr(cfg).hide()

    const r = b.options.PIECE_RADIUS
    const x = b.originX - r
    const y = b.originY - r

    b.helperLineCircle = b.paper
      ?.circle(0, 0, b.options.PIECE_RADIUS)
      .attr({
        stroke: b.options.style.helperLineColor,
        'stroke-width': 4,
        opacity: 0.3,
      })
      .hide()

    b.helperLineDummy = b.paper
      ?.image(
        b.blackImg,
        x + b.options.style.stoneOffsetX,
        y + b.options.style.stoneOffsetY,
        2 * r,
        2 * r,
      )
      .hide()
      .attr({})

    const path = this.getHelperMarkPath()
    b.helperLineMark = b.paper?.path(path).attr({ fill: 'white', stroke: 'none' })

    b.helperLineMark?.transform('t' + x + ',' + y)
  }

  updateHelperLines(col: number, row: number) {
    const b = this.board
    b.helperLinePos = [col, row]
    const pos = this.getHelperLinePos(col, row)

    const x = col * b.options.UNIT_LENGTH + b.originX + b.offsetX
    const y = row * b.options.UNIT_LENGTH + b.originY + b.offsetY
    b.helperLineCircle?.attr({ cx: x, cy: y })
    b.helperLineDummy?.attr({
      x: x - b.options.PIECE_RADIUS + b.options.style.stoneOffsetX,
      y: y - b.options.PIECE_RADIUS + b.options.style.stoneOffsetY,
    })
    b.helperLineMark?.transform(
      't' + (x - b.options.PIECE_RADIUS) + ',' + (y - b.options.PIECE_RADIUS) + 's0.7,0.7',
    )

    b.helperLineX?.attr('path', pos[0])
    b.helperLineY?.attr('path', pos[1])
  }

  getHelperLinePos(col: number, row: number) {
    const b = this.board
    const x0 = b.originX + b.offsetX
    const y0 = b.originY + b.offsetY
    const len = (b.options.boardSize - 1) * b.options.UNIT_LENGTH
    const w = x0 + len
    const h = y0 + len

    const x = col * b.options.UNIT_LENGTH + x0
    const y = row * b.options.UNIT_LENGTH + y0

    const StrX = ['M' + x + ' ' + y0, 'L' + x + ' ' + h].join('')
    const StrY = ['M' + x0 + ' ' + y, 'L' + w + ' ' + y].join('')

    return [StrX, StrY]
  }

  moveHelperLine(x: number, y: number) {
    const b = this.board
    const col = b.helperLinePos[0] + x
    const row = b.helperLinePos[1] + y
    const size = b.options.boardSize
    if (col >= 0 && col < size && row >= 0 && row < size) {
      this.updateHelperLines(col, row)
      b.onUpdateHelperLineCb.call(b, col, row)
    }
  }

  createText(x: number, y: number, text: string, cfg: TextAttrs) {
    const b = this.board
    const node = b.paper?.text(x, y, text).attr(cfg as Partial<RaphaelAttributes>)

    if (!b.options.showCoordinates) {
      node?.hide()
    }
    return node
  }

  setCoordinateColor(color: number) {
    const b = this.board
    for (let i = 0; i < b.options.boardSize; i++) {
      b.coordinates['c' + i].attr('fill', color.toString())
      b.coordinates['r' + i].attr('fill', color.toString())
    }
  }

  showCoordinates() {
    const b = this.board
    b.options.showCoordinates = true
    for (const k in b.coordinates) {
      b.coordinates[k].show()
    }
  }

  hideCoordinates() {
    const b = this.board
    b.options.showCoordinates = false
    for (const k in b.coordinates) {
      b.coordinates[k].hide()
    }
  }

  /** 自动应答题，辅助线 */
  showHelperLine(col: number, row: number) {
    const b = this.board
    if (b.options.readonly) {
      return
    }
    if (b.options.showHelperLines) {
      this.updateHelperLines(col, row)
      b.helperLineX?.show()
      b.helperLineY?.show()
      b.helperLineCircle?.show()
      b.helperLineDummy?.show()
      b.helperLineMark?.show()

      b.helperShowed = true
    }
  }

  hideHelperLine() {
    const b = this.board
    b.helperLineX?.hide()
    b.helperLineY?.hide()
    b.helperLineDummy?.hide()
    b.helperLineMark?.hide()
    b.helperLineCircle?.hide()
  }

  changeTheme(settings: Partial<GoboardOptions>) {
    const b = this.board
    // 坐标校准
    Object.assign(b.options, settings)
    const size = b.options.boardSize
    Object.assign(b.options, b.options.sizeSettings[size])

    this.initParams()
    this.initPosition()
    this.initChessBoard()

    // head三角和虚拟棋子尺寸变化，需要重新生成
    b.dummy?.remove()
    b.head?.remove()

    b.initPieces()
  }
}
