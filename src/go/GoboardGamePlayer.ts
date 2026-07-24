
import GoboardPlayer from "./GoboardPlayer";
import Audio from "../Audio/Audio";

/*
*
* AI点评用棋盘逻辑：
*
* isUserBranch: 当前在试下中
* inBranch: 当前在AI分支
*
* */
export default class GoboardGamePlayer extends GoboardPlayer{

  // 不同于打谱工具，这里不改变clientColor
  move (node:any, silent: boolean) {
    const eaten = this.go.play(node.col, node.row, node.color);

    if (this.cb && null !== eaten) {
      this.cb.currentColor = this.cb.oppositeColor(node.color)
      //有silent时 不执行showHead
      this.cb.add(node.color, node.col, node.row, silent);

      if (!silent && this.soundEnabled) {
        let rand = Math.round(1E4 * Math.random()) % 5;
        Audio.playEffect(`stone${rand + 1}`)
      }

      if (eaten.size) {
        const captures: any = [];
        eaten.forEach(function (vertex: string) {
          const arr = vertex.split(',');
          const item = {
            col: parseInt(arr[0]),
            row: parseInt(arr[1])
          };
          captures.push(item);
        });

        this.cb.eat(captures);

        if(this.soundEnabled){
          if(eaten.size <= 2){
            Audio.playEffect('eat1')
          }else{
            Audio.playEffect('eat2')
          }
        }

        // if(node.color === Color.BLACK){
        //   this.blackCaptures += eaten.size
        // }else{
        //   this.whiteCaptures += eaten.size
        // }
      }
    }

    return eaten
  }

	initEvents () {
		this.cb?.onPlay((color: number, col: number, row: number) => {

      // 确认落子，第二次落在相同位置，视为确认
      if(this.cb?.options.playConfirm && this.cb.clientColor === color){
        const d = this.prePlayData
        if(!!d && d.col === col && d.row === row && d.color === color) {
          this.prePlayData = null
          this.cb.hideHelperLine()
        }else{
          this.cb.showHelperLine(col, row)
          this.prePlayData = {col, row, color};
          return
        }
			}
      
      this.emit('play', {color, col, row})
		});
    this.cb?.onMarkDead((col: number, row: number) => {
      this.emit('markdead', {col, row})
    })
	}
}
