import type { RaphaelElement, RaphaelPaper, RaphaelSet } from 'raphael'
import blackImgDefault from '../assets/img/black.png'
import whiteImgDefault from '../assets/img/white.png'
import {
  getStoneColor as getStoneColorName,
  go2ph as go2phCoord,
  makeVertex as makeVertexStr,
  oppositeColor as oppositeColorValue,
  parsePlay as parsePlayStr,
  parseVertex as parseVertexStr,
  ph2go as ph2goCoord,
} from './goboard/coords'
import { BoardRenderer } from './goboard/BoardRenderer'
import { DEFAULT_OPTIONS } from './goboard/defaults'
import { Interaction } from './goboard/Interaction'
import { MarkerLayer } from './goboard/MarkerLayer'
import { StoneLayer } from './goboard/StoneLayer'
import { TerritoryLayer } from './goboard/TerritoryLayer'
import type {
  BoardPoint,
  BoardPointerEvent,
  BoardStatus,
  ClickStatus,
  GoboardConfig,
  GoboardOptions,
  HelperLineCallback,
  MarkCallback,
  MarkDeadCallback,
  PieceMap,
  PlayCallback,
  RaphaelNodeMap,
  BoardTextMap,
  ShowOrderMode,
  StoneColor,
  StoneColorMap,
  TextAttrs,
  TerritoryGroup,
  TerritoryVertex,
} from './goboard/types'

class Goboard {
  // —— layers ——
  readonly stones: StoneLayer
  readonly renderer: BoardRenderer
  readonly interaction: Interaction
  readonly markerLayer: MarkerLayer
  readonly territory: TerritoryLayer

  // —— options / DOM ——
  options: GoboardOptions
  el: HTMLDivElement
  blackImg: string
  whiteImg: string

  // —— Raphael nodes ——
  paper?: RaphaelPaper
  dummy?: RaphaelElement
  markerDummy?: RaphaelElement
  head?: RaphaelElement
  drawCache?: RaphaelSet
  boardMesh?: RaphaelElement
  helperLineX?: RaphaelElement
  helperLineY?: RaphaelElement
  helperLineCircle?: RaphaelElement
  helperLineDummy?: RaphaelElement
  helperLineMark?: RaphaelElement
  lastStepText?: RaphaelElement

  // —— board geometry ——
  width = 0
  height = 0
  offsetX = 0
  offsetY = 0
  originX = 0
  originY = 0
  REAL_UNIT_LENGTH = 0
  centerX = 0
  centerY = 0
  real_originX = 0
  real_originY = 0
  boundX1 = 0
  boundX2 = 0
  boundY1 = 0
  boundY2 = 0
  helperLinePos: [number, number] = [0, 0]

  // —— stone / mark state maps（key: "col,row"） ——
  pieces: PieceMap = {}
  orders: RaphaelNodeMap = {}
  branchOrders: RaphaelNodeMap = {}
  coordinates: BoardTextMap = {}
  places: RaphaelNodeMap = {}
  markers: RaphaelNodeMap = {}
  branchMarkers: RaphaelNodeMap = {}

  /** 历史踪迹，"列,行,色" 或带 added 标记 */
  trace: string[] = []
  addedStoneNum = 0

  // —— turn / branch ——
  currentColor: StoneColor = 1
  clientColor: StoneColor = 1
  whoFirst: StoneColor = 1
  myTurn = true
  branch = false
  branchStep = 0

  // —— interaction ——
  initialized = false
  resizeLock = false
  resizeTimer = 0
  boardStatus: BoardStatus = 0
  clickStatus: ClickStatus = ''
  currentMarker = ''
  helperShowed = false
  moveCounter = 0
  intersects = false
  mouse = { x: 0, y: 0 }
  mouse_co: BoardPoint = { col: 0, row: 0 }

  onUpdateHelperLineCb: HelperLineCallback = () => {}
  onMarkCb: MarkCallback = () => {}
  onMarkDeadCb: MarkDeadCallback = () => {}
  onPlayCb: PlayCallback = () => {}

