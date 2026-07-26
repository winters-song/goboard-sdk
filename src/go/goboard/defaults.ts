import type { GoboardOptions } from './types'

export const DEFAULT_OPTIONS: GoboardOptions = {
  clientColor: 1,
  whoFirst: 1,
  // aigame, class, history
  type: '',

  WIDTH: 640,
  BOARD_WIDTH: 598,
  PLACE_WIDTH: 10,
  PIECE_RADIUS: 15,
  UNIT_LENGTH: 20,
  stoneOpacity: 0.5,
  boardSize: 19,
  fontSize: 14,
  markerSize: 22,

  readonly: false,
  showOrder: false,
  showCoordinates: false,
  showHelperLines: false,
  playConfirm: false,
  sound: true,
  resizable: true,

  zoom: 1,
  position: 'c',

  boardImg: '',
  useBoardImg: true,
  svgBoardImg: '',
  style: {
    borderColor: '#C6732F',
    lineColor: '#C6732F',
    bgColor: '#F9dd98',
    kid: false,
    borderWidth: 5,
    lineWidth: 2,
    outerLineWidth: 2,
    stoneOffsetX: 0,
    stoneOffsetY: 0,
    helperLineColor: '#FF6827',
  },

  stoneShadow: true,
  coordinateColor: '#fff',
  coordinateDistance: 13,

  sizeSettings: {
    9: {
      PIECE_RADIUS: 30,
      UNIT_LENGTH: 65,
      fontSize: 20,
      markerSize: 30,
    },
    13: {
      PIECE_RADIUS: 20,
      UNIT_LENGTH: 46.4,
      fontSize: 16,
      markerSize: 26,
    },
    19: {
      PIECE_RADIUS: 14,
      UNIT_LENGTH: 31,
      fontSize: 14,
      markerSize: 22,
    },
  },
}
