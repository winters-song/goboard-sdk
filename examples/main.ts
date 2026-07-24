import {
  GoboardBranchPlayer,
  SgfTree,
} from 'goboard-sdk'

const el = document.getElementById('board') as HTMLDivElement
const statusEl = document.getElementById('status') as HTMLDivElement

const EMPTY_SGF = '(;GM[1]FF[4]CA[UTF-8]SZ[19])'

function createPlayer(sgf: string) {
  const sgfTree = new SgfTree(sgf)
  const next = new GoboardBranchPlayer({
    el,
    boardOptions: {
      showCoordinates: true,
      showOrder: true,
      readonly: false,
    },
  })

  next.init(
    {
      sgfTree,
      whoFirst: 1,
      boardSize: 19,
    },
    {
      showCoordinates: true,
      showOrder: true,
      readonly: false,
    },
  )

  next.on('move', () => updateStatus())
  return next
}

let player = createPlayer(EMPTY_SGF)

function updateStatus() {
  statusEl.textContent = [
    `手数: ${player.currentStep} / ${player.totalStep}`,
    `分支: ${player.inBranch ? '是' : '否'}`,
  ].join('\n')
}

updateStatus()

document.getElementById('btn-back')!.onclick = () => {
  player.backward()
  updateStatus()
}
document.getElementById('btn-forward')!.onclick = () => {
  player.forward()
  updateStatus()
}
document.getElementById('btn-start')!.onclick = () => {
  player.toStart()
  updateStatus()
}
document.getElementById('btn-end')!.onclick = () => {
  player.toEnd()
  updateStatus()
}
document.getElementById('btn-reset')!.onclick = () => {
  el.innerHTML = ''
  player = createPlayer(EMPTY_SGF)
  updateStatus()
}
