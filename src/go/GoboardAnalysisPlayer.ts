import GoboardPlayer from './GoboardPlayer'
import { SgfMoveNode, SgfNode, SgfTree } from './SgfTree'

enum ANALYSIS_STEP {
  NONE, // 初始状态
  BEST_LOC, // 最佳落子点
  BEST_LOC_NEXT, // 最佳落子点应对手（5种）
  BRANCH, // 某一应对手分支
}

export interface IAiTopMovesPoint {
  row: number
  col: number
  gtpMoveString: string
}
export interface IAiTopMoves {
  bestMove: string
  point: IAiTopMovesPoint
  bestWinRate: number
  currentMove: string
  currentColor: string
  currentStep: number
  currentWinRate: number
  opponentRes: {
    move: string
    point: IAiTopMovesPoint
    winRate: number
    order: number
    color: string
    variations: {
      move: string
      point: IAiTopMovesPoint
      player: string
      step: number
    }[]
  }[]
}
/*
 *
 * AI点评用棋盘逻辑：
 *
 * isUserBranch: 当前在试下中
 * inBranch: 当前在AI分支
 *
 * */
export default class GoboardAnalysisPlayer extends GoboardPlayer {
  isUserBranch = false

  isBestMove = false

  analysisStep = ANALYSIS_STEP.NONE

  // AI点评“实”手的坐标
  lastMasterKey: string = ''
  // AI点评“实”手原本的手数实例
  lastMasterOrder: any
  // AI点评“实”手的文本实例
  myOrderText: any
  // 红色圆圈
  myPieceCircle: any
  // AI点评“荐”手的文本实例
  suggestOrderText: any
  // AI点评“荐”手的棋子实例
  suggestPiece: any
  //绿色（橙色）圆圈
  suggestPieceCircle: any
  // 进入点评前的主线分支缓存
  masterBranchChildren: any

  suggestMoves: any
  // AI点评最佳落子点应对手的数字实例
  suggestOrderList: any

  bestMoveGradient: any

  aiAnalysisData: IAiTopMoves | null = null

  showOrderCache: any = 0

  initEvents() {
    if (!this.cb) {
      return
    }
    this.cb.onPlay((color: number, col: number, row: number) => {
      //有棋子的地方不能落子，否则步数出问题
      if (!this.go.canPlay(col, row, color)) {
        return
      }

      let node
      const index = this.getBranchIndex(col, row)
      if (index < 0) {
        //创建节点
        node = new SgfMoveNode(col, row, color)
        node.parent = this.currentNode
        //标记该节点为用户试下，backward时候判断此值，避免重复pop()
        node.isUserBranch = true

        // 创建分支
        if (!this.currentNode.children) {
          this.currentNode.children = [node]
        } else {
          this.currentNode.children.push(node)
        }
      } else {
        node = this.currentNode.children[index]
      }

      this.currentNode = node

      // this.currentStep += 1;

      this.move(node)

      this.onMove()
    })

    // 课堂标记
    this.cb.onMark(this.onMark)
  }