  constructor(cfg: GoboardConfig) {
    const { el, blackImg, whiteImg, style, sizeSettings, ...optionOverrides } = cfg

    this.el = el
    this.options = {
      ...DEFAULT_OPTIONS,
      ...optionOverrides,
      style: { ...DEFAULT_OPTIONS.style, ...style },
      sizeSettings: sizeSettings
        ? { ...DEFAULT_OPTIONS.sizeSettings, ...sizeSettings }
        : { ...DEFAULT_OPTIONS.sizeSettings },
    }

    this.blackImg = blackImg || blackImgDefault
    this.whiteImg = whiteImg || whiteImgDefault

    this.clientColor = this.options.clientColor || 1
    this.whoFirst = this.options.whoFirst

    this.stones = new StoneLayer(this)
    this.renderer = new BoardRenderer(this)
    this.interaction = new Interaction(this)
    this.markerLayer = new MarkerLayer(this)
    this.territory = new TerritoryLayer(this)
    this.init()
  }

  init() {
    this.initPaper()
    this.initPosition()
    this.initParams()
    this.initChessBoard()
    this.initPieces()
    this.scheduleInitCoordinates()

    if (this.options.showHelperLines) {
      this.createHelperLines()
    }
    this.initEvents()
    this.setReadonly(this.options.readonly)
  }

  initPaper() {
    return this.renderer.initPaper()
  }

  initPosition() {
    return this.renderer.initPosition()
  }

  initParams() {
    return this.renderer.initParams()
  }

  initChessBoard() {
    return this.renderer.initChessBoard()
  }

  clearDrawCache() {
    return this.renderer.clearDrawCache()
  }

  initPieces() {
    this.stones.initPieces()
  }

  getHeadPath() {
    return this.stones.getHeadPath()
  }

  getHelperMarkPath() {
    return this.renderer.getHelperMarkPath()
  }

  /** 坐标省略 I（易歧义），纵坐标从下至上 */
  initCoordinates() {
    return this.renderer.initCoordinates()
  }

  scheduleInitCoordinates() {
    return this.renderer.scheduleInitCoordinates()
  }

  cancelScheduledCoordinates() {
    return this.renderer.cancelScheduledCoordinates()
  }

  createHelperLines() {
    return this.renderer.createHelperLines()
  }

  updateHelperLines(col: number, row: number) {
    return this.renderer.updateHelperLines(col, row)
  }

  getHelperLinePos(col: number, row: number) {
    return this.renderer.getHelperLinePos(col, row)
  }

  moveHelperLine(x: number, y: number) {
    return this.renderer.moveHelperLine(x, y)
  }

  createText(x: number, y: number, text: string, cfg: TextAttrs) {
    return this.renderer.createText(x, y, text, cfg)
  }

  setCoordinateColor(color: number) {
    return this.renderer.setCoordinateColor(color)
  }

  getStoneColor(color: StoneColor) {
    return getStoneColorName(color)
  }

  setImageByColor(el: RaphaelElement, color: StoneColor) {
    el.attr({
      src: color === 1 ? this.blackImg : this.whiteImg,
    })
  }

  updateDummyColor() {
    this.stones.updateDummyColor()
  }

  /** 交替落子时切换虚影颜色 */
  setDummyColor(color: StoneColor) {
    this.stones.setDummyColor(color)
  }

  initEvents() {
    return this.interaction.initEvents()
  }

  onResize() {
    return this.interaction.onResize()
  }

  checkIntersection(e: BoardPointerEvent) {
    return this.interaction.checkIntersection(e)
  }

  shoot() {
    return this.interaction.shoot()
  }

  markDead() {
    return this.interaction.markDead()
  }

  onMark(cb: MarkCallback) {
    return this.interaction.onMark(cb)
  }

  onPlay(cb: PlayCallback) {
    return this.interaction.onPlay(cb)
  }

  onMarkDead(cb: MarkDeadCallback) {
    return this.interaction.onMarkDead(cb)
  }

  onUpdateHelperLine(cb: HelperLineCallback) {
    return this.interaction.onUpdateHelperLine(cb)
  }

