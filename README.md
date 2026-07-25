# goboard-sdk

围棋棋盘核心 SDK：规则引擎、SGF、Raphael 棋盘与各类 Player。

## 安装（开发中）

```bash
pnpm add goboard-sdk
# 或本地联调
pnpm add ../path/to/goboard-sdk
```

## 开发

需要 Node >= 18（推荐 22），包管理器用 pnpm（见 `packageManager` 字段）。

### Node / nvm（本机）

项目根目录有 `.nvmrc`（内容为 `22`）。pnpm 11 要求 Node >= 18.12；若终端仍是 Node 16，`pnpm` 会直接报错。

本机 nvm 安装位置（Homebrew）：

```bash
# 若当前 shell 里 `nvm` 不可用，先加载：
export NVM_DIR="$HOME/.nvm"
. "/usr/local/opt/nvm/nvm.sh"

# 进入项目后：
cd /path/to/goboard-sdk
nvm use          # 读取 .nvmrc → Node 22
# 或显式：
nvm use 22

node -v          # 期望 v22.x
which node       # 期望 ~/.nvm/versions/node/v22.*/bin/node
```

说明：

- nvm 已写在 `~/.bash_profile`；用 zsh / Cursor 集成终端时可能未自动 source，需要按上面手动加载一次。
- 不想每次手敲时，可把同样的两行 `NVM_DIR` + `nvm.sh` 放进 `~/.zshrc`。
- 已安装版本可查：`ls ~/.nvm/versions/node/`（当前有 v18 / v20 / v22 等）。
- Cursor Agent 终端里若默认仍是旧 Node，可临时：`export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"`。

```bash
nvm use
pnpm install
pnpm dev      # examples 演示页
pnpm build    # 产出 dist/（ESM + CJS + .d.ts）
pnpm lint     # ESLint
pnpm format   # Prettier
```

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
