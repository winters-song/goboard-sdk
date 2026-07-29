import GoboardPlayer from './GoboardPlayer'
import { SgfMoveNode } from './SgfTree'

/*
 *
 * AI点评用棋盘逻辑：
 *
 * isUserBranch: 当前在试下中
 * inBranch: 当前在AI分支
 *
 * */
export default class GoboardQuizPlayer extends GoboardPlayer {
  // 玩家是否可操作黑白子：（自动应答题只能操作一方棋子，摆图题操作双方）
  // 主要影响确认落子逻辑
  isBothSides = false

  autoClipBoard = true

  initEvents() {
    this.cb.onPlay((color, col, row) => {
      //创建节点
      const node = new SgfMoveNode(col, row, color)
      node.parent = this.currentNode

      if (
        this.cb.options.playConfirm &&
        (this.isBothSides || (!this.isBothSides && this.cb.currentColor === this.whoFirst))
      ) {
        const d = this.prePlayData
        // 确认落子
        if (!!d && d.col === col && d.row === row && d.color === color) {
          this.prePlayData = null
          this.cb.hideHelperLine()
        } else {
          this.cb.showHelperLine(col, row)
          this.prePlayData = { node, col, row, color }
          this.emit('prePlay')
          return
        }

        // this.cb.showHelperLine(col, row)
        // this.prePlayData = {node, col, row, color};
        // return
      }
      //有棋子的地方不能落子，否则步数出问题
      if (!this.go.canPlay(col, row, color)) {
        return
      }
      /**
       *  不在分支上，用户落子，进入分支
       */
      this.currentNode.children = [node]

      this.currentNode = node

      this.currentStep += 1

      this.move(node)

      this.onMove()
    })

    this.cb.onUpdateHelperLine((col, row) => {
      if (this.prePlayData) {
        this.prePlayData.node.col = col
        this.prePlayData.node.row = row
        this.prePlayData.col = col
        this.prePlayData.row = row
      }
    })

    // 课堂标记
    this.cb.onMark(this.onMark)
  }

  afterAddStones(stones) {
    if (!this.autoClipBoard) {
      return
    }
    if (stones && stones.length && this.boardSize > 9) {
      this.clipBoard(stones)
    } else {
      this.cb!.el!.style.left = '0px'
      this.cb!.el!.style.top = '0px'
    }
  }

  // 显示局部棋盘（根据sgf棋子分布区域裁剪）
  clipBoard(stones) {
    //计算棋盘显示边界
    const s1 = stones[0]
    let top = s1.row,
      bottom = s1.row,
      left = s1.col,
      right = s1.col

    // 计算用户答案的棋盘显示边界
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i]
      // 暂不判断 pass
      const key = s.col + ',' + s.row

      if (s.row < top) {
        top = s.row
      }
      if (s.row > bottom) {
        bottom = s.row
      }
      if (s.col < left) {
        left = s.col
      }
      if (s.col > right) {
        right = s.col
      }
    }

    this.setViewBox(top, bottom, left, right)
  }

  /*
   * 棋盘需要放大多少倍？
   * 棋盘如何平移达到剪切效果？
   * 如何平移回中心位置？
   * */
  setViewBox(top, bottom, left, right) {
    const cb = this.cb as any

    // 当前棋谱取值范围（棋子+标记+答案）外扩路数
    const offset = 4
    const width = cb.options.WIDTH
    //
    const unitNum = this.boardSize - 1

    //get bound columns & rows
    top = top - offset < 0 ? 0 : top - offset
    bottom = bottom + offset > unitNum ? unitNum : bottom + offset
    left = left - offset < 0 ? 0 : left - offset
    right = right + offset > unitNum ? unitNum : right + offset

    // cb.el.style.transform = 'scale(1.8) translate(-230px,200px)'

    // debugger;
    // cb.paper.canvas.style.transform = 'scale(2) translate(-490px,490px)'

    const unit = cb.options.UNIT_LENGTH
    //get bound positions
    // originX（文字区 + 棋盘边缘）宽度, offsetX (dom实际宽度到 棋盘预设宽度640的偏移量)
    const bound_left = left * unit + cb.originX //+ cb.offsetX;
    const bound_top = top * unit + cb.originY //+ cb.offsetY;
    const bound_right = right * unit + cb.originX //+ cb.offsetX;
    const bound_bottom = bottom * unit + cb.originX //+ cb.offsetX;

    if (left === 0 && top === 0 && right === unitNum && bottom === unitNum) {
      // 默认展示全部棋盘
      return
    }

    let offsetX = 0,
      offsetY = 0
    // 棋盘裁剪不可以两侧都做裁剪，只支持八个方向裁剪：上、下、左、右、左上、右上、左下、右下
    if ((left === 0) !== (right === unitNum)) {
      // 左边缘需要展示，则裁剪右边缘(向右平移)
      if (left === 0) {
        offsetX = width - bound_right
      } else {
        offsetX = -bound_left
      }
    }
    if ((top === 0) !== (bottom === unitNum)) {
      if (top === 0) {
        offsetY = width - bound_bottom
      } else {
        offsetY = -bound_top
      }
    }

    let scale = 1
    // 按裁剪最小方向计算放大比例
    if (Math.abs(offsetX) > Math.abs(offsetY)) {
      scale = width / (width - Math.abs(offsetY))
    } else {
      scale = width / (width - Math.abs(offsetX))
    }

    if (scale > 1.2) {
      scale -= 0.2
    }
    const ratio = cb.width / cb.options.WIDTH
    offsetX *= ratio / scale
    offsetY *= ratio / scale
    cb.el.parentElement!.classList.add('clipped')

    cb.paper.canvas.parentElement!.style.transform = `scale(${scale}) translate(${offsetX}px,${offsetY}px)`

    cb.el.style.left = `${-offsetX / 2}px`
    cb.el.style.top = `${-offsetY / 2}px`
  }
}
