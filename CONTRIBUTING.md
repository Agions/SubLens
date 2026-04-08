# 贡献指南

感谢您对 HardSubX 的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

如果您发现 bug 或有新功能建议，请：

1. 在 [GitHub Issues](https://github.com/Agions/HardSubX/issues) 中搜索是否已有类似问题
2. 如果没有，创建新的 Issue 并选择合适的模板
3. 提供详细的复现步骤和环境信息

### 提交代码

1. **Fork 本仓库**
2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或修复 bug
   git checkout -b fix/your-bug-fix
   ```
3. **编写代码**并确保通过所有测试
4. **提交更改**
   ```bash
   git commit -m 'feat: 添加新功能'
   # 或
   git commit -m 'fix: 修复某问题'
   ```
5. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **创建 Pull Request**

### 代码规范

#### 前端 (Vue + TypeScript)

- 使用 Vue 3 Composition API
- TypeScript 严格模式
- 使用 ESLint 检查代码风格
- 组件使用 PascalCase 命名
- Composables 使用 camelCase 命名，以 `use` 开头

#### 后端 (Rust)

- 遵循 Rust 官方代码规范
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码
- 公共 API 需要文档注释

### Commit 消息规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型:**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例:**
```
feat(ocr): 添加 PaddleOCR 引擎支持

- 添加 PaddleOCR Rust bindings
- 实现 OCR 引擎抽象接口
- 添加 GPU 加速支持

Closes #123
```

## 开发环境

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm 8+

### 本地开发

```bash
# 克隆并安装依赖
git clone https://github.com/Agions/HardSubX.git
cd HardSubX
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 测试

```bash
# 前端测试
pnpm test

# Rust 测试
cargo test

# E2E 测试
pnpm tauri dev
# 然后
pnpm test:e2e
```

### 构建

```bash
# 构建前端
pnpm build

# 构建 Tauri 应用
pnpm tauri build
```

## 项目结构

```
HardSubX/
├── src/                    # Vue 前端
│   ├── components/        # UI 组件
│   ├── composables/       # Vue Composables
│   ├── stores/            # Pinia 状态管理
│   └── types/             # TypeScript 类型
│
├── src-tauri/             # Rust 后端
│   └── src/commands/      # Tauri IPC 命令
│
└── .github/workflows/     # GitHub Actions
```

## 许可证

提交代码即表示您同意您的代码将按 MIT 许可证授权。
