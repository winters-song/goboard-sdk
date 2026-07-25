# goboard-sdk

围棋棋盘核心 SDK：规则引擎、SGF、Raphael 棋盘与各类 Player。

## 安装（开发中）

```bash
pnpm add goboard-sdk
# 或本地联调
pnpm add ../path/to/goboard-sdk
```

## 运行 Examples

examples 通过 Vite 演示，默认 alias 到 `dist` 产物（更接近真实消费方）：

```bash
pnpm install
pnpm build   # 需先有 dist
pnpm dev     # http://localhost:5173
```

联调源码时，把 `examples/vite.config.ts` 里的 alias 改回 `../src/index.ts`，改库代码即可热更新，不必每次 build。

### 代码规范

- ESLint：`eslint.config.js`（flat config + typescript-eslint + prettier 兼容）
- Prettier：`.prettierrc.json`
- Git pre-commit（husky）：对暂存文件跑 `lint-staged`（eslint --fix + prettier --write）

现有代码里不少历史写法先以 warning 放行，避免一上来堵死 commit；后续可逐步收紧规则。

## 最小用法

```ts
import { GoboardBranchPlayer, SgfTree } from 'goboard-sdk'

const sgfTree = new SgfTree('(;GM[1]FF[4]SZ[19])')
const player = new GoboardBranchPlayer({
  el: document.getElementById('board'),
  boardOptions: { showCoordinates: true },
})

player.init({ sgfTree, whoFirst: 1, boardSize: 19 }, { showCoordinates: true })
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
