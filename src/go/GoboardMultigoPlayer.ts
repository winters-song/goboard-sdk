
import GoboardPlayer from "./GoboardPlayer";
import {SgfMoveNode, SgfNode} from "./SgfTree"

/*
*
* AI点评用棋盘逻辑：
*
* isUserBranch: 当前在试下中
* inBranch: 当前在AI分支
*
* */
export default class GoboardMultigoPlayer extends GoboardPlayer{

	isUserBranch=false;

	nodeId=0;

	nodeMap={}

	initEvents () {
		if (!this.cb){
			return
		}
		this.cb.onPlay((color: number, col: number, row: number) => {

			//有棋子的地方不能落子，否则步数出问题
			if (!this.go.canPlay(col, row, color)) {
				return;
			}

			let node
			let index = this.getBranchIndex(col, row)
			if(index < 0){

				//创建节点
				node = new SgfMoveNode(col, row, color);
				node.id = this.nodeId++
				this.nodeMap[node.id] = node
				node.parent = this.currentNode;
				//标记该节点为用户试下，backward时候判断此值，避免重复pop()
				// node.isUserBranch = true;

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

			this.onMove(index < 0);
		});

		// 课堂标记
		this.cb.onMark(this.onMark)
	}

	onMove (isNew?: boolean) {
		const data = {
			currentStep: this.currentStep,
			currentNode: this.currentNode,
			totalStep: this.totalStep,
			isNew
		}

		this.renderBranch();
		this.emit('move', data);
	}

	renderBranch() {
		this.cb?.clearBranchMarkers()
		if(this.currentNode.children && this.currentNode.children.length > 1){
			this.cb?.renderBranchMarkers(this.currentNode.children)
		}
	}

	// 遍历节点生成id、字典
	initMultigoTree() {
		let node = this.root

		this.nodeId = 0;
		this.nodeMap = {}

		let queue = []

		while(node){
			node.id = this.nodeId++
			this.nodeMap[node.id] = node

			if(node.children && node.children.length){
				queue.push(...node.children)
			}

			node = queue.pop()
		}
	}

	jumpTo(nodeId: string|number) {
		if(!this.nodeMap[nodeId]){
			return
		}

		const currentParents = {}
		const backwardSteps = {}
		const forwardNodes = []
		let steps = 0

		// 回溯当前节点，生成父节点字典及回退步数
		let node = this?.currentNode
		while(node){
			currentParents[node.id] = node
			backwardSteps[node.id] = steps++
			if(node.parent){
				node = node.parent
			}else{
				break;
			}
		}

		// 回溯选中节点，在父节点字典中检索及生成前进路线
		node = this.nodeMap[nodeId]
		while(node){
			if(currentParents[node.id]){
				break;
			}

			forwardNodes.push(node)
			node = node.parent
		}

		if(!node){
			return
		}
		// 翻转前进路线
		forwardNodes.reverse();

		this.fastBackwardSilent(backwardSteps[node.id])
		this.forwardNodes(forwardNodes);

		if (this.currentNode instanceof SgfMoveNode) {
			this.cb?.showHead();
		} else {
			this.cb?.hideHead();
		}

		this.cb?.updateDummyColor();
		this.onMove();
	}

	fastBackwardSilent (step: number) {
		for (let i = 0; i < step; i += 1) {
			if (!this.backward(true)) {
				break;
			}
		}
	}

	forwardNodes(nodes: SgfMoveNode[]) {

		for(let i = 0; i < nodes.length; i++){
			const node = nodes[i]

			if(this.currentNode.children.indexOf(node) >= 0 ){
				this.currentStep += 1;
				this.currentNode = node;

				this.move(node, true);
			}else{
				break;
			}
		}
	}

	/*
	* 下一步是否存在该分支： 存在时返回分支index， 不存在返回index
	* */
	getBranchIndex(col: number, row: number){
		const children = this.currentNode.children
		if(children){
			for(let i = 0; i< children.length; i++){
				const node = children[i]
				if(node.col === col && node.row === row){
					return i
				}
			}
		}
		return -1
	}


	toStart () {
		this.fastBackward(1000);
		this.cb?.setCurrentColor();

		if(!this.isUserBranch){
			this.currentStep = 0;
		}
	}

	/*
	* multigo前进逻辑：
	* 有分支时，先遍历次子，最后遍历长子
	*
	* */
	branchForward () {

		let node = this.currentNode;
		let nextChild

		// 只有一个孩子，正常下一步
		if(node.children && node.children.length === 1){
			nextChild = node.children[0]
			this.emit('expand', [node.id])
		}
		else if(node.children && node.children.length > 1){
			nextChild = node.children[1]
			this.emit('expand', [node.id])
		}
		// 已到叶子节点
		else {

			let backStep = 0
			let matched = false
			let branchIndex;
			// 寻找下一节点
			while(!matched || !node.parent){
				backStep++;
				const parent = node.parent;
				if(!parent){
					break;
				}

				branchIndex = parent.children.indexOf(node)
				// 当前为长子
				if(branchIndex === 0){
					node = parent
				}else{
					matched = true
					// 当前为次子，遍历下个兄弟分支
					branchIndex = branchIndex	=== parent.children.length - 1 ? 0 : branchIndex + 1
					break;
				}
			}

			if(!matched){
				return
			}

			this.fastBackwardSilent(backStep)
			nextChild = this.currentNode.children[branchIndex];
		}

		this.currentStep += 1;
		this.currentNode = nextChild;
		this.move(nextChild, false);

		this.onMove();
	}

	branchBackward () {
		let node = this.currentNode;

		if(!node.parent){
			return
		}

		// 父节点只有一个孩子，正常上一步
		if(node.parent.children.length === 1){
			this.emit('collapse', [node.parent.id])
			this.backward()
		} else {

			let index = node.parent.children.indexOf(node)
			if(index === 1) {
				this.emit('collapse', [node.parent.id])
				this.backward()
				return
			}

			// 当前为长子分支，需跳转到末子的主线分支最后一手
			if(index === 0){
				index = node.parent.children.length - 1
			}else{
				index = index - 1
			}
			node = node.parent.children[index]

			this.backward(true)

			this.currentStep += 1;
			this.currentNode = node;
			this.move(node, false);
			this.toEnd();

			let path = [node.parent.id]
			while(node){
				path.push(node.id)

				if(node.children && node.children.length){
					node = node.children[0]
				}else{
					break;
				}
			}
			this.emit('expand', path)
			// nextChild = node.children[1]
			// this.emit('expand', [node.id])
		}
	}

	backward (silent?: boolean) {

		if(!this.cb){
			return false;
		}
		if (this.currentStep <= 0) {
			return false;
		}
		this.currentStep -= 1;

		const node = this.currentNode;
		const moveResult = this.go.undo(1);
		this.cb.trace.pop();

		this.cb.removePiece(node.col + "," + node.row);

		if (moveResult && moveResult.eated && moveResult.eated.size > 0) {
			moveResult.eated.forEach((move: any) => {
				this.cb?.recoverPiece(move.col, move.row, move.color);
			});
		}

		if (this.cb.options.showOrder === 'last') {
			this.cb.showLastOrder();
		}

		this.cb.clientColor = node.color;
		this.cb.currentColor = node.color;

		this.currentNode = this.getPrevNode() || this.root;

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

	removeCurrentNode() {
		let node = this.currentNode;
		this.backward()
		let index = this.currentNode.children.indexOf(node)
		this.currentNode.children.splice(index, 1);
		this.renderBranch()
	}

	removeAll() {
		this.toStart()
		this.cb?.clearBranchMarkers()
		this.root.children = []
	}

	/**
	 *  胜率图联动，切换手数
	 */
	onJump (step: number){

		let offset = step - this.currentStep

		this.goStep(offset)
	}

	// getMasterNodeMap() {
	// 	let map = []
	// 	let order = []
	//
	// 	let node = this.root;
	// 	while(node){
	// 		map[node.id] = 1
	// 		order.push(node.id)
	// 		if(node.children && node.children.length){
	// 			node = node.children[0]
	// 		}else{
	// 			break;
	// 		}
	// 	}
	// 	return {map, order};
	// }

	// 主线后退
	// backwardMaster() {
	// 	const {map, order} = this.getMasterNodeMap()
	//
	// 	let node = this.currentNode;
	// 	let targetId;
	// 	while(node){
	// 		if(map[node.id] === 1){
	// 			targetId = node.id
	// 			break;
	// 		}
	// 		node = node.parent
	// 	}
	// 	let index = order.indexOf(targetId)
	// 	if(index > 0){
	// 		this.jumpTo(order[index - 1])
	// 	}
	// }

	// 主线前进
	// forwardMaster() {
	// 	const {map, order} = this.getMasterNodeMap()
	//
	// 	let node = this.currentNode;
	// 	let targetId;
	// 	while(node){
	// 		if(map[node.id] === 1){
	// 			targetId = node.id
	// 			break;
	// 		}
	// 		node = node.parent
	// 	}
	// 	let index = order.indexOf(targetId)
	// 	if(index < order.length -1){
	// 		this.jumpTo(order[index + 1])
	// 	}
	// }
}
