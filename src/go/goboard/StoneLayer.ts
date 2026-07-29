import type { RaphaelElement, RaphaelPaper } from 'raphael'
import { STATES, markerColor } from './constants'
import { getStoneColor, go2ph, oppositeColor, parsePlay, parseVertex } from './coords'
import { ball } from './stone'
import type {
  BoardPoint,
  BoardStatus,
  GoboardOptions,
  PieceMap,
  RaphaelNodeMap,
  StoneColor,
  StoneColorMap,
  TextAttrs,
} from './types'

/** 棋子层所需的棋盘宿主最小接口 */
export interface StoneHost {
  options: GoboardOptions
  paper?: RaphaelPaper
  pieces: PieceMap
  orders: RaphaelNodeMap
  branchOrders: RaphaelNodeMap
  trace: string[]
  branch: boolean
  branchStep: number
  addedStoneNum: number
  blackImg: string
  whiteImg: string
  head?: RaphaelElement
  dummy?: RaphaelElement
  lastStepText?: RaphaelElement
  currentColor: StoneColor
  clientColor: StoneColor
  whoFirst: StoneColor
  myTurn: boolean
  boardStatus: BoardStatus
  helperLineDummy?: RaphaelElement
  helperLineMark?: RaphaelElement
  originX: number
  originY: number
  offsetX: number
  offsetY: number
  isReadonly(): boolean
  setImageByColor(el: RaphaelElement, color: StoneColor): void
}

export class StoneLayer {
  constructor(private readonly board: StoneHost) {}

  initPieces() {
    const b = this.board
    b.dummy = b.paper?.circle(0, 0, b.options.PIECE_RADIUS * 0.95).attr({
      fill: 'black',
      stroke: 'none',
      opacity: b.options.stoneOpacity,
    })

    const path = this.getHeadPath()
    b.head = b.paper?.path(path).attr({ fill: 'white', stroke: 'none' }).hide()
  }

  getHeadPath() {
    const r = this.board.options.PIECE_RADIUS
    return ['M' + r + ' ' + r, 'L' + r * 2 + ' ' + r, 'L' + r + ' ' + r * 2, 'Z'].join('')
  }

  updateDummyColor() {
    const b = this.board
    b.myTurn = b.currentColor === b.clientColor

    if (b.myTurn) {
      this.setDummyColor(b.currentColor)
    }
  }

  /** 落黑子，白子，交替落子切换时，手动改变虚影颜色 */
  setDummyColor(color: number) {
    const b = this.board
    const c = getStoneColor(color)

    b.dummy?.attr({
      fill: c,
    })

    if (b.options.showHelperLines && b.helperLineDummy) {
      b.setImageByColor(b.helperLineDummy, color)

      b.helperLineMark?.attr({
        fill: color === 1 ? '#fff' : '#000',
      })
    }
  }

  add(color: StoneColor, col: number, row: number, silent: boolean) {
    const b = this.board
    const key = col + ',' + row

    //push to history
    b.trace.push(`${key},${color}`)

    if (col > b.options.boardSize || row > b.options.boardSize) {
      return false
    }
    if (b.pieces[key]) {
      return false
    }
    // not pass
    if (19 !== col && 19 !== row) {
      this.addPiece(key, col, row, color)

      if (!silent) {
        // 最后一手棋标志
        this.showHead()
      }
    }

    b.currentColor = oppositeColor(color)

    if (!b.isReadonly()) {
      this.updateDummyColor()
    }
    return true
  }

  addPiece(
    key: string,
    col: number,
    row: number,
    color: StoneColor,
    order?: number,
    isRecover?: boolean,
  ) {
    const b = this.board
    const co = this.go2ph(col, row)
    if (!b.paper) {
      return
    }

    b.pieces[key] = ball(b.paper, {
      x: co[0] + b.options.style.stoneOffsetX,
      y: co[1] + b.options.style.stoneOffsetY,
      r: b.options.PIECE_RADIUS,
      color,
      shadow: b.options.stoneShadow,
      blackImg: b.blackImg,
      whiteImg: b.whiteImg,
    })

    //puzzle
    if (order && order < 0) {
      return
    }
    //主线手数
    const orderMain = order ? order : b.trace.length - b.addedStoneNum

    if (orderMain <= 0) {
      return
    }

    const stepText = this.addText(co[0], co[1], orderMain, {
      fill: color === 1 ? '#fff' : '#000',
    })
    if (!stepText) {
      return
    }

    b.orders[key] = stepText

    //分支或者不显示手数时，隐藏手数
    if (!b.options.showOrder || b.branch) {
      stepText.hide()
    }
    //显示最后一手，隐藏上一个手数
    if (b.options.showOrder === 'last' && !b.branch) {
      b.lastStepText && b.lastStepText.hide()
      // 上一步时，添加吃掉的子，这些子不展示手数
      if (isRecover) {
        stepText.hide()
      } else {
        b.lastStepText = stepText.show()
      }
    }

    //分支手数
    if (b.branch) {
      if (order) {
        order -= b.branchStep
      } else {
        order = b.trace.length - b.branchStep
      }

      if (order < 1) {
        return
      }

      const branchText = this.addText(co[0], co[1], order, {
        fill: color === 1 ? '#fff' : '#000',
      })
      if (branchText) {
        b.branchOrders[key] = branchText
      }
    }
  }

