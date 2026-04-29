# SubLens 交互设计优化方案

> 分析日期：2026-04-29
> 分析范围：src/components/、src/composables/use*.ts、src/themes/、index.html
> 技术栈：Tauri + React + TypeScript + Vite

---

## 一、当前问题清单

### 1. 用户体验（UX）

| # | 问题 | 位置 | 严重度 |
|---|------|------|--------|
| UX-1 | **字幕提取过程中无取消按钮** | OCRTab / 整体提取流程 | 🔴 高 |
| UX-2 | **删除字幕无二次确认** | SubtitleList 删除按钮 | 🔴 高 |
| UX-3 | **批量删除低置信度字幕无确认** | SubtitleList footer batch-bar | 🔴 高 |
| UX-4 | **快捷键帮助弹窗无键盘焦点管理** | KeyboardShortcutsHelp.vue | 🟡 中 |
| UX-5 | **视频加载错误后无法重试** | VideoPreview.vue | 🟡 中 |
| UX-6 | **字幕编辑表单无实时校验反馈** | SubtitleList edit-form | 🟡 中 |
| UX-7 | **进度状态不够精确** — 只显示百分比，无 ETA、剩余时间 | ProgressTab / StatusBar | 🟡 中 |
| UX-8 | **拖放文件后无明确成功反馈** | VideoPreview drag-drop | 🟢 低 |
| UX-9 | **字幕编辑时快捷键仍然生效** | SubtitleList textarea | 🟡 中 |
| UX-10 | **删除选中字幕的快捷键是 Delete，但未显示在帮助中** | KeyboardShortcutsHelp.vue | 🟢 低 |
| UX-11 | **OCR 引擎选择卡无选中状态视觉反馈** | OCRTab engine-card | 🟡 中 |
| UX-12 | **导出不显示进度**，用户不知道导出到哪了 | ExportTab | 🟡 中 |

### 2. 视觉设计（UI）

| # | 问题 | 位置 | 严重度 |
|---|------|------|--------|
| UI-1 | **浅色模式下 `var(--primary-dim)` 和 `--primary-glow` 未定义**，主题变量只在 CSS 变量中定义，浅色主题缺失 | themes/index.ts | 🔴 高 |
| UI-2 | **浅色主题和深色主题的 OCRTab 语言 chip 颜色使用了硬编码灰色**，不随主题变化 | OCRTab | 🟡 中 |
| UI-3 | **SubtitleList 的 conf-heatmap 颜色为固定 CSS 变量**（amber/rose/emerald），需要根据 confidence 动态计算 | SubtitleList | 🟡 中 |
| UI-4 | **OCRTab engine-card hover 时无 scale 变换**，体验上不如 ToolBar 按钮的 `pressable` 反馈 | OCRTab engine-card | 🟢 低 |
| UI-5 | **侧边栏标签（tab-bar）切换时无动画过渡**，显得生硬 | SidePanel tab-bar | 🟢 低 |
| UI-6 | **视频预览区的播放/暂停图标切换无过渡动画** | VideoPreview ctrl-play | 🟢 低 |
| UI-7 | **`useKeyboardShortcuts` 中 Shift+ArrowLeft/Right 与单独 ArrowLeft/Right 存在冲突**，后者永远匹配不到（因为 shift 版先被触发） | useKeyboardShortcuts.ts | 🔴 高 |

### 3. 可访问性（Accessibility）

| # | 问题 | 位置 | 严重度 |
|---|------|------|--------|
| A11y-1 | **大量按钮缺少 ARIA label** — 如播放、跳过、撤销/重做等图标按钮 | VideoPreview, ToolBar, SubtitleList | 🔴 高 |
| A11y-2 | **SubtitleList 的 role="list" / role="listitem" 使用不当** — `<div role="list">` 包含 `<div role="listitem">`，但卡片内部还嵌套了 `role="listitem"` 的元素 | SubtitleList.vue | 🟡 中 |
| A11y-3 | **Timeline 的 hover bubble 无 ARIA 标注**，屏幕阅读器无法获知时间预览 | VideoPreview timeline | 🟡 中 |
| A11y-4 | **视频控件（controls）区域没有关联到 video 元素的标签** — `aria-label` 仅加在按钮上，未关联整体 controls | VideoPreview controls | 🟡 中 |
| A11y-5 | **OCRTab 语言选择 chip 无 `aria-pressed` 状态**，选中状态对屏幕阅读器不透明 | OCRTab lang-chip | 🟡 中 |
| A11y-6 | **Filter tabs（all/high/mid/low）缺少 `aria-selected`** | SubtitleList conf-filter | 🟡 中 |
| A11y-7 | **Toast 通知（SubtitleToast）无 ARIA live region**，屏幕阅读器无法感知字幕切换 | SubtitleToast | 🟡 中 |
| A11y-8 | **搜索框缺少 `aria-label` 或关联的 `<label>` 元素** | SubtitleList search-input | 🟡 中 |
| A11y-9 | **Modal 缺少标题 `aria-labelledby` 关联**，只用 `title` 属性不够 | Modal.vue | 🟡 中 |