  /** 画布坐标 → 围棋列行 */
  ph2go(x: number, y: number) {
    return ph2goCoord(x, y, this.options.UNIT_LENGTH)
  }

  /** 围棋列行 → 画布坐标 */
  go2ph(col: number, row: number) {
    return go2phCoord(col, row, {
      UNIT_LENGTH: this.options.UNIT_LENGTH,
      originX: this.originX,
      originY: this.originY,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    })
  }

  parsePlay(p: string) {
    return parsePlayStr(p)
  }

  parseVertex(vertex: string) {
    return parseVertexStr(vertex)
  }

  makeVertex(col: number, row: number) {
    return makeVertexStr(col, row)
  }

  oppositeColor(color: StoneColor) {
    return oppositeColorValue(color)
  }

  isReadonly() {
    return this.options.readonly
  }

  showHelperLine(col: number, row: number) {
    return this.renderer.showHelperLine(col, row)
  }

  hideHelperLine() {
    return this.renderer.hideHelperLine()
  }

  onMouseDown(_e: BoardPointerEvent) {
    return this.interaction.onMouseDown(_e)
  }

  onTouchStart(_e: BoardPointerEvent) {
    return this.interaction.onTouchStart(_e)
  }

  onMouseUp(e: BoardPointerEvent) {
    return this.interaction.onMouseUp(e)
  }

  onTouchEnd(e: BoardPointerEvent) {
    return this.interaction.onTouchEnd(e)
  }

  getScale(node: HTMLElement | null, current: number): number {
    return this.interaction.getScale(node, current)
  }

  onMouseMove(e: BoardPointerEvent) {
    return this.interaction.onMouseMove(e)
  }

  onTouchMove(_e: BoardPointerEvent) {
    return this.interaction.onTouchMove(_e)
  }

  setReadonly(readonly: boolean) {
    return this.interaction.setReadonly(readonly)
  }

  onPlayStone(e: BoardPointerEvent) {
    return this.interaction.onPlayStone(e)
  }

  add(color: StoneColor, col: number, row: number, silent: boolean) {
    return this.stones.add(color, col, row, silent)
  }

  addPiece(
    key: string,
    col: number,
    row: number,
    color: StoneColor,
    order?: number,
    isRecover?: boolean,
  ) {
    return this.stones.addPiece(key, col, row, color, order, isRecover)
  }

  addText(col: number, row: number, text: string | number, options: TextAttrs = {}) {
    return this.stones.addText(col, row, text, options)
  }

  removePiece(key: string) {
    return this.stones.removePiece(key)
  }

  recoverPiece(col: number, row: number, color: StoneColor) {
    return this.stones.recoverPiece(col, row, color)
  }

  showHead() {
    return this.stones.showHead()
  }

  hideHead() {
    return this.stones.hideHead()
  }

  /**
   * history: ['0,3,0','13,3,1']
   * stones: 仍在盘面的子 {"col,row": color}
   */
  load(history: string[], stones?: StoneColorMap) {
    return this.stones.load(history, stones)
  }

  showOrder() {
    return this.stones.showOrder()
  }

  getLastMove() {
    return this.stones.getLastMove()
  }

  showLastOrder() {
    return this.stones.showLastOrder()
  }

  hideOrder() {
    return this.stones.hideOrder()
  }

  showCoordinates() {
    return this.renderer.showCoordinates()
  }

  hideCoordinates() {
    return this.renderer.hideCoordinates()
  }

  removeAllPieces() {
    return this.stones.removeAllPieces()
  }

  rebuildPieces(stones?: StoneColorMap) {
    return this.stones.rebuildPieces(stones)
  }

  getPiece(col: number, row: number) {
    return this.stones.getPiece(col, row)
  }

  getStepPiece(step: number) {
    return this.stones.getStepPiece(step)
  }

  goTo(n: number) {
    return this.stones.goTo(n)
  }

  /** 让棋 */
  changeColor() {
    return this.stones.changeColor()
  }

  setClientColor(val: StoneColor) {
    return this.stones.setClientColor(val)
  }

