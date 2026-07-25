import { describe, expect, it, vi, afterEach } from 'vitest'
import { AutoPlayStatus, Color, SgfMoveNode, SgfNode, SgfProperty, SgfTree } from './SgfTree'

const LINEAR_SGF = '(;FF[4]GM[1]SZ[19];B[pd];W[dd];B[pq])'
const BRANCH_SGF = '(;FF[4]SZ[19];B[aa](;W[ab];B[ac])(;W[ba]))'
const COMMENT_SGF = '(;FF[4]SZ[19]C[root comment];B[pd]C[black move])'

describe('SgfProperty', () => {
  it('serializes name and values', () => {
    expect(new SgfProperty('AB', ['aa', 'bb']).toString()).toBe('AB[aa][bb]')
  })

  it('defaults values to empty array', () => {
    expect(new SgfProperty('C').values).toEqual([])
  })
})

describe('SgfTree static helpers', () => {
  it('toVertex / toGnuCo round-trip', () => {
    const v = SgfTree.toVertex('pd')
    expect(v).toEqual({ col: 15, row: 3 })
    expect(SgfTree.toGnuCo(15, 3)).toBe('pd')
  })

  it('toVertex treats empty as pass', () => {
    const pass = SgfTree.toVertex('')
    expect(pass?.col).toBeUndefined()
    expect(pass?.row).toBeUndefined()
  })

  it('toVertex returns null for invalid length', () => {
    expect(SgfTree.toVertex('p')).toBeNull()
    expect(SgfTree.toVertex('pdd')).toBeNull()
  })

  it('toInt / fromInt map colors', () => {
    expect(SgfTree.toInt('B')).toBe(Color.BLACK)
    expect(SgfTree.toInt('W')).toBe(Color.WHITE)
    expect(SgfTree.toInt('X')).toBe(Color.EMPTY)
    expect(SgfTree.fromInt(Color.BLACK)).toBe('B')
    expect(SgfTree.fromInt(Color.WHITE)).toBe('W')
    expect(SgfTree.fromInt(Color.EMPTY)).toBe('')
  })

  it('parseProperty extracts multi-value props', () => {
    const props = SgfTree.parseProperty('AB[aa][bb] AW[cc] C[hello]')
    expect(props).toHaveLength(3)
    expect(props[0]).toMatchObject({ name: 'AB', values: ['aa', 'bb'] })
    expect(props[1]).toMatchObject({ name: 'AW', values: ['cc'] })
    expect(props[2]).toMatchObject({ name: 'C', values: ['hello'] })
  })

  it('nodeStringToVertex parses move strings', () => {
    expect(SgfTree.nodeStringToVertex('B[pd]')).toEqual({ col: 15, row: 3 })
    expect(SgfTree.nodeStringToVertex('W[dd]')).toEqual({ col: 3, row: 3 })
  })

  it('getNodeFromMoveString creates move nodes', () => {
    const black = SgfTree.getNodeFromMoveString('B[pd]')
    expect(black).toBeInstanceOf(SgfMoveNode)
    expect(black).toMatchObject({ col: 15, row: 3, color: Color.BLACK })

    const white = SgfTree.getNodeFromMoveString('W[dd]')
    expect(white).toMatchObject({ col: 3, row: 3, color: Color.WHITE })

    expect(SgfTree.getNodeFromMoveString('AB[aa]')).toBeNull()
  })

  it('addTrace appends colored moves onto root', () => {
    const result = SgfTree.addTrace('(;FF[4]SZ[19])', ['15,3,1', '3,3,2', '0,0,0'])
    expect(result).toContain('B[pd]')
    expect(result).toContain('W[dd]')
    expect(result).not.toContain('B[aa]')
    expect(result.startsWith('(')).toBe(true)
    expect(result.endsWith(')')).toBe(true)
  })
})

