import {Go, Color} from "./Go";
import {SgfMoveNode, SgfNode, SgfTree} from "./SgfTree"
import EventEmitter from "events";

/*
*
* cfg:
*
*
* */
export default class GoboardPlayerTiny extends EventEmitter{
	// 当前手数
	currentStep = 0
	// 主线缓存
	master:any = {}
	// 打谱历史
	history = []
	// 打谱分支历史
	history_branch = []

	boardOptions = {}

	boardSize=19

	go: any
	sgfTree: any
	root:any
	whoFirst=1
	stones:any

	currentNode: any

	totalStep=0
	inBranch=false

	constructor(cfg: any) {
		super()

		Object.assign(this, cfg);
	}

	// fullSgf: 带有答案的sgf, 用于正确裁剪棋盘（避免答案部分被裁剪掉）
	// sgfTree, whoFirst, boardSize, fullSgf
	init (cfg:any) {
		if(!cfg.sgfTree){
			console.warn('缺少sgfTree')
			return
		}

		Object.assign(this, {
			currentStep: 0,
			root: cfg.sgfTree.root,
			currentNode: cfg.sgfTree.root,
		},cfg)

		this.go = new Go(this.boardSize);

		//渲染Added Stone
		this.addStones();
	}

	move (node: SgfMoveNode) {
		this.go.play(node.col, node.row, node.color);
	}

	toStart () {
		this.fastBackward(this.currentStep);
		this.currentStep = 0;
	}

	toEnd () {
		let node = this.currentNode;
		let step = 0;
		while (node.children && node.children.length) {
			node = node.children[0];
			step++;
		}

		this.fastForward(step);
	}


	/**
	 *  获得上一步树节点（父节点）
	 */
	getPrevNode () {
		let node = this.currentNode;
		while (node) {
			node = node.parent;
			if (!node || node instanceof SgfMoveNode) {
				break;
			}
		}
		return node;
	}

	/**
	 *  获得下一步树节点（子节点）
	 */
	getNextNode () {
		let node = this.currentNode;
		while (node) {
			node = node.children && node.children[0]
			if (!node || node instanceof SgfMoveNode) {
				break;
			}
		}
		return node;
	}

	goStep(step: number) {
		if(step === -1) {
			this.backward()
		}
		if(step === 1) {
			this.forward()
		}
		if(step < -1) {
			this.fastBackward(-step)
		}
		if(step > 1) {
			this.fastForward(step)
		}
	}

	/**
	 *  下一步
	 */
	forward () {
		let node = this.getNextNode()
		if (!node) {
			return;
		}

		this.currentStep += 1;
		this.currentNode = node;

		this.move(node);

		return true;
	}

	backward () {
		if (this.currentStep <= 0) {
			return false;
		}

		this.currentStep -= 1;
		this.currentNode = this.getPrevNode() || this.root;

		return true;
	}

	fastForward (step: number) {
		let counter = 0;

		for (let i = 0; i < step; i += 1) {
			if (this.forward()) {
				counter += 1;
			} else {
				break;
			}
		}
		return counter;
	}

	fastBackward (step: number) {
		let counter = 0;

		for (let i = 0; i < step; i += 1) {
			if (this.backward()) {
				counter += 1;
			} else {
				break;
			}
		}

		return counter;
	}

	addStones () {
		let stones = this.getTreeStones(this.sgfTree);

		stones.forEach( (i:any) => {
			if (!i.mark && !i.move) {
				this.go.add(i.col, i.row, i.color);
			}
		});
	}

	getTreeStones (tree:any) {
		this.stones = [];

		tree.walkTrunk((node:any) => {
			//落子 或 答案
			if (node instanceof SgfMoveNode) {
				this.addMoveStone(node.col, node.row, node.color);
			}
			//添加多子 或 标记
			else if (node instanceof SgfNode) {
				//循环节点属性
				node.properties?.forEach ((prop:any) => {

					switch (prop.name) {
						case "AB":
							this.addAddedStones(prop.values, Color.BLACK);
							break;
						case "AW":
							this.addAddedStones(prop.values, Color.WHITE);
							break;
						default:
					}

				});
			}
		});

		return this.stones;
	}

	addMoveStone(col:number|undefined, row:number|undefined, color?:number) {
		this.stones.push({
			col: col,
			row: row,
			color: color,
			move: true
		});
	}

	addAddedStones(values:any, color:number) {
		values.forEach((pos: string) => {
			const json = this.getCoordinate(pos);
			// @ts-ignore
			json.color = color;
			this.stones.push(json);
		});
	}

	getCoordinate(pos: string) {
		return {
			col: pos[0].charCodeAt(0) - 97,
			row: pos[1].charCodeAt(0) - 97
		};
	}

	reset () {
		this.currentStep = 0;
		this.currentNode = this.root;

		this.go = new Go(this.boardSize);

		//渲染Added Stone
		this.addStones();
	}

	changeData (sgf:string, whoFirst:number) {
		const sgfTree = new SgfTree(sgf);

		if(!sgfTree.root){
			return
		}
		// 根据SGF,自动切换当前棋盘大小
		let boardSize = 19
		let sizeProp = sgfTree.root.getProperty('SZ');
		if (sizeProp && sizeProp.length) {
			boardSize = parseInt(sizeProp[0], 10);
		}

		this.init({sgfTree, whoFirst: whoFirst || Color.BLACK, boardSize});
	}

	doMove(col: number, row: number, color: number) {
		//  pass
		if( col === 19 && row === 19){
			//   do nothing
		}else if (!this.go.canPlay(col, row, color)) {
			console.log("非法落子")
			return;
		}

		this.currentStep += 1

		//创建节点
		let node = new SgfMoveNode(col, row, color);
		node.parent = this.currentNode;
		this.currentNode.children = [node]
		this.currentNode = node;

		this.move(node)
	}
}