---

## 二、优化方案（分优先级）

### 🔴 P0 — 必须修复（影响核心流程）

#### P0-1：字幕提取取消功能（UX-1）
**现状**：用户点击"提取字幕"后，提取过程无法取消，长时间等待时只能强制关闭应用。

**方案**：在 OCRTab 或提取进度区域添加"取消"按钮，`subtitleStore.isExtracting` 状态下显示。

**实现**：
```typescript
// stores/subtitle.ts 新增
function cancelExtraction() {
  isExtracting.value = false
  // 通知后端中断提取任务
  subtitleStore.$patch({ isExtracting: false, extractProgress: 0 })
}
```

#### P0-2：删除确认（UX-2、UX-3）
**现状**：Delete 键和"删除全部"按钮均无确认，可能误删。

**方案**：使用 `Modal` 组件实现二次确认，区分"单条删除"和"批量删除"场景。

**实现**：
```vue
<!-- SubtitleList.vue -->
<Modal
  :open="showDeleteConfirm"
  title="确认删除"
  @close="showDeleteConfirm = false"
>
  <p v-if="deleteCount === 1">确定要删除这条字幕吗？</p>
  <p v-else>确定要删除这 {{ deleteCount }} 条字幕吗？此操作不可撤销。</p>
  <template #footer>
    <button class="btn btn-ghost" @click="showDeleteConfirm = false">取消</button>
    <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
  </template>
</Modal>
```

#### P0-3：快捷键冲突（UI-7）
**现状**：`Shift+ArrowLeft` 和 `ArrowLeft` 写在一起时，未加 `shift` 的版本永远不会触发（因为按 Shift 时必定触发带 Shift 的版本）。

**方案**：分离带 Shift 和不带 Shift 的快捷键处理逻辑，或调整顺序让精确匹配优先。

#### P0-4：浅色主题变量缺失（UI-1）
**现状**：`themes/index.ts` 中 `lightTheme` 定义了 `--primary` 但缺少 `--primary-dim` 和 `--primary-glow`，导致这些 CSS 变量在浅色模式下失效。

**方案**：补充定义：
```typescript
// lightTheme
'primary-dim': 'rgba(0, 122, 255, 0.15)',
'primary-glow': 'rgba(0, 122, 255, 0.3)',
```

#### P0-5：ARIA label 缺失（A11y-1）
**现状**：图标按钮仅有 `title` 属性，屏幕阅读器无法正确读出。

**方案**：为所有图标按钮添加 `aria-label`（title 属性辅助显示 tooltip，aria-label 供屏幕阅读器使用）。

---

### 🟡 P1 — 重要优化（提升体验）

#### P1-1：字幕编辑时禁用全局快捷键（UX-9）
**现状**：在编辑框输入文本时，Delete/ Ctrl+Z 等快捷键仍然触发，可能意外删除字幕。

**方案**：编辑状态下阻止快捷键冒泡：
```typescript
// useKeyboardShortcuts.ts handleKeyDown
if (editingId.value) {
  const target = e.target as HTMLElement
  if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return
}
```

#### P1-2：OCR 引擎选中状态（UX-11）
**现状**：引擎卡片无选中高亮，用户不确定当前选中了哪个。

**方案**：添加 `active` class + 视觉高亮（已在 CSS 中定义，需激活逻辑）：
```vue
:class="['engine-card', { active: selectedEngine === engine.id }]"
```