  setCurrentColor(val?: StoneColor) {
    return this.stones.setCurrentColor(val)
  }

  currentSteps() {
    return this.stones.currentSteps()
  }

  eat(vertexes: BoardPoint[]) {
    return this.stones.eat(vertexes)
  }

  computeCurrentColor() {
    return this.stones.computeCurrentColor()
  }

  recoverOrder() {
    return this.stones.recoverOrder()
  }

  clearBoard() {
    return this.stones.clearBoard()
  }

  remove(vertexes: BoardPoint[]) {
    return this.stones.remove(vertexes)
  }

  startDrawMarker() {
    return this.markerLayer.startDrawMarker()
  }

  endDrawMarker() {
    return this.markerLayer.endDrawMarker()
  }

  clearMarkers() {
    return this.markerLayer.clearMarkers()
  }

  getNextMarker() {
    return this.markerLayer.getNextMarker()
  }

  getMarkers() {
    return this.markerLayer.getMarkers()
  }

  startMarkerDummy(text?: string) {
    return this.markerLayer.startMarkerDummy(text)
  }

  updateMarkerDummy(marker: string) {
    return this.markerLayer.updateMarkerDummy(marker)
  }

  endMarkerDummy() {
    return this.markerLayer.endMarkerDummy()
  }

  drawMarker(mark: string, col: number, row: number) {
    return this.markerLayer.drawMarker(mark, col, row)
  }

  removeMarker(col: number, row: number) {
    return this.markerLayer.removeMarker(col, row)
  }

  clearBranchMarkers() {
    return this.markerLayer.clearBranchMarkers()
  }

  renderBranchMarkers(list: BoardPoint[]) {
    return this.markerLayer.renderBranchMarkers(list)
  }

  drawBranchMarker(mark: string, col: number, row: number) {
    return this.markerLayer.drawBranchMarker(mark, col, row)
  }

  clearTerritoryMarkers() {
    return this.territory.clearTerritoryMarkers()
  }

  markTerritories(territories: TerritoryGroup[]) {
    return this.territory.markTerritories(territories)
  }

  startMarkDead(territories: TerritoryGroup[]) {
    return this.territory.startMarkDead(territories)
  }

  endMarkDead() {
    return this.territory.endMarkDead()
  }

  setMarkDead(enabled: boolean) {
    return this.territory.setMarkDead(enabled)
  }

  drawTerritories(arr: number[], skipStone?: boolean, threshold?: number) {
    return this.territory.drawTerritories(arr, skipStone, threshold)
  }

  drawPlaces(color: StoneColor, vertexes: TerritoryVertex[]) {
    return this.territory.drawPlaces(color, vertexes)
  }

  addPlace(key: string, col: number, row: number, color: StoneColor, opacity?: number) {
    return this.territory.addPlace(key, col, row, color, opacity)
  }

  destroy() {
    this.cancelScheduledCoordinates()
    this.renderer.clearCoordinatesGroup()
    this.interaction.destroyEvents()

    if (this.paper) {
      this.paper.remove()
      this.paper = undefined
    }

    this.dummy = undefined
    this.markerDummy = undefined
    this.head = undefined
    this.drawCache = undefined
    this.boardMesh = undefined
    this.helperLineX = undefined
    this.helperLineY = undefined
    this.helperLineCircle = undefined
    this.helperLineDummy = undefined
    this.helperLineMark = undefined
    this.lastStepText = undefined

    this.pieces = {}
    this.orders = {}
    this.branchOrders = {}
    this.coordinates = {}
    this.places = {}
    this.markers = {}
    this.branchMarkers = {}
    this.trace = []

    this.onUpdateHelperLineCb = () => {}
    this.onMarkCb = () => {}
    this.onMarkDeadCb = () => {}
    this.onPlayCb = () => {}

    if (this.el) {
      this.el.innerHTML = ''
    }
  }

  changeTheme(settings: Partial<GoboardOptions>) {
    return this.renderer.changeTheme(settings)
  }
}

export type { GoboardConfig, GoboardOptions, ShowOrderMode, StoneColor }
export default Goboard
