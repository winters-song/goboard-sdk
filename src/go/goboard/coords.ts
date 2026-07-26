export interface GoLayout {
  UNIT_LENGTH: number
  originX: number
  originY: number
  offsetX: number
  offsetY: number
}

/** 画布坐标 → 围棋列行 */
export function ph2go(x: number, y: number, unitLength: number): [number, number] {
  const col = x / unitLength + 9
  const row = y / unitLength + 9
  return [col, row]
}

/** 围棋列行 → 画布坐标 */
export function go2ph(col: number, row: number, layout: GoLayout): [number, number] {
  const x = col * layout.UNIT_LENGTH + layout.originX + layout.offsetX
  const y = row * layout.UNIT_LENGTH + layout.originY + layout.offsetY
  return [x, y]
}

export function parsePlay(p: string) {
  return {
    vertex: p.substring(0, p.lastIndexOf(',')),
    color: parseInt(p.substring(p.lastIndexOf(',') + 1)),
  }
}

export function parseVertex(vertex: string) {
  const c = vertex.split(',')
  return { col: parseInt(c[0]), row: parseInt(c[1]) }
}

export function makeVertex(col: number, row: number) {
  return col + ',' + row
}

export function oppositeColor(color: number) {
  if (1 === color) {
    return 2
  }
  return 1
}

export function getStoneColor(color: number) {
  return color === 2 ? 'white' : 'black'
}
