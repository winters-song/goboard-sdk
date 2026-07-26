import type { RaphaelElement, RaphaelPaper } from 'raphael'
import { BoardEvents, STATES } from './constants'
import type {
  BoardPoint,
  BoardPointerEvent,
  BoardStatus,
  ClickStatus,
  GoboardOptions,
  HelperLineCallback,
  MarkCallback,
  MarkDeadCallback,
  PlayCallback,
  StoneColor,
} from './types'

/** 交互层所需的棋盘宿主最小接口 */
export interface InteractionHost {
  el: HTMLDivElement
  options: GoboardOptions
  paper?: RaphaelPaper
  dummy?: RaphaelElement
  markerDummy?: RaphaelElement
  initialized: boolean
  resizeLock: boolean
  resizeTimer: number
  width: number
  height: number
  helperShowed: boolean
  clickStatus: ClickStatus
  currentMarker: string
  currentColor: StoneColor
  clientColor: StoneColor
  myTurn: boolean
  boardStatus: BoardStatus
  moveCounter: number
  intersects: boolean
  mouse: { x: number; y: number }
  mouse_co: BoardPoint
  boundX1: number
  boundX2: number
  boundY1: number
  boundY2: number
  real_originX: number
  real_originY: number
  REAL_UNIT_LENGTH: number
  originX: number
  originY: number
  offsetX: number
  offsetY: number
  onUpdateHelperLineCb: HelperLineCallback
  onMarkCb: MarkCallback
  onMarkDeadCb: MarkDeadCallback
  onPlayCb: PlayCallback
  initParams(): void
  add(color: StoneColor, col: number, row: number, silent: boolean): boolean
  setCurrentColor(val?: StoneColor): void
  onMouseDown(e: BoardPointerEvent): void
  onMouseUp(e: BoardPointerEvent): void
  onMouseMove(e: BoardPointerEvent): void
  onTouchStart(e: BoardPointerEvent): void
  onTouchEnd(e: BoardPointerEvent): void
  onTouchMove(e: BoardPointerEvent): void
  onResize(): void
}

export class Interaction {
  private mouseLeaveHandler?: EventListener
  private resizeHandler?: EventListener

  constructor(private readonly board: InteractionHost) {}

  initEvents() {
    const b = this.board
    if (b.initialized) {
      return
    }
    b.initialized = true

    BoardEvents.forEach((item) => {
      const host = b as unknown as Record<string, (...args: unknown[]) => void>
      const handler = host[item.name].bind(b)
      host[item.handler] = handler
      b.paper?.canvas.addEventListener(item.key, handler as EventListener)
    })

    this.mouseLeaveHandler = () => {
      if (b.dummy && !b.helperShowed) {
        b.dummy.hide()
      }
    }
    b.paper?.canvas.addEventListener('mouseleave', this.mouseLeaveHandler)

    if (b.options.resizable) {
      this.resizeHandler = b.onResize.bind(b) as EventListener
      window.addEventListener('resize', this.resizeHandler)
    }

    this.onPlay((_color, col, row) => {
      if (col >= 0 && col < b.options.boardSize && row >= 0 && row < b.options.boardSize) {
        b.add(1, col, row, false)
        b.setCurrentColor(1)
      }
    })
  }

  /** 解绑画布 / window 事件，避免 destroy 后泄漏 */
  destroyEvents() {
    const b = this.board
    const canvas = b.paper?.canvas

    if (canvas) {
      BoardEvents.forEach((item) => {
        const host = b as unknown as Record<string, EventListener | undefined>
        const handler = host[item.handler]
        if (handler) {
          canvas.removeEventListener(item.key, handler)
          delete host[item.handler]
        }
      })

      if (this.mouseLeaveHandler) {
        canvas.removeEventListener('mouseleave', this.mouseLeaveHandler)
        this.mouseLeaveHandler = undefined
      }
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = undefined
    }

    if (b.resizeTimer) {
      window.clearTimeout(b.resizeTimer)
      b.resizeTimer = 0
    }

    b.initialized = false
  }

  onResize() {
    const b = this.board
    if (b.resizeLock) {
      return
    }

    b.resizeTimer && window.clearTimeout(b.resizeTimer)

    b.resizeTimer = window.setTimeout(() => {
      const parent = b.el.parentNode as HTMLElement | null
      if (!parent) {
        return
      }
      b.width = parent.clientWidth * b.options.zoom
      b.height = parent.clientHeight * b.options.zoom

      if (b.width > b.height) {
        b.width = b.height
      } else {
        b.height = b.width
      }
      b.el.style.width = b.width + 'px'
      b.el.style.height = b.width + 'px'

      b.initParams()
    }, 200)
  }

