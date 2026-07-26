import type { RaphaelPaper } from 'raphael'

export interface IBall {
  x: number
  y: number
  r: number
  color: number
  shadow: boolean
  blackImg: string
  whiteImg: string
}

/** 棋子绘制 */
export function ball(paper: RaphaelPaper, props: IBall) {
  const { x, y, r, color, shadow, blackImg, whiteImg } = props
  const img = color === 1 ? blackImg : whiteImg

  if (shadow) {
    return paper.set(
      paper.circle(x, y + r / 8, r).attr({ fill: '#000', stroke: 'none', opacity: 0.2 }),
      paper.image(img, x - r, y - r, 2 * r, 2 * r),
    )
  } else {
    const el = paper.image(img, x - r, y - r, 2 * r, 2 * r)
    // 记录当前棋子颜色
    // @ts-ignore
    el.attrs.color = color
    return el
  }
}