#### P1-3：导出进度显示（UX-12）
**现状**：导出操作无反馈，用户不知道是否完成、进度如何。

**方案**：在 ExportTab 添加导出进度条：
```vue
<template v-if="isExporting">
  <div class="export-progress">
    <div class="progress-bar" :style="{ width: exportProgress + '%' }" />
    <span>正在导出... {{ exportProgress }}%</span>
  </div>
</template>
```

#### P1-4：字幕编辑表单校验（UX-6）
**现状**：时间输入格式错误时无即时反馈。

**方案**：使用实时正则校验，错误时输入框变红 + 提示文字：
```vue
:class="{ 'input-error': !isValidTime(editStartTime) }"
// :style="{ borderColor: isValidTime(editStartTime) ? '' : 'var(--error)' }"
```

#### P1-5：ARRA live region for Toast（A11y-7）
**现状**：`SubtitleToast` 无 ARIA live region，新字幕切换时屏幕阅读器不知道。

**方案**：
```vue
<div aria-live="polite" aria-atomic="true" class="subtitle-toast">
  字幕切换至：{{ toastText }}
</div>
```

#### P1-6：Filter tabs aria-selected（A11y-6）
**现状**：置信度过滤器 tabs 选中状态对屏幕阅读器不透明。

**方案**：
```vue
role="tab"
:aria-selected="subtitleStore.confidenceFilter === level"
```

#### P1-7：视频错误重试（UX-5）
**现状**：视频加载失败后无重试入口。

**方案**：在 error-state 中添加"重新加载"按钮：
```vue
<button class="retry-btn" @click="loadVideo(projectStore.videoPath)">
  重新加载
</button>
```

#### P1-8：快捷键帮助中补充 Delete 快捷键（UX-10）
**现状**：`KeyboardShortcutsHelp.vue` 过滤条件遗漏了 Delete 键。

**方案**：
```typescript
{ name: '字幕操作', shortcuts: shortcuts.filter(s =>
    ['Delete', 'z', 'a', 'j', 'k'].includes(s.key) ||
    (s.key === 'z' && s.ctrl)) },
```

#### P1-9：置信度热力图颜色动态化（UI-3）
**现状**：`getConfidenceHeatmap` 返回固定渐变色，对低/中/高三种情况区分度不够。

**方案**：确保 `conf-heatmap` 使用 OKLCH 渐变，视觉上从绿色→黄色→红色平滑过渡。

---

### 🟢 P2 — 体验完善（锦上添花）

#### P2-1：拖放成功 Toast 提示（UX-8）
**现状**：拖放视频文件后，仅靠视频加载成功反馈，无明确的"导入成功"提示。

**方案**：复用 SubtitleToast 机制，导入成功时短暂显示文件名。

#### P2-2：进度 ETA 显示（UX-7）
**现状**：提取进度只显示百分比，无法估算剩余时间。

**方案**：在 `useProgressTab` 中基于已用时间和进度估算剩余时间：
```typescript
const estimatedRemaining = computed(() => {
  if (!startTime.value || progress.value === 0) return null
  const elapsed = Date.now() - startTime.value
  const remaining = elapsed / progress.value * (100 - progress.value)
  return formatDuration(remaining)
})
```

#### P2-3：播放图标过渡动画（UI-6）
**现状**：播放→暂停图标切换是瞬时的，无过渡动画。

**方案**：给 `.ctrl-icon` 添加 `transition: opacity 150ms` 或使用 CSS `v-if/else` + transition。

#### P2-4：侧边栏标签切换动画（UI-5）
**现状**：`v-if` 切换标签页时无淡入动画。

**方案**：给 tab-content 添加 `<Transition name="fade">`。

#### P2-5：OCRTab 语言 Chip 的 hover 效果（UI-4）
**现状**：engine-card 没有 pressable 反馈。

**方案**：给 `.engine-card` 添加 `cursor: pointer` + hover scale transform。

#### P2-6：搜索框 ARIA label（A11y-8）
**方案**：
```vue
<input
  aria-label="搜索字幕内容"
  role="searchbox"
  ...
/>
```

#### P2-7：Modal 标题关联（A11y-9）
**方案**：Modal 添加 `aria-labelledby` 指向标题元素 ID。

---

## 三、具体实现建议

### 3.1 目录结构建议