  // 棋子上文本不需要点击事件
  addText(col: number, row: number, text: string | number, options: TextAttrs = {}) {
    const b = this.board
    if (!b.paper) {
      return undefined
    }
    const attrs: TextAttrs = {
      'font-size': options['font-size'] ?? options.fontSize ?? b.options.fontSize,
      ...options,
    }

    const paperText = b.paper
      .text(col, row, String(text))
      .attr(attrs as Partial<import('raphael').RaphaelAttributes>)
    const node = paperText.node as SVGElement | undefined
    if (node?.style) {
      node.style.pointerEvents = 'none'
    }
    return paperText
  }

  removePiece(key: string) {
    const b = this.board
    if (b.pieces[key]) {
      b.pieces[key].remove()
      delete b.pieces[key]
    }

    if (b.orders[key]) {
      b.orders[key].remove()
      delete b.orders[key]
    }

    if (b.branchOrders[key]) {
      b.branchOrders[key].remove()
      delete b.branchOrders[key]
    }
  }

  //puzzle: add color
  recoverPiece(col: number, row: number, color: StoneColor) {
    const b = this.board
    //校验，复原的棋子是否在历史中存在，通过倒序查找获得被吃子的序号
    let m, key, i

    for (i = b.trace.length - 1; i >= 0; i--) {
      // indexOf '15,1' -> '15,18','15,17'...
      // indexOf '15,1,' -> '15,1,'
      if (0 === b.trace[i].indexOf(col + ',' + row + ',')) {
        m = b.trace[i]
        break
      }
    }

    if (!m) {
      //puzzle
      key = col + ',' + row
      this.removePiece(key)
      this.addPiece(key, col, row, color, -1)
    } else {
      const parts = m.split(',')
      color = parseInt(parts[2])
      key = parts[0] + ',' + parts[1]

      this.removePiece(key)
      this.addPiece(key, col, row, color, i + 1 - b.addedStoneNum, true)
    }
  }

  showHead() {
    const b = this.board
    const lastMove = this.getLastMove()

    if (!b.head) {
      return
    }

    // 当前是落子，非pass时展示三角
    if (lastMove && lastMove.vertex !== '19,19') {
      const goCo = parseVertex(lastMove.vertex)
      const phCo = this.go2ph(goCo.col, goCo.row)

      //将Head标识放于图层最上方
      b.paper?.canvas.appendChild(b.head.node)

      const color = lastMove.color
      let headColor, x, y

      //显示手数时
      if (b.options.showOrder || b.branch) {
        //黑-红，白-蓝
        if (color === 1) {
          headColor = markerColor
        } else {
          headColor = 'blue'
        }

        x = phCo[0] - b.options.PIECE_RADIUS * 2.1
        y = phCo[1] - b.options.PIECE_RADIUS * 2.1
        b.head.transform('t' + x + ',' + y + 's0.7,0.7')
      } else {
        headColor = getStoneColor(oppositeColor(color))

        x = phCo[0] - b.options.PIECE_RADIUS
        y = phCo[1] - b.options.PIECE_RADIUS
        b.head.transform('t' + x + ',' + y)
      }

      b.head.attr('fill', headColor)
      b.head.show()
    } else {
      b.head.hide()
    }
  }

  hideHead() {
    this.board.head?.hide()
  }

  /**
	-1:no piece
	0:black
	1:white
	load go data

	history : ['0,3,0','13,3,1']
	stones :  exists stones ,{"col,row":color}, eg. {"9,3":0,"9,9":0,"15,9":0}
	*/
  load(history: string[], stones?: StoneColorMap) {
    if (!history) {
      return
    }
    this.hideHead()
    this.board.trace = history
    this.removeAllPieces()
    this.rebuildPieces(stones)

    this.setCurrentColor()
  }

  showOrder() {
    const b = this.board
    if (b.boardStatus === STATES.MARK_DEAD) {
      return
    }
    //分支变化图时不显示手数
    if (b.branch) {
      for (const k in b.branchOrders) {
        b.branchOrders[k].show()
      }
      return
    }

    for (const k in b.orders) {
      b.orders[k].show()
    }
    //更新Head展示
    this.showHead()
  }

  //获取最后落子(用于最后手数展示、棋子标记)
  getLastMove() {
    const b = this.board
    //获取最后一个棋子
    if (!b.trace || b.trace.length <= 0) {
      return
    }
    const last = b.trace.length - 1
    if (last < 0) {
      return
    }

    const lastMove = parsePlay(b.trace[last])

    if (lastMove.vertex === '19,19') {
      if (last < 1) {
        return
      }

      // lastMove = me.parsePlay(me.trace[last - 1]);
    }
    return lastMove
  }

