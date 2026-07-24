# goboard-sdk

围棋棋盘核心 SDK：规则引擎、SGF、Raphael 棋盘与各类 Player。

## 安装（开发中）

```bash
pnpm add goboard-sdk
# 或本地联调
pnpm add ../path/to/goboard-sdk
```

## 开发

需要 Node >= 18（推荐用 nvm 切到 22），包管理器用 pnpm。

```bash
nvm use 22
pnpm install
pnpm dev      # examples 演示页
pnpm build    # 产出 dist/（ESM + CJS + .d.ts）
```

## 最小用法

```ts
import { GoboardBranchPlayer, SgfTree } from 'goboard-sdk'

const sgfTree = new SgfTree('(;GM[1]FF[4]SZ[19])')
const player = new GoboardBranchPlayer({
  el: document.getElementById('board'),
  boardOptions: { showCoordinates: true },
})

player.init(
  { sgfTree, whoFirst: 1, boardSize: 19 },
  { showCoordinates: true },
)
```

## 导出

- `Go` / `Color` — 规则
- `SgfTree` / `SgfNode` / `SgfMoveNode` — SGF
- `Goboard` — 棋盘绘制
- `GoboardPlayer` 及 `*Player` — 业务控制层

## 目录

```
src/           # 库源码
examples/      # Vite 演示（不进入 npm 包）
dist/          # 构建产物（npm 发布内容）
```
