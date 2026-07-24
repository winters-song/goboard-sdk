
/**
 * 不做停招处理
 * 不做落子次序校验（交给棋盘做）
 */

// Set 补充:批量添加，批量删除
export const mergeSet = <T>(_this: Set<T>, another: Set<T>|Array<T>) => {
  another.forEach((item) => {
    _this.add(item);
  });
  return _this;
}

export const removeSet = <T>(_this: Set<T>, another: Set<T>) => {
  another.forEach((item:any) => {
    _this.delete(item);
  });
  return _this;
}

// 颜色
export const Color = {
  EMPTY : 0,
  BLACK : 1,
  WHITE : 2
}

// 大龙
export class Str {

  //棋子
  vertexes = new Set<string>()
  //气
  liberty = new Set<string>()
  //撞气的对方棋子
  opposite = new Set<string>()

  merge (another: Str){
    mergeSet(this.vertexes, another.vertexes);
    mergeSet(this.liberty, another.liberty);
    mergeSet(this.opposite, another.opposite);

    return this;
  }
};


const neighbors = [[0,1],[0,-1],[1,0],[-1,0]]
const surround = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]

export class Go {

  size = 19;
  blackStrs = new Set<Str>();
  whiteStrs = new Set<Str>();
  blackCaptures = new Map<number, Set<Str>>();
  whiteCaptures = new Map<number, Set<Str>>();
  addedStones: any[] = []
  history: any[] = []
  board : number[][] = []

  constructor(size: number){
    // 9，13，19
    this.size = size;
    this.init()
  }

  init (){
    this.history = []
    this.board = [...Array(this.size)].map(() => Array(this.size).fill(Color.EMPTY))
  }

  add (x: number, y: number, color: number, isAdd?: boolean) {

    let move = [x, y, color]

    if(x === 19 || y === 19){
      this.history.push(move)
      return
    }
    let eating = this.willEat(move)
    let eatenVertexes = new Set()
    if(isAdd){
      this.addedStones.push(move)
    }

    eating.forEach((str: Str) => {
      mergeSet(eatenVertexes, str.vertexes)
    })

    this.doPlay(move, eating)
    this.history.push(move)

    this.board[y][x] = color

    return eatenVertexes
  }

  getVertex (x: number, y: number) {
    return `${x},${y}`
  }

  isOnBoard (x: number, y: number){
    return x >=0 && x < this.size && y >=0 && y < this.size
  }

  // 该坐标是否有落子, col=x, row=y
  isEmpty (x: number, y: number) {
    return this.board[y][x]  ===  Color.EMPTY
  }

  isBadMove (x: number, y: number) {
    return y < 0 || x < 0 || y >= this.size || x >= this.size || this.board[y][x] !== Color.EMPTY
  }

  // 此处可以落子
  // 此处无棋子，不是打劫，不是禁入点
  canPlay (x: number, y: number, color: number) {
    let move = [x, y, color]

    // 是否已经有子
    if (!this.isEmpty(x, y)) {
      return false;
    }
    // 是否有提子
    let eating = this.willEat(move)
    let eatenVertexes = new Set()
    // 把被吃掉的各块棋的棋子坐标全部加入集合
    eating.forEach((str: Str) => {
      mergeSet(eatenVertexes, str.vertexes)
    })
    // 是否是打劫
    if(!this.checkCanKo(move, eating)){
      return false
    }
    // 没有吃子，禁入点
    if (!eating.size && this.willSuicide(move)) {
      return false
    }
    return true
  }

  getStep () {
    return this.history.length
  }

  // 是否是打劫: true:可以提子， false:打劫，不能提子
  checkCanKo (move: number[], eating: Set<Str>) {
    if (1 !== eating.size) {
      return true
    }
    let eatVertex = null

    for(let str of eating){
      // 吃掉多个子则不是打劫
      if(str.vertexes.size !== 1) {
        return true
      }
      str.vertexes.forEach(v => {
        eatVertex = v
      })
    }

    // 没有上一步，不是打劫
    let lastMove = this.getLastMove()
    if (undefined  ===  lastMove) {
      return true
    }
    // 获得上一次提子
    let lastCaptureVertex = null
    let lastCaptures
    if(Color.BLACK  ===  lastMove[2]) {
      lastCaptures = this.blackCaptures.get(this.history.length - 1)
    } else {
      lastCaptures = this.whiteCaptures.get(this.history.length - 1)
    }

    // 上一次无提子，或有多个提子，不算打劫
    if(!lastCaptures || lastCaptures.size !== 1) {
      return true
    }

    for(let str of lastCaptures){
      // 吃掉多个子则不是打劫
      if(str.vertexes.size !== 1) {
        return true
      }
      str.vertexes.forEach(v => {
        lastCaptureVertex = v
      })
    }

    // 上一步被提掉子=本次落子，本次要吃掉的子=上一步落子
    if(lastCaptureVertex  ===  this.getVertex(move[0], move[1]) && eatVertex  ===  this.getVertex(lastMove[0], lastMove[1])){
      return false
    }
    return true
  }

