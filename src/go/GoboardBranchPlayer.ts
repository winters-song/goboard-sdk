
import GoboardPlayer from "./GoboardPlayer";
import {SgfMoveNode} from "./SgfTree"

/*
*
* 课堂老师用棋盘逻辑：
* 无需返回主线按钮，回退时自动删除用户试下
*
*
* */
export default class GoboardBranchPlayer extends GoboardPlayer{

	initEvents () {
		this.cb.onPlay((color, col, row) => {

			//有棋子的地方不能落子，否则步数出问题
			if (!this.go.canPlay(col, row, color)) {
				return;
			}

			let node
			let index = this.getBranchIndex(col, row)
			if(index < 0){

				// 如果sgf是空棋盘，不算分支
				if(!this.inBranch){
					this.enterUserBranch()
				}

				//创建节点
				node = new SgfMoveNode(col, row, color);
				//标记该节点为用户试下，backward时候判断此值，避免重复pop()
				node.isUserBranch = true;
				node.parent = this.currentNode;

				// 创建分支
				if(!this.currentNode.children){
					this.currentNode.children = [node]
				}else{
					this.currentNode.children.push(node)
				}
			}else{
				node = this.currentNode.children[index]
			}

			this.currentNode = node;

			this.currentStep += 1;

			this.move(node)

			this.onMove();
		});

		// 课堂标记
		this.cb.onMark(this.onMark)
	}

	/*
	* 下一步是否存在该分支： 存在时返回分支index， 不存在返回index
	* */
	getBranchIndex(col, row){
		const children = this.currentNode.children
		if(children){
			for(let i = 0; i< children.length; i++){
				if(children.col === col && children.row === row){
					return i
				}
			}
		}
		return -1
	}

	// 进入试下
	enterUserBranch (col, row, color) {
		//改变棋盘状态
		this.inBranch = true

		if(this.root.children){
			this.cb.branch = true;
		}
		this.saveUserMaster();
		//存储分支起始位置
		this.cb.branchStep = this.master.branchStep;
		this.cb.hideOrder();
	}

	closeUserBranch() {
		this.inBranch = false
		this.cb.branch = false;

		this.currentStep = this.master.branchStep
		this.master = {}
		this.resumeOrder()
	}

	// 保存进入分支前的主线节点
	saveUserMaster () {
		this.master = {
			branchNode: this.currentNode, //用于判定上一步是否到了分支第一步， 如果是第一步，则不可以退到上一步
			branchStep: this.currentStep //用于退出分支时，恢复原来位置
		};
	}

	/*
	* 上一步时，如果是试下，删除当前节点。如果父节点不是试下，退出试下
	* */
	removeBranchNode(node){
		let index = node.parent.children.indexOf(node)
		node.parent.children.splice(index, 1)

		if(!node.parent.isUserBranch){
			this.inBranch = false;
			this.cb.branch = false;

			if (this.cb.options.showOrder === true) {
				this.cb.showOrder();
			}
		}
	}

	backward (silent) {
		if (this.currentStep <= 0) {
			return false;
		}

		this.currentStep -= 1;

		const node = this.currentNode;
		const moveResult = this.go.undo(1);
		this.cb.trace.pop();



		// if(node.isUserBranch){
		// 	this.removeBranchNode(node)
		// }

		const key = node.col + "," + node.row;
		this.cb.removePiece(key);

		if (moveResult && moveResult.eated && moveResult.eated.size) {
			moveResult.eated.forEach(move => {
				this.cb.recoverPiece(move.col, move.row, move.color);
			});
		}

		if (this.cb.options.showOrder === 'last') {
			this.cb.showLastOrder();
		}


		this.cb.clientColor = node.color;
		this.cb.currentColor = node.color;

		this.currentNode = this.getPrevNode() || this.root;

		if(this.inBranch && this.currentNode === this.master.branchNode){
			this.closeUserBranch()
		}

		if (!silent) {

			if (this.currentNode instanceof SgfMoveNode) {
				this.cb.showHead();
			} else {
				this.cb.hideHead();
			}

			this.cb.updateDummyColor();
			this.onMove();
		}

		return true;
	}


}