  showLastOrder() {
    const b = this.board
    if (b.boardStatus === STATES.MARK_DEAD) {
      return
    }

    //分支变化图时不显示手数
    if (b.branch) {
      for (const k in b.branchOrders) {
        b.branchOrders[k].show()
      }
      return
    }

    for (const k in b.orders) {
      b.orders[k].hide()
    }

    const lastMove = this.getLastMove()

    if (lastMove) {
      const stepText = b.orders[lastMove.vertex]
      if (stepText) {
        stepText.show()
        b.lastStepText = stepText
      }
    }

    //更新Head展示
    this.showHead()
  }

  hideOrder() {
    const b = this.board
    for (const k in b.orders) {
      b.orders[k].hide()
    }

    if (b.branch) {
      for (const k in b.branchOrders) {
        b.branchOrders[k].hide()
      }
    }

    //更新Head展示
    this.showHead()
  }

  removeAllPieces() {
    const b = this.board
    for (const k in b.pieces) {
      this.removePiece(k)
    }

    b.pieces = {}
    b.orders = {}
    this.hideHead()
  }

  rebuildPieces(stones?: StoneColorMap) {
    const b = this.board
    b.addedStoneNum = 0

    for (let i = 0; i < b.trace.length; i++) {
      const goCo = b.trace[i].split(',')
      //pass
      if ('19' === goCo[0] || '19' === goCo[1]) {
        continue
      }
      const key = goCo[0] + ',' + goCo[1]
      //eat if this position has piece
      this.removePiece(key)

      if (stones && !(key in stones)) {
        continue
      }

      const color = parseInt(goCo[2])
      const isAdded = goCo[3]

      if (isAdded) {
        this.addPiece(key, parseInt(goCo[0]), parseInt(goCo[1]), color, -1)
        b.addedStoneNum++
      } else {
        this.addPiece(key, parseInt(goCo[0]), parseInt(goCo[1]), color, i + 1 - b.addedStoneNum)
      }
    }

    // 最后一手棋标志
    this.showHead()
  }

  getPiece(col: number, row: number) {
    return this.board.pieces[col + ',' + row]
  }

  getStepPiece(step: number) {
    const b = this.board
    if (step >= b.trace.length) {
      return null
    }
    const s = b.trace[step - 1]
    if (!s) {
      return null
    }
    return b.pieces[s.substring(0, s.lastIndexOf(','))]
  }

  goTo(n: number) {
    const b = this.board
    if (n > b.trace.length) {
      return
    }
    const currentTrace = b.trace.slice(0, n)
    const tailTrace = b.trace.slice(n)
    for (let i = 0; i < tailTrace.length; i++) {
      b.pieces[parsePlay(tailTrace[i]).vertex].hide()
    }
    b.trace = currentTrace
  }

  /** 让棋 */
  changeColor() {
    const b = this.board
    if (b.currentColor) {
      b.currentColor = 0
    } else {
      b.currentColor = 1
    }
  }

  setClientColor(val: StoneColor) {
    this.board.clientColor = val
    this.updateDummyColor()
  }

  setCurrentColor(val?: StoneColor) {
    const b = this.board
    if (val) {
      b.currentColor = val
    } else if (b.trace.length) {
      const last = b.trace[b.trace.length - 1]
      const arr = last.split(',')
      // 最后一子是添加的
      if (arr[3] === '1') {
        b.currentColor = b.whoFirst
      } else {
        b.currentColor = arr[2] === '2' ? 1 : 2
      }
    } else {
      b.currentColor = b.whoFirst
    }

    this.updateDummyColor()
  }

  currentSteps() {
    return this.board.trace.length
  }

  /**
   * @param vertexes [{col:1,row:2}]
   */
  eat(vertexes: BoardPoint[]) {
    for (let i = 0; i < vertexes.length; i++) {
      const key = vertexes[i].col + ',' + vertexes[i].row
      this.removePiece(key)
    }
  }

  computeCurrentColor() {
    return this.board.trace.length % 2 === 0 ? 0 : 1
  }

  recoverOrder() {
    const b = this.board
    if (b.options.showOrder === true) {
      this.showOrder()
    } else if (b.options.showOrder === 'last') {
      this.showLastOrder()
    }
  }

  clearBoard() {
    const b = this.board
    this.hideHead()
    for (const k in b.pieces) {
      this.removePiece(k)
    }
    b.pieces = {}
    b.orders = {}
    b.branchOrders = {}
    b.trace = []
  }

  remove(vertexes: BoardPoint[]) {
    const b = this.board
    this.hideHead()
    this.eat(vertexes)
    b.trace = b.trace.slice(0, b.trace.length - vertexes.length)
    this.showHead()
  }

  private go2ph(col: number, row: number) {
    const b = this.board
    return go2ph(col, row, {
      UNIT_LENGTH: b.options.UNIT_LENGTH,
      originX: b.originX,
      originY: b.originY,
      offsetX: b.offsetX,
      offsetY: b.offsetY,
    })
  }
}
