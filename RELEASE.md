# 发版流程

通过 GitHub Actions + npm Trusted Publishing 自动发布到 npm，**不需要**本地执行 `pnpm publish`，也**不需要**配置 `NPM_TOKEN`。

## 前置条件（只需配置一次）

1. 仓库已有 `.github/workflows/publish.yml`，并已合入默认分支（`main`）。
2. 在 npm 包设置中配置 Trusted Publisher：
   - 打开 [goboard-sdk → Settings → Trusted Publisher](https://www.npmjs.com/package/goboard-sdk)
   - 选择 **GitHub Actions**，填写：

   | 字段                 | 值                 |
   | -------------------- | ------------------ |
   | Organization or user | `winters-song`     |
   | Repository           | `goboard-sdk`      |
   | Workflow filename    | `publish.yml`      |
   | Environment name     | 留空               |
   | Allowed actions      | 勾选 `npm publish` |

## 发版步骤

### 1. 更新版本号

修改 `package.json` 的 `version`（遵循 [semver](https://semver.org/)）：

- 修复 / 小改 → patch，如 `0.2.0` → `0.2.1`
- 新功能、兼容旧用法 → minor，如 `0.2.1` → `0.3.0`
- 破坏性变更 → major，如 `0.3.0` → `1.0.0`

### 2. 提交并推送到 main

```bash
git add package.json
# 如有其它发版相关改动一并加入
git commit -m "chore: release v0.2.1"
git push origin main
```

确保目标版本的代码已在 `main` 上。

### 3. 打 tag 并推送（触发发布）

tag 必须是 `v` + `package.json` 里的版本号，二者不一致时 workflow 会失败。

```bash
git checkout main
git pull
git tag v0.2.1
git push origin v0.2.1
```

也可在 GitHub → **Releases → Create a new release**，创建 tag `v0.2.1`（效果相同）。

### 4. 确认结果

1. 打开仓库 **Actions**，查看 **Publish** workflow 是否成功。
2. 打开 [npm 包页面](https://www.npmjs.com/package/goboard-sdk) 确认新版本已出现。

## 工作流会做什么

推送 `v*` tag 后，`publish.yml` 会依次：

1. 安装依赖
2. 校验 tag 与 `package.json` version 一致
3. 跑 format / lint / typecheck / test
4. 通过 OIDC Trusted Publishing 执行 `pnpm publish`（自动附带 provenance）

## 注意

- **不要**对已经发布过的版本重复打同名 tag（例如 `0.2.0` 已在 npm 上就不要再推 `v0.2.0`）。
- **不要**用打 tag 来「试 CI」；CI 由 `ci.yml` 在 push / PR 时自动跑。
- 发版前建议先等 `main` 上的 **CI** 通过。
- 本地一般无需 `npm login` / `pnpm publish`；仅在调试 Trusted Publishing 以外的场景才需要手动发布。