  /*
   * 下一步是否存在该分支： 存在时返回分支index， 不存在返回index
   * */
  getBranchIndex(col: number, row: number) {
    const children = this.currentNode.children
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (children.col === col && children.row === row) {
          return i
        }
      }
    }
    return -1
  }

  // 进入试下
  enterUserBranch() {
    if (!this.cb) {
      return
    }

    this.cb.setReadonly(false)
    // 第0步时，需要判断第一手颜色
    if (!this.cb.trace.length && this.whoFirst) {
      this.cb.setCurrentColor(this.whoFirst)
    } else {
      this.cb.setCurrentColor()
    }
    this.cb.setClientColor(this.cb.currentColor)
    this.cb.updateDummyColor()

    //改变棋盘状态
    this.isUserBranch = true
    this.inBranch = true
    this.cb.branch = true
    this.saveUserMaster()
    //存储分支起始位置
    this.cb.branchStep = this.master.branchStep
    this.cb.hideOrder()
  }

  closeUserBranch() {
    if (!this.cb) {
      return
    }

    this.toStart()
    this.isUserBranch = false
    this.inBranch = false
    this.cb.branch = false
    this.cb.setReadonly(true)
    if (this.master.branchNode && this.master.children) {
      this.master.branchNode.children = this.master.children
    }

    this.currentStep = this.master.branchStep
    this.resumeOrder()
  }

  enterAIBranch(index: number) {
    if (!this.cb) {
      return
    }

    // 进入分支前，先返回上一步
    this.backward(true)

    //改变棋盘状态
    this.cb.branch = true
    this.inBranch = true

    this.saveAIMaster(index)
    //存储分支起始位置
    this.cb.branchStep = this.master.branchStep
    this.cb.hideOrder()

    this.currentStep += 1

    const node = this.currentNode.children[index]
    const lastNode = this.currentNode

    this.currentNode = node

    this.move(node)

    this.fastForward(30)

    this.emit('enterBranch', {
      currentNode: this.currentNode,
      lastNode,
    })
  }

  closeAIBranch() {
    if (!this.cb) {
      return
    }

    this.cb.branch = false
    this.inBranch = false

    //恢复分支原主线序号(saveMaster时候为了保持Order正确，step少1)
    this.onJump(this.master.branchStep)
    this.currentStep = this.master.branchStep
    this.forward()

    this.resumeOrder()
  }

  // 保存进入分支前的主线节点
  saveUserMaster() {
    this.master = {
      branchNode: this.currentNode, //用于判定上一步是否到了分支第一步， 如果是第一步，则不可以退到上一步
      branchStep: this.currentStep, //用于退出分支时，恢复原来位置
      children: this.currentNode.children,
    }
    this.currentNode.children = null
  }

  saveAIMaster(index: number) {
    this.master = {
      branchNode: this.currentNode.children[index], //用于判定上一步是否到了分支第一步， 如果是第一步，则不可以退到上一步
      branchStep: this.currentStep, //用于退出分支时，恢复原来位置
    }
  }

  /*
   * 上一步时，如果是试下，并且不是AI分支，删除当前节点。
   * */
  removeBranchNode(node: SgfNode) {
    const index = node.parent?.children?.indexOf(node)
    if (index !== undefined) {
      node.parent?.children?.splice(index, 1)
    }
  }

  toStart() {
    this.fastBackward(1000)
    this.cb?.setCurrentColor()

    if (!this.isUserBranch) {
      this.currentStep = 0
    }
  }

  forward(silent?: boolean) {
    const node = this.getNextNode()
    if (!node) {
      return false
    }

    if (!this.isUserBranch) {
      this.currentStep += 1
    }
    this.currentNode = node

    this.move(node, silent)

    if (!silent) {
      this.onMove()
    }

    return true
  }

  backward(silent?: boolean) {
    if (this.isBranchFirst() || !this.cb) {
      return false
    }

    if (!this.isUserBranch) {
      if (this.currentStep <= 0) {
        return false
      }
      this.currentStep -= 1
    }

    const node = this.currentNode

    if (!(node.col === 19 && node.row === 19)) {
      const moveResult = this.go.undo(1)
      this.cb.trace.pop()
      this.cb.removePiece(node.col + ',' + node.row)

      if (moveResult && moveResult.eated && moveResult.eated.size > 0) {
        moveResult.eated.forEach((move: any) => {
          this.cb?.recoverPiece(move.col, move.row, move.color)
        })
      }
    }

    if (node.isUserBranch) {
      this.removeBranchNode(node)
    }

    if (this.cb.options.showOrder === 'last') {
      this.cb.showLastOrder()
    }

    this.cb.clientColor = node.color
    this.cb.currentColor = node.color

    this.currentNode = this.getPrevNode() || this.root

    if (!silent) {
      if (this.currentNode instanceof SgfMoveNode) {
        this.cb.showHead()
      } else {
        this.cb.hideHead()
      }

      this.cb.updateDummyColor()
      this.onMove()
    }

    return true
  }

  /**
   *  上一步是否可点（已经到了分支第一步）
   */
  isBranchFirst() {
    if (this.isUserBranch) {
      // return this.currentNode == this.master.branchNode;
      if (this.currentNode === this.master.branchNode) {
        return true
      } else {
        return false
      }
    } else if (this.inBranch) {
      return this.currentNode === this.master.branchNode
    } else {
      return false
    }
  }

  /**
   * 创建或获取 SVG 线性渐变定义（用于圆形 stroke）
   * 使用 objectBoundingBox 单位，渐变会自动适配到元素的边界框
   */
  createGradient(): void {
    if (!this.cb?.paper?.canvas || this.bestMoveGradient) {
      return
    }

    const gradientId = 'bestMoveGradient'
    const svg = this.cb.paper.canvas

    // 检查渐变是否已存在
    let defs = svg.querySelector('defs')
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      svg.insertBefore(defs, svg.firstChild)
    }

    // 检查渐变是否已存在
    let gradient = defs.querySelector(`#${gradientId}`) as SVGLinearGradientElement
    if (!gradient) {
      gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
      gradient.setAttribute('id', gradientId)
      // 使用 objectBoundingBox，这样坐标可以用百分比，渐变会自动适配元素边界
      gradient.setAttribute('gradientUnits', 'objectBoundingBox')

      // 设置渐变方向：从左上到右下
      gradient.setAttribute('x1', '0')
      gradient.setAttribute('y1', '0')
      gradient.setAttribute('x2', '1')
      gradient.setAttribute('y2', '1')

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop1.setAttribute('offset', '0%')
      stop1.setAttribute('stop-color', '#3AAFFF')
      gradient.appendChild(stop1)

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop2.setAttribute('offset', '100%')
      stop2.setAttribute('stop-color', '#A85FF5')
      gradient.appendChild(stop2)

      defs.appendChild(gradient)
    }
  }

  /**
   *  胜率图联动，切换手数
   */
  onJump(step: number) {
    // if(this.isUserBranch){
    // 	this.closeUserBranch();
    // }

    const offset = step - this.currentStep

    this.goStep(offset)
  }

  // 预留
  play(value: any) {}

  // 进入AI点评
  enterAiAnalysis(data: IAiTopMoves) {
    this.aiAnalysisData = data

    this.checkDataValid(data)

    this.showBestMove()
  }

  checkDataValid(data: IAiTopMoves) {
    const node = this.currentNode
    if (node.toSgf() === ';' + data.currentMove) {
      return true
    }
    throw new Error('当前手非法，与当前节点不匹配: ' + node.toSgf())
  }

  showBestMove() {
    const node = this.currentNode

    if (!this.cb || !this.aiAnalysisData) {
      return
    }
    this.showOrderCache = this.cb.options.showOrder
    this.cb.options.showOrder = 'last'
    const vertex = SgfTree.nodeStringToVertex(this.aiAnalysisData.bestMove)
    if (!vertex) {
      return
    }
    const { col = 0, row = 0 } = vertex
    this.isBestMove = col === node.col && row === node.row
    const color = node.color

    // 隐藏主线当前手数
    let key = node.col + ',' + node.row
    this.lastMasterKey = key
    const orderText = this.cb.orders[key]
    if (orderText) {
      orderText.hide()
    }
    this.lastMasterOrder = orderText
    // 暂时删除map中的order，避免showLastOrder影响展示
    delete this.cb.orders[key]

    const circleRadius = this.cb.options.PIECE_RADIUS + 1
    const circleStrokeWidth = this.boardSize === 19 ? 3 : 4

    // 添加“荐”
    if (!this.isBestMove) {
      // 添加“实”
      const [x, y] = this.cb?.go2ph(node.col, node.row) || [0, 0]
      this.myOrderText = this.cb?.addText(x, y, '实', {
        fill: color === 1 ? '#fff' : '#000',
      })
      this.myPieceCircle = this.cb?.paper?.circle(x, y, circleRadius).attr({
        stroke: 'red',
        'stroke-width': circleStrokeWidth,
      })
      // console.log(this.cb.);

      // 添加“荐”棋子
      key = col + ',' + row
      this.cb?.addPiece(key, col, row, color, -1)
      this.suggestPiece = this.cb?.pieces[key]
    } else {
      this.suggestPiece = this.cb?.pieces[key]
    }
    const [x, y] = this.cb?.go2ph(col, row) || [0, 0]
    this.suggestOrderText = this.cb?.addText(x, y, this.isBestMove ? '佳' : '荐', {
      fill: color === 1 ? '#fff' : '#000',
    })

    // 如果是最佳手，使用渐变色；否则使用纯色
    // const radius = 16;
    this.suggestPieceCircle = this.cb?.paper?.circle(x, y, circleRadius).attr({
      stroke: this.isBestMove ? 'none' : 'limegreen', // 先设置为 none 或纯色，渐变通过 DOM 设置
      'stroke-width': circleStrokeWidth,
    })

    // 如果是最佳手，通过 DOM 直接设置渐变 stroke（Raphael attr 不支持渐变 URL）
    if (this.isBestMove && this.suggestPieceCircle?.node) {
      this.bestMoveGradient = this.createGradient()
      this.suggestPieceCircle.node.setAttribute('stroke', 'url(#bestMoveGradient)')
    }

    if (this.suggestPiece) {
      this.suggestPiece.attr('cursor', 'pointer')

      // 点击进入推荐手
      const onceHandler = () => {
        console.log('展示推荐手')
        this.suggestPiece.unclick(onceHandler)
        this.enterSuggestMove()
      }
      this.suggestPiece.click(onceHandler)
    }
    this.analysisStep = ANALYSIS_STEP.BEST_LOC

    this.cb.showHead()
  }

  enterSuggestMove() {
    if (!this.cb || !this.aiAnalysisData) {
      return
    }

    const vertex = SgfTree.nodeStringToVertex(this.aiAnalysisData.bestMove)
    if (!vertex) {
      return
    }
    const { col = 0, row = 0 } = vertex
    const color = SgfTree.toInt(this.aiAnalysisData.currentColor)

    if (this.aiAnalysisData.opponentRes.length === 0) {
      const msg = '终局无后续应对及变化'
      console.log(msg)
      this.emit('toast', msg)
      return
    }

    this.suggestMoves = this.aiAnalysisData.opponentRes.map((item) => {
      const vertex = SgfTree.nodeStringToVertex(item.move)
      if (!vertex) {
        return { col: 0, row: 0 }
      }
      const { col = 0, row = 0 } = vertex
      return { col, row }
    })

    // 移除主线最后一手实
    if (!this.isBestMove) {
      this.myOrderText?.remove()
      this.myOrderText = null
      this.myPieceCircle?.remove()
      this.myPieceCircle = null
    }

    const key = col + ',' + row
    this.suggestPiece?.remove()
    this.suggestPiece = null
    this.suggestOrderText?.remove()

    delete this.cb?.pieces[key]
    // 先退一步，再走推荐手
    this.backward(true)
    // 保存当前分支
    this.masterBranchChildren = this.currentNode.children
    // this.currentNode.children = null;

    // 创建新节点（推荐手）
    const node = new SgfMoveNode(col, row, color)
    node.parent = this.currentNode

    this.currentNode.children = [node]
    this.currentNode = node
    this.currentStep += 1
    this.move(node)

    // 让orderText脱离管控，避免showOrder影响
    this.suggestOrderText = this.cb.orders[key]
    this.suggestOrderText.attr({ text: this.isBestMove ? '佳' : '荐' })
    delete this.cb.orders[key]

    this.suggestOrderList = []
    for (let i = 0; i < this.suggestMoves.length; i++) {
      const { col, row } = this.suggestMoves[i]
      if (col === 19 && row === 19) {
        continue
      }
      const key = col + ',' + row
      const index = i
      this.cb.addPiece(key, col, row, 3 - color, -1)
      // 只对棋子不对阴影做透明度调整
      let stone = this.cb.pieces[key]
      if (this.cb.options.stoneShadow) {
        stone = stone[1]
      }
      stone.attr({
        opacity: 1 - i * 0.15,
      })
      this.cb.pieces[key].attr('cursor', 'pointer')

      const [x, y] = this.cb?.go2ph(col, row) || [0, 0]
      this.suggestOrderList[i] = this.cb?.addText(x, y, i + 1, {
        fill: 3 - color === 1 ? '#fff' : '#000',
      })

      // 为moves的每一个棋子实例添加一次性点击事件，点击后打印该棋子的坐标
      const handleClick = (e: any) => {
        console.log('index', index)
        // console.log('棋子坐标:', col, row);
        this.cb?.pieces[key].unclick?.()
        this.enterAnalysisBranch(index)
      }
      this.cb.pieces[key].click(handleClick)
    }

    this.analysisStep = ANALYSIS_STEP.BEST_LOC_NEXT
    this.emit('bestMove')
  }

  getBranchData(item: any) {
    const vertex = SgfTree.nodeStringToVertex(item.move)
    if (!vertex) {
      return []
    }
    const { col = 0, row = 0 } = vertex
    const arr = [
      {
        col,
        row,
        color: SgfTree.toInt(item.color),
      },
    ]

    // 截取pass之前的棋谱
    let variations = item.variations
    let hit = false
    let index = 0
    for (let i = 0; i < variations.length; i++) {
      if (variations[i].move.indexOf('tt') > -1) {
        index = i
        hit = true
        break
      }
    }
    if (hit) {
      variations = variations.slice(0, index)
    }

    variations.forEach((variation: any) => {
      const vertex = SgfTree.nodeStringToVertex(variation.move)
      if (vertex) {
        const { col = 0, row = 0 } = vertex
        arr.push({
          col,
          row,
          color: SgfTree.toInt(variation.player),
        })
      }
    })

    if (arr.length === 1) {
      const msg = '终局无后续变化'
      console.log(msg)
      this.emit('toast', msg)
      return []
    }
    return arr
  }

  enterAnalysisBranch(index: number) {
    if (!this.cb || !this.aiAnalysisData) {
      return
    }

    const item = this.aiAnalysisData.opponentRes[index]
    const arr = this.getBranchData(item)

    this.suggestMoves.forEach((move: any) => {
      if (move.col === 19 && move.row === 19) {
        return
      }
      const key = move.col + ',' + move.row
      if (this.cb) {
        this.cb.pieces[key].remove()
        delete this.cb.pieces[key]
      }
    })
    this.suggestOrderList.forEach((order: any) => {
      order.remove()
    })
    this.suggestOrderList = null

    //改变棋盘状态
    this.cb.branch = true
    this.inBranch = true

    //存储分支起始位置
    this.master.branchNode = this.currentNode
    this.cb.branchStep = this.currentStep
    this.cb.hideOrder()

    for (let i = 0; i < arr.length; i++) {
      const { col, row, color } = arr[i]
      const node = new SgfMoveNode(col, row, color)
      node.parent = this.currentNode
      this.currentNode.children = [node]
      this.currentNode = node
      this.currentStep += 1
      this.move(node)
    }

    this.analysisStep = ANALYSIS_STEP.BRANCH
    this.emit('nextMove', index)
  }

  toggleBranch(index: number) {
    if (!this.cb || !this.aiAnalysisData) {
      return
    }

    const item = this.aiAnalysisData.opponentRes[index]
    const arr = this.getBranchData(item)

    this.fastBackward(1000)
    this.currentNode.children = null
    for (let i = 0; i < arr.length; i++) {
      const { col, row, color } = arr[i]
      const node = new SgfMoveNode(col, row, color)
      node.parent = this.currentNode
      this.currentNode.children = [node]
      this.currentNode = node
      this.currentStep += 1
      this.move(node)
    }
  }

  closeAiAnalysis() {
    if (!this.cb) {
      return
    }
    switch (this.analysisStep) {
      case ANALYSIS_STEP.BEST_LOC:
        this.suggestPieceCircle?.remove()
        this.suggestPieceCircle = null
        this.myPieceCircle?.remove()
        this.myPieceCircle = null
        this.myOrderText?.remove()
        this.myOrderText = null
        if (!this.isBestMove) {
          this.suggestPiece?.remove()
          this.suggestPiece = null
        }

        this.cb.orders[this.lastMasterKey] = this.lastMasterOrder
        if (this.cb.options.showOrder === 'last') {
          this.cb.showLastOrder()
        }

        if (this.isBestMove) {
          // 移除点击事件
          this.cb.pieces[this.lastMasterKey]?.unclick()
        }
        this.lastMasterKey = ''
        break
      case ANALYSIS_STEP.BEST_LOC_NEXT:
        this.suggestPieceCircle?.remove()
        this.suggestPieceCircle = null

        this.suggestMoves.forEach((move: any) => {
          if (move.col === 19 && move.row === 19) {
            return
          }
          const key = move.col + ',' + move.row
          if (this.cb) {
            this.cb.pieces[key].remove()
            delete this.cb.pieces[key]
          }
        })
        this.suggestOrderList.forEach((order: any) => {
          order.remove()
        })
        this.suggestOrderList = null
        this.suggestMoves = null

        this.backward(true)
        this.currentNode.children = this.masterBranchChildren
        this.masterBranchChildren = null
        this.forward()
        break
      case ANALYSIS_STEP.BRANCH:
        this.suggestPieceCircle?.remove()
        this.suggestPieceCircle = null

        this.fastBackward(1000)
        this.cb.branch = false
        this.inBranch = false
        this.master = {}
        this.backward(true)
        this.currentNode.children = this.masterBranchChildren
        this.masterBranchChildren = null
        this.forward()
        break
    }
    this.suggestOrderText?.remove()
    this.suggestOrderText = null

    this.analysisStep = ANALYSIS_STEP.NONE
    this.cb.options.showOrder = this.showOrderCache
    if (!this.cb.options.showOrder) {
      this.cb.hideOrder()
    }
    this.cb.showHead()
  }
}