  // 禁入点
  willSuicide (move: number[]) {
    let strs = move[2]  ===  Color.BLACK ? this.blackStrs : this.whiteStrs;
    let vertex = this.getVertex(move[0], move[1])
    // 该落子是否有气
    let hasLiberty = !!this.getLiberty(vertex).length;
    // 有多口气就忽略
    if (hasLiberty) {
      return false;
    }

    for(let str of strs){
      // 有该气的大龙有多口气
      if (str.liberty.has(vertex) && str.liberty.size > 1) {
        return false;
      }
    }

    return true;
  }

  willEat (move: number[]) {
    // 将被吃掉的多块棋
    let eatenStrs = new Set<Str>();
    // 当前落黑子，则遍历白棋各块棋， 反之亦然
    let strs = move[2]  ===  Color.BLACK ? this.whiteStrs : this.blackStrs;
    //搜索对方每条龙是否是最后1口气
    strs.forEach(str => {
      // 最后1口气，且坐标位置与落子相同
      if (str.liberty.size  ===  1 && str.liberty.has(this.getVertex(move[0], move[1]))) {
        eatenStrs.add(str);
      }
    });

    return eatenStrs;
  }

  oppositeColor(color: number){
    return 3 - color
  }

  doPlay (move: number[], eating: Set<Str>) {
    let vertex = this.getVertex(move[0], move[1])
    // eat
    let myStrs = move[2]  ===  Color.BLACK ? this.blackStrs : this.whiteStrs;
    let oppositeStrs = move[2]  ===  Color.BLACK ? this.whiteStrs	: this.blackStrs;

    //移除吃掉的子
    eating.forEach( eatenStr => {
      eatenStr.vertexes.forEach(v => {
        // 清除board值
        const arr = v.split(',').map(i => parseInt(i));
        this.board[arr[1]][arr[0]] = Color.EMPTY;

        myStrs.forEach(str => {
          // 对于所有撞气的位置，增加气，移除撞气
          if (str.opposite.has(v)) {
            // add liberty
            str.liberty.add(v);
            // remove adjacent opposite
            str.opposite.delete(v);
          }
        });
      });
    });
    // 记录提子（方便恢复）
    if (eating.size) {
      if (Color.BLACK  ===  move[2]) {
        this.blackCaptures.set(this.history.length, eating);
      } else {
        this.whiteCaptures.set(this.history.length, eating);
      }
      // 对方大龙移除掉被吃的
      removeSet(oppositeStrs, eating);
    }

    // 合并我方大龙
    // 合并主方
    let firstStr: Str|undefined;
    // 合并客方
    let mergedStrs = new Set<Str>();

    myStrs.forEach(str => {
      // 我方气有该位置
      if (str.liberty.has(vertex)) {
        if (!firstStr) {
          // 记录要合并主方
          firstStr = str;
        } else {
          // 找到合并客方，合并
          firstStr.merge(str);
          mergedStrs.add(str);
        }
      }
    });

    // 如果有合并动作，将合并客方删掉
    if (mergedStrs.size){
      removeSet(myStrs, mergedStrs)
    }

    // 没有大龙相连，新建一块棋
    if (!firstStr) {
      firstStr = new Str();
      firstStr.vertexes.add(vertex);
      myStrs.add(firstStr);
    } else {
      // 延长大龙，减少当前位置的气
      firstStr.vertexes.add(vertex);
      firstStr.liberty.delete(vertex);
    }
    // 获得该点的气，加到大龙上
    mergeSet(firstStr.liberty, this.getLiberty(vertex));
    // 获得该点的撞气，加到大龙上
    mergeSet(firstStr.opposite, this.getOpposite(move));
    // 对方大龙相应减气，增加撞气
    oppositeStrs.forEach(str => {
      if (str.liberty.has(vertex)) {
        str.liberty.delete(vertex);
        str.opposite.add(vertex);
      }
    });
  }