  checkIntersection(e: BoardPointerEvent) {
    const b = this.board
    b.mouse.x = e.offsetX
    b.mouse.y = e.offsetY

    let dummy: RaphaelElement | undefined

    switch (b.clickStatus) {
      case 'marker':
        dummy = b.markerDummy
        break
      default:
        dummy = b.dummy
        break
    }

    if (
      b.mouse.x > b.boundX1 &&
      b.mouse.x < b.boundX2 &&
      b.mouse.y > b.boundY1 &&
      b.mouse.y < b.boundY2
    ) {
      const col = Math.round((b.mouse.x - b.real_originX) / b.REAL_UNIT_LENGTH)
      const row = Math.round((b.mouse.y - b.real_originY) / b.REAL_UNIT_LENGTH)

      if (col >= 0 && col < b.options.boardSize && row >= 0 && row < b.options.boardSize) {
        const x = col * b.options.UNIT_LENGTH + b.originX + b.offsetX
        const y = row * b.options.UNIT_LENGTH + b.originY + b.offsetY
        b.mouse_co.col = col
        b.mouse_co.row = row

        switch (b.clickStatus) {
          case 'marker':
            dummy?.attr({ x, y })
            break
          default:
            dummy?.attr({ cx: x, cy: y })
        }

        b.intersects = true
      }

      if (b.myTurn && STATES.MARK_DEAD !== b.boardStatus) {
        dummy?.show()
      } else {
        dummy?.hide()
      }
    } else {
      b.intersects = false
      if (!b.helperShowed) {
        dummy?.hide()
      }
    }
  }

  shoot() {
    const b = this.board
    const { col, row } = b.mouse_co

    if (b.clickStatus === 'marker') {
      b.onMarkCb.call(b, b.currentMarker, col, row)
    } else if (b.clickStatus === 'markdead') {
      b.onMarkDeadCb.call(b, col, row)
    } else {
      b.onPlayCb.call(b, b.currentColor, col, row)
    }
  }

  markDead() {
    const b = this.board
    b.onMarkDeadCb.call(b, b.mouse_co.col, b.mouse_co.row)
  }

  onMark(cb: MarkCallback) {
    this.board.onMarkCb = cb
    return this.board
  }

  onPlay(cb: PlayCallback) {
    this.board.onPlayCb = cb
    return this.board
  }

  onMarkDead(cb: MarkDeadCallback) {
    this.board.onMarkDeadCb = cb
    return this.board
  }

  onUpdateHelperLine(cb: HelperLineCallback) {
    this.board.onUpdateHelperLineCb = cb
    return this.board
  }

  onMouseDown(_e: BoardPointerEvent) {}

  onTouchStart(_e: BoardPointerEvent) {}

  onMouseUp(e: BoardPointerEvent) {
    const b = this.board
    if (b.options.readonly || e.button !== 0) {
      return
    }
    this.onPlayStone(e)
  }

  onTouchEnd(e: BoardPointerEvent) {
    const b = this.board
    e.preventDefault?.()
    if (b.options.readonly || !b.paper || !e.changedTouches?.length) {
      return
    }
    const touch = e.changedTouches[0]
    const rect = b.paper.canvas.getBoundingClientRect()
    const scale = this.getScale(b.paper.canvas as unknown as HTMLElement, 1)
    const pointer: BoardPointerEvent = {
      offsetX: (touch.clientX - rect.left) / scale,
      offsetY: (touch.clientY - rect.top) / scale,
    }

    this.onPlayStone(pointer)
  }

  /** 手机端棋盘存在 transform 缩放时递归累计 scale */
  getScale(node: HTMLElement | null, current: number): number {
    if (node?.style?.transform) {
      const reg = node.style.transform.match(/scale\((\S+)\)/)
      if (reg && reg.length >= 2) {
        return this.getScale(node.parentElement, Number(reg[1]) * current)
      }
    } else if (node?.getAttribute('scale')) {
      return this.getScale(node.parentElement, Number(node.getAttribute('scale')) * current)
    } else if (node?.parentElement) {
      return this.getScale(node.parentElement, current)
    }
    return current
  }

  onMouseMove(e: BoardPointerEvent) {
    const b = this.board
    if (b.options.readonly) {
      return
    }
    if (!b.moveCounter) {
      this.checkIntersection(e)
    } else {
      b.moveCounter++
      if (b.moveCounter > 10) {
        b.moveCounter = 0
      }
    }
  }

  onTouchMove(_e: BoardPointerEvent) {}

  setReadonly(readonly: boolean) {
    const b = this.board
    b.options.readonly = readonly

    if (readonly) {
      b.dummy?.hide()
    } else {
      b.helperShowed = false
    }
  }

  onPlayStone(e: BoardPointerEvent) {
    const b = this.board
    this.checkIntersection(e)

    if (b.clientColor !== b.currentColor) {
      return
    }

    if (b.intersects) {
      this.shoot()
    }
  }
}