describe('SgfNode', () => {
  it('create returns SgfMoveNode for B/W props', () => {
    const node = SgfNode.create([new SgfProperty('B', ['pd'])])
    expect(node).toBeInstanceOf(SgfMoveNode)
    expect(node).toMatchObject({ col: 15, row: 3, color: Color.BLACK })
  })

  it('create returns plain SgfNode for setup props', () => {
    const node = SgfNode.create([new SgfProperty('AB', ['aa'])])
    expect(node).toBeInstanceOf(SgfNode)
    expect(node).not.toBeInstanceOf(SgfMoveNode)
    expect(node?.getProperty('AB')).toEqual(['aa'])
  })

  it('create returns null for empty properties', () => {
    expect(SgfNode.create()).toBeNull()
    expect(SgfNode.create([])).toBeNull()
  })

  it('get/set comment and getProperty merge duplicates', () => {
    const node = new SgfNode()
    node.properties = [new SgfProperty('AB', ['aa'])]
    expect(node.getComment()).toBe('')

    node.setComment('first')
    expect(node.getComment()).toBe('first')
    node.setComment('updated')
    expect(node.getComment()).toBe('updated')

    node.properties.push(new SgfProperty('AB', ['bb']))
    expect(node.getProperty('AB')).toEqual(['aa', 'bb'])
  })

  it('toSgf can ignore properties', () => {
    const node = new SgfNode()
    node.properties = [new SgfProperty('AB', ['aa']), new SgfProperty('C', ['note'])]
    expect(node.toSgf()).toBe(';AB[aa]C[note]')
    expect(node.toSgf(['C'])).toBe(';AB[aa]')
  })

  it('SgfMoveNode generates B/W properties when missing', () => {
    const black = new SgfMoveNode(15, 3, Color.BLACK)
    expect(black.properties?.[0].toString()).toBe('B[pd]')

    const white = new SgfMoveNode(3, 3, Color.WHITE)
    expect(white.properties?.[0].toString()).toBe('W[dd]')
  })
})

describe('SgfTree parse & navigation', () => {
  it('loads linear sgf and sets current to root', () => {
    const tree = new SgfTree(LINEAR_SGF)
    expect(tree.root).toBeDefined()
    expect(tree.current).toBe(tree.root)
    expect(tree.root?.getProperty('SZ')).toEqual(['19'])
    expect(tree.getStep()).toBe(3)
  })

  it('forward/back walk the main trunk', () => {
    const tree = new SgfTree(LINEAR_SGF)
    const first = tree.forward()
    expect(first).toBeInstanceOf(SgfMoveNode)
    expect(first).toMatchObject({ col: 15, row: 3, color: Color.BLACK })

    const second = tree.forward()
    expect(second).toMatchObject({ col: 3, row: 3, color: Color.WHITE })

    const back = tree.back()
    expect(back).toMatchObject({ col: 15, row: 3 })

    tree.back()
    expect(tree.back()).toBeNull()
  })

  it('forward to a specific child by col/row', () => {
    const tree = new SgfTree(LINEAR_SGF)
    const node = tree.forward(15, 3)
    expect(node).toMatchObject({ col: 15, row: 3 })
    expect(tree.hasChildNode(3, 3)).toBe(true)
    expect(tree.hasChildNode(0, 0)).toBe(false)
  })

  it('parses branches and getChildNode finds them', () => {
    const tree = new SgfTree(BRANCH_SGF)
    tree.forward(0, 0)
    const current = tree.current
    expect(current?.children).toHaveLength(2)

    const child = current?.getChildNode(0, 1)
    expect(child).toMatchObject({ col: 0, row: 1 })
    expect(current?.getChildNode(9, 9)).toBe(false)
  })

  it('walk visits all nodes; walkTrunk only main line', () => {
    const tree = new SgfTree(BRANCH_SGF)
    const all: Array<number | undefined> = []
    tree.walk((node) => {
      if (node instanceof SgfMoveNode) all.push(node.col)
    })
    expect(all).toEqual([0, 0, 0, 1])

    const trunk: Array<number | undefined> = []
    tree.walkTrunk((node) => {
      if (node instanceof SgfMoveNode) trunk.push(node.col)
    })
    expect(trunk).toEqual([0, 0, 0])
  })

  it('reads comments from nodes', () => {
    const tree = new SgfTree(COMMENT_SGF)
    expect(tree.root?.getComment()).toBe('root comment')
    tree.forward()
    expect(tree.current?.getComment()).toBe('black move')
  })
})

