/** Headless core: rules + SGF only (no Raphael / Goboard view). */
export { Go, Color, Str, mergeSet, removeSet } from './go/Go'
export { SgfTree, SgfNode, SgfMoveNode, SgfProperty, AutoPlayStatus } from './go/SgfTree'
export type { AutoPlayResult, AutoPlayStatusCode } from './go/SgfTree'
