export const BoardEvents = [
  { key: 'mousedown', name: 'onMouseDown', handler: 'mouseDownHandler' },
  { key: 'mouseup', name: 'onMouseUp', handler: 'mouseUpHandler' },
  { key: 'mousemove', name: 'onMouseMove', handler: 'mouseMoveHandler' },
  { key: 'touchend', name: 'onTouchEnd', handler: 'touchEndHandler' },
]

export const STATES = {
  DEFAULT: 0,
  MARKER: 1,
  MARK_DEAD: 2,
}

/** 星位坐标 */
export const HOSHI: Record<number, number[][]> = {
  9: [
    [2, 2],
    [2, 6],
    [6, 2],
    [6, 6],
  ],
  13: [
    [3, 3],
    [3, 9],
    [6, 6],
    [9, 3],
    [9, 9],
  ],
  19: [
    [3, 3],
    [3, 9],
    [3, 15],
    [9, 3],
    [9, 9],
    [9, 15],
    [15, 3],
    [15, 9],
    [15, 15],
  ],
}

export const markerColor = '#ef4136'