describe('SgfTree serialization', () => {
  it('toString rebuilds a playable sgf', () => {
    const tree = new SgfTree(LINEAR_SGF)
    const out = tree.toString()
    expect(out.startsWith('(')).toBe(true)
    expect(out).toContain('SZ[19]')
    expect(out).toContain('B[pd]')
    expect(out).toContain('W[dd]')
    expect(out).toContain('B[pq]')

    const reparsed = new SgfTree(out)
    expect(reparsed.getStep()).toBe(3)
  })

  it('getGTPString maps coordinates and pass', () => {
    const tree = new SgfTree(LINEAR_SGF)
    tree.forward(15, 3)
    expect(tree.getGTPString(tree.current!)).toBe('Q16')

    const pass = new SgfMoveNode(19, 19, Color.BLACK)
    expect(tree.getGTPString(pass)).toBe('PASS')

    const outOfBoard = new SgfMoveNode(20, 0, Color.BLACK)
    expect(tree.getGTPString(outOfBoard)).toBe('')
  })

  it('getGTPString skips I column', () => {
    const tree = new SgfTree('(;SZ[19])')
    const node = new SgfMoveNode(8, 0, Color.BLACK)
    expect(tree.getGTPString(node)).toBe('J19')
  })
})

describe('SgfTree.autoPlay', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns NO_MATCH when child does not exist', () => {
    const tree = new SgfTree(LINEAR_SGF)
    expect(tree.autoPlay(0, 0, Color.BLACK)).toEqual({
      status: AutoPlayStatus.NO_MATCH,
    })
  })

  it('returns OVER when the played node is a leaf', () => {
    const tree = new SgfTree(LINEAR_SGF)
    tree.forward()
    tree.forward()
    const result = tree.autoPlay(15, 16, Color.BLACK)
    expect(result.status).toBe(AutoPlayStatus.OVER)
    expect(result.playNode).toMatchObject({ col: 15, row: 16 })
    expect(result.next).toBeNull()
  })

  it('returns OK with next reply when the reply still has children', () => {
    const tree = new SgfTree(LINEAR_SGF)
    const result = tree.autoPlay(15, 3, Color.BLACK)
    expect(result.status).toBe(AutoPlayStatus.OK)
    expect(result.playNode).toMatchObject({ col: 15, row: 3 })
    expect(result.selectable).toHaveLength(1)
    expect(result.next).toMatchObject({ col: 3, row: 3, color: Color.WHITE })
  })

  it('returns OVER when randomly selected reply is a leaf', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tree = new SgfTree(BRANCH_SGF)

    // B[aa] has replies W[ab] and W[ba]; random 0.9 picks the second (leaf)
    const result = tree.autoPlay(0, 0, Color.BLACK)
    expect(result.status).toBe(AutoPlayStatus.OVER)
    expect(result.playNode).toMatchObject({ col: 0, row: 0 })
    expect(result.selectable).toHaveLength(2)
    expect(result.next).toMatchObject({ col: 1, row: 0 })
  })

  it('can pick a non-leaf reply among multiple branches', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tree = new SgfTree(BRANCH_SGF)

    const result = tree.autoPlay(0, 0, Color.BLACK)
    expect(result.status).toBe(AutoPlayStatus.OK)
    expect(result.selectable).toHaveLength(2)
    expect(result.next).toMatchObject({ col: 0, row: 1 })
  })
})
