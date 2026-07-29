import Goboard from './go/Goboard'
import GoboardPlayer from './go/GoboardPlayer'

// SVG default: full entry wires Raphael board factory for Players.
GoboardPlayer.defaultCreateBoardFactory = (cfg) => new Goboard(cfg as any) as any

export { Go, Color, Str, mergeSet, removeSet } from './go/Go'
export { SgfTree, SgfNode, SgfMoveNode, SgfProperty, AutoPlayStatus } from './go/SgfTree'
export type { AutoPlayResult, AutoPlayStatusCode } from './go/SgfTree'
export { default as Goboard } from './go/Goboard'
export type {
  BoardPoint,
  BoardStyle,
  GoboardConfig,
  GoboardOptions,
  ShowOrderMode,
  SizeSetting,
  StoneColor,
  TerritoryGroup,
} from './go/goboard/types'
export type { BoardView, CreateBoardFactory } from './go/BoardView'
export { default as GoboardPlayer } from './go/GoboardPlayer'
export { playBoardSound } from './go/GoboardPlayer'
export { default as GoboardPlayerTiny } from './go/GoboardPlayerTiny'
export { default as GoboardGamePlayer } from './go/GoboardGamePlayer'
export { default as GoboardQuizPlayer } from './go/GoboardQuizPlayer'
export { default as GoboardBranchPlayer } from './go/GoboardBranchPlayer'
export { default as GoboardAnalysisPlayer } from './go/GoboardAnalysisPlayer'
export { default as GoboardMultigoPlayer } from './go/GoboardMultigoPlayer'
export type { IAiTopMoves, IAiTopMovesPoint } from './go/GoboardAnalysisPlayer'
export { default as Audio } from './Audio/Audio'
