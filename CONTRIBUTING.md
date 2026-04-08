# Contributing to HardSubX

Contributions are welcome. This guide covers how to report issues, submit code, and set up your development environment.

---

## Reporting Issues

Before opening a new issue:

1. Search [GitHub Issues](https://github.com/Agions/HardSubX/issues) to check if it already exists
2. If not, open a new issue with a clear title and detailed reproduction steps

For bug reports, include:
- HardSubX version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

For feature requests, describe the use case and why it would be valuable.

---

## Submitting Code

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for a bug fix:
   git checkout -b fix/your-bug-fix
   ```
3. **Write code** and ensure all tests pass
4. **Commit changes**
   ```bash
   git commit -m 'feat: add new feature'
   # or
   git commit -m 'fix: resolve issue'
   ```
5. **Push the branch**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

---

## Code Standards

### Frontend (Vue + TypeScript)

- Use Vue 3 Composition API
- TypeScript strict mode enforced
- Run ESLint before committing
- Components use PascalCase
- Composables use `camelCase` prefixed with `use`

### Backend (Rust)

- Follow the official Rust style guidelines
- Run `cargo fmt` before committing
- Run `cargo clippy` to check for issues
- Public APIs require doc comments

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Formatting (no functional change)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Adding or updating tests
- `chore` — Build / tooling

**Example:**
```
feat(ocr): add PaddleOCR engine support

- Add PaddleOCR Rust bindings
- Implement OCR engine abstraction interface
- Add GPU acceleration support

Closes #123
```

---

## Development Environment

### Requirements

- Node.js 18+
- Rust 1.70+
- pnpm 8+

### Local Setup

```bash
git clone https://github.com/Agions/HardSubX.git
cd HardSubX
pnpm install

# Start development server
pnpm tauri dev
```

### Testing

```bash
# Frontend tests
pnpm test

# Rust tests
cargo test
```

### Building

```bash
# Build frontend
pnpm build

# Build Tauri application
pnpm tauri build
```

---

## License

By submitting code, you agree that it will be licensed under the MIT License.