  undo(n: number) {
    let moveResult = {
      move: [],
      eated: <any>null
    };

    if(n > this.history.length){
      return null;
    }

    this.blackStrs.clear();
    this.whiteStrs.clear();
    this.blackCaptures.clear();
    this.whiteCaptures.clear();

    let oldHistory = this.history;
    let oldBoard = this.board;

    this.history = [];
    this.init();

    //重新从第0步play到上一步
    for (let i = 0; i < oldHistory.length - n; i++) {
      let [x, y, color] = oldHistory[i]
      this.add(x, y, color);
    }

    moveResult.move = oldHistory.pop();

    let eaten = new Set();
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        //eaten = board minus result undo
        if(oldBoard[i][j] !== this.board[i][j]) {

          //exclude current move
          if(i  ===  moveResult.move[1] && j  ===  moveResult.move[0]){

          }else{
            eaten.add({
              row: i,
              col: j,
              color: this.board[i][j]
            });
          }
        }
      }
    }

    moveResult.eated = eaten;
    return moveResult;
  }

  isPass (x: number, y: number){
    return x === 19 || y === 19 || x === undefined || y === undefined
  }

  /**
   *	交替落子
    * @return []Vertex  返回被吃掉的子
    * @return null  不能落子（有效性校验、打劫或是禁入点）
    */
  play (x: number, y: number, color: number) : Set<string> | null{

    if(this.isPass(x, y)){
      this.history.push([19, 19, color]);
      return new Set<string>();
    }
    // 检查有效性
    // 此处有子，不能落子
    if (!this.isOnBoard(x, y) || !this.isEmpty(x, y)) {
      return null;
    }

    let move = [x, y, color];

    // 是否有提子
    let eating = this.willEat(move);
    let eatenVertexes = new Set<string>();

    // 把被吃掉的各块棋的棋子坐标全部加入集合
    eating.forEach(str => {
      mergeSet(eatenVertexes, str.vertexes)
    });

    // 是否是打劫
    if(!this.checkCanKo(move, eating)){
      return null;
    }
    // 没有吃子，禁入点
    if (!eating.size && this.willSuicide(move)) {
      return null;
    }
    // 对双方受影响的大龙进行调整
    this.doPlay(move, eating);

    // 加入历史，改变该坐标值
    this.history.push(move);
    this.board[y][x] = color;

    // 返回被提掉的棋子，用于界面删除
    return eatenVertexes;
  }

  /**
   *	快速走子
    */
  forcePlay(x: number, y: number, color: number) {
    let move = [x, y, color];
    // 是否有提子
    let eating = this.willEat(move);
    // 对双方受影响的大龙进行调整
    this.doPlay(move, eating);
    // 加入历史，改变该坐标值
    this.history.push(move);
    this.board[y][x] = color;
  }

  // 获得最后一次落子
  getLastMove(){
    return this.history[this.history.length - 1];
  }

  getNeighborByColor(x: number, y: number, color: number){
    const arr = []
    for (let i in neighbors){
      let x2 = neighbors[i][0] + x
      let y2 = neighbors[i][1] + y

      if(this.isOnBoard(x2, y2) && color  ===  this.board[y2][x2]){
        arr.push(this.getVertex(x2, y2))
      }
    }
    return arr;
  }

  // 返回该位置上下左右没有棋子的顶点
  getLiberty(vertex: string) {
    const arr = vertex.split(',')
    return this.getNeighborByColor(parseInt(arr[0]), parseInt(arr[1]), Color.EMPTY)
  }

  getOpposite(move: number[]) {
    return this.getNeighborByColor(move[0], move[1], this.oppositeColor(move[2]))
  }

  // 获取某位置上下左右我方棋子
  getOurs (move: number[]) {
    return this.getNeighborByColor(move[0], move[1], move[2]);
  }

  // 获取某位置周围8个位置的某种状态数（我方、敌方、空）
  getArounds (move: number[]) {
    let arr = [];
    let color = move[2];

    for (let i in surround){
      let x = surround[i][0] + move[0]
      let y = surround[i][1] + move[1]

      if(this.isOnBoard(x, y) && color  ===  this.board[y][x]){
        arr.push(this.getVertex(x, y))
      }
    }
    return arr;
  }

  // 获取与大龙相邻的敌方大龙
  getOppositeStrs (myStr: Str, oppositeStrs: Set<Str>) {
    let result = new Set();

    oppositeStrs.forEach(str => {
      str.vertexes.forEach(key => {
        if (myStr.opposite.has(key)) {
          if (!result.has(str)) {
            result.add(str);
          }
        }
      });
    });
    return result;
  }

  // startSgf: 带有AB,AW的sgf, 需要拼接
  getSgf (startSgf?: string) {
    let prefix, history
    if(startSgf){
      const key = "MULTIGOGM[1]"
      let index = startSgf.indexOf(key)
      prefix = startSgf.substr(0, index+ key.length)

      history = this.history.slice(this.addedStones.length)
      if(!history.length){
        return prefix + ')'
      }
    }else{
      prefix = '(;CA[gb2312]AP[MultiGo:4.4.4]SZ[' + this.size + ']'
      history = this.history
    }
    let s = '';

    function toGnuCo(x: number, y: number) {
      return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
    }

    history.forEach( move => {
      s += ";";
      if (Color.BLACK  ===  move[2]) {
        s += "B";
      } else {
        s += "W";
      }
      s += "[";
      s += toGnuCo(move[0], move[1]);
      s += "]";
    });

    return prefix + s + ')';
  }

  getCaptureSize (color: number) {
    if(color ===Color.BLACK){
      return this._getCaptureSize(this.blackCaptures)
    }
    if(color ===Color.WHITE){
      return this._getCaptureSize(this.whiteCaptures)
    }
    return 0
  }
  // 获取吃子数量
  _getCaptureSize (map: Map<number, Set<Str>>) {
    var i = 0;
    map.forEach(function (strs) {
      strs.forEach(function (str) {
        i += str.vertexes.size;
      });
    });
    return i;
  }
}

// exports.Str = Str
// exports.Color = Color
// exports.Go = Go