```
src/
  components/
    common/
      ConfirmDialog.vue    # 新增：通用确认弹窗
      Toast.vue            # 抽象通用 Toast 组件
    layout/
      tabs/
        ProgressTab.vue    # 重构：增加 ETA 和取消按钮
    subtitle/
      SubtitleList.vue     # 重构：删除确认、ARIA 增强
  composables/
    useKeyboardShortcuts.ts  # 修复：快捷键冲突 + 编辑状态禁用
    useExportTab.ts          # 新增：导出进度状态
  stores/
    subtitle.ts              # 新增：cancelExtraction action
```

### 3.2 关键重构细节

#### useKeyboardShortcuts.ts 冲突修复

```typescript
// 按修饰键数量降序排列，确保更精确的匹配优先
function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }
  if (editingId.value) return  // P1-1

  const matching = shortcuts.filter(s => {
    const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()
    const ctrlMatch = !!s.ctrl === (e.ctrlKey || e.metaKey)
    const shiftMatch = !!s.shift === e.shiftKey
    const altMatch = !!s.alt === e.altKey
    return keyMatch && ctrlMatch && shiftMatch && altMatch
  })

  // 优先匹配带修饰键的
  matching.sort((a, b) => (b.ctrl ? 1 : 0) + (b.shift ? 1 : 0) - (a.ctrl ? 1 : 0) - (a.shift ? 1 : 0))
  if (matching[0]) {
    e.preventDefault()
    matching[0].action()
  }
}
```

#### SubtitleList 删除确认流程

```typescript
const showDeleteConfirm = ref(false)
const pendingDeleteIds = ref<string[]>([])

function deleteSelected() {
  if (!subtitleStore.selectedId) return
  pendingDeleteIds.value = [subtitleStore.selectedId]
  showDeleteConfirm.value = true
}

function batchDeleteLowConfidence() {
  pendingDeleteIds.value = subtitleStore.lowConfidenceSubtitles.map(s => s.id)
  showDeleteConfirm.value = true
}

function confirmDelete() {
  pendingDeleteIds.value.forEach(id => subtitleStore.deleteSubtitle(id))
  showDeleteConfirm.value = false
  pendingDeleteIds.value = []
}
```

#### OCRTab 引擎选中状态

```typescript
// OCRTab.vue
const selectedEngine = ref('paddle')

// engine-card 添加 :class 绑定
:class="['engine-card', { active: selectedEngine === engine.id }]"
@clock="selectedEngine = engine.id"
```

### 3.3 可访问性检查清单

完成 P0/P1 优化后，确保满足：

- [ ] 所有 `<button>` 有可见文本或 `aria-label`
- [ ] 所有 `input[type=text]` 有 `<label>` 或 `aria-label`
- [ ] Modal 使用 `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- [ ] Toast 使用 `aria-live` 区域
- [ ] 快捷键帮助弹窗可通过键盘打开/关闭（已有 `Escape` 处理，需测试）
- [ ] 颜色对比度满足 WCAG AA（当前深色主题 primary #0A84FF 配白字通过，浅色主题需验证）
- [ ] 所有交互元素可通过 Tab 键聚焦
- [ ] Focus trap 在 Modal 打开时生效

---

## 四、优先实施路线图

```
Phase 1（P0）— 止血修复
├─ UX-1  字幕提取取消按钮
├─ UX-2  单条删除确认
├─ UX-3  批量删除确认
├─ UI-7  快捷键冲突修复
├─ UI-1  浅色主题变量补全
└─ A11y-1 ARIA label 补全

Phase 2（P1）— 体验提升
├─ UX-9  编辑状态禁用快捷键
├─ UX-11 OCR 引擎选中高亮
├─ UX-12 导出进度显示
├─ UX-6  编辑表单校验
├─ A11y-7 Toast ARIA live
├─ A11y-6 Filter tabs aria-selected
├─ UX-5  视频加载失败重试
└─ UX-10 快捷键帮助补充 Delete

Phase 3（P2）— 体验完善
├─ UX-7  进度 ETA 估算
├─ UI-5  标签页切换动画
├─ UI-6  播放图标过渡动画
└─ 颜色对比度审计（浅色主题）
```

---

_文档版本：1.0_
_维护者：UI/UX 评审_