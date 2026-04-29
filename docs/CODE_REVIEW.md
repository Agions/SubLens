# SubLens 代码审查报告

**项目**: SubLens  
**审查日期**: 2026-04-29  
**审查范围**: TypeScript/Vue 前端 + Rust/Tauri 后端  
**审查维度**: 代码质量、架构、安全  

---

## 一、问题汇总表

| # | 问题描述 | 文件位置 | 严重程度 | 建议 |
|---|---------|---------|---------|------|
| C1 | `any` 类型滥用 - `rawResults` 和 `frameData` 声明为 `any` | `src/composables/useSubtitleExtractor.ts` | 🔴 高 | 替换为具体接口类型 |
| C2 | UUID 生成使用时间戳，不够安全 | `src-tauri/src/commands/utils.rs` | 🔴 高 | 改用 `uuid` crate |
| C3 | ROI 像素裁剪内层循环缺少边界检查 | `src-tauri/src/commands/ocr.rs` | 🔴 高 | 内层循环加边界验证 |
| C4 | 快捷键注册重复导致按键冲突 | `src/composables/useKeyboardShortcuts.ts` | 🟡 中 | 合并相同键的快捷键 |
| C5 | 视频播放器内存泄漏 - Canvas/ImageData 未释放 | `src/composables/useVideoPlayer.ts` | 🟡 中 | 使用对象池或定期清理 |
| C6 | 帧相似度计算 O(n) 采样可优化 | `src-tauri/src/commands/scene.rs` | 🟡 中 | 考虑降采样或早期终止 |
| H1 | 设置同步使用 deep watch 每次按键触发 | `src/composables/useSettingsTab.ts` | 🟡 中 | 改为 debounced 或显式同步 |
| H2 | `find_script` 硬编码了旧项目名路径 | `src-tauri/src/commands/utils.rs` | 🟡 中 | 移除硬编码路径 |
| H3 | `detect_scenes` 函数重复（内部 + 命令） | `src-tauri/src/commands/video.rs` | 🟡 中 | 统一为一个实现 |
| H4 | 字幕预览 `getPreviewThumbnails` 每次调用都重新生成 | `src/composables/useSubtitleList.ts` | 🟡 中 | 增加缓存机制 |
| M1 | TypeScript 参数缺少输入校验 | `src/composables/useSubtitleExtractor.ts` | 🟡 中 | 增加 startFrame/endFrame 校验 |
| M2 | `get_video_metadata` 对无效路径只做文件存在检查 | `src-tauri/src/commands/video.rs` | 🟡 中 | 增加格式/完整性校验 |
| M3 | 重复的 ASS 时间戳格式化函数 | `src-tauri/src/commands/export.rs` | 🟡 中 | 提取为共享工具函数 |
| M4 | Rust 错误处理模式不统一 | 多个 `commands/*.rs` | 🟡 低 | 建立统一错误类型 |
| M5 | Vue 组件缺少 Tauri invoke 错误边界 | 多处 `*.vue` | 🟡 低 | 增加统一错误处理 |
| L1 | `useImagePreprocessor` 状态管理函数缺少空值检查 | `src/composables/useImagePreprocessor.ts` | 🟢 低 | 增加防御性检查 |
| L2 | `useBatchProcessor` Promise 链无错误处理 | `src/composables/useBatchProcessor.ts` | 🟢 低 | 增加 catch 块 |
| L3 | Pinia store 在 SSR/SSG 环境可能状态污染 | `src/stores/*.ts` | 🟢 低 | 增加环境判断 |

---

## 二、详细分析

### 2.1 TypeScript 严格性

**`any` 类型滥用 (C1)** — `useSubtitleExtractor.ts`

```typescript
// Line 89, 106
const rawResults: any = await invoke('process_frame', { ... })
const frameData: any = ...
```

问题：`any` 绕过类型检查，失去 TypeScript 强类型保护。建议：

```typescript
interface OCRResult {
  text: string;
  confidence: number;
  bounding_box: BoundingBox;
}

// 使用 unknown +类型守卫
const result = await invoke<OCRResult>('process_frame', { ... })
```

**配置对象缺乏类型约束** — `useSubtitleExtractor.ts`

`extractOptions` 参数无类型校验，传入无效配置只能到 Rust 层才报错。

---

### 2.2 性能问题

**内存泄漏 (C5)** — `useVideoPlayer.ts`

`captureFrame()` 和 `captureFrameAsDataURL()` 每次创建新 Canvas 和 ImageData 对象，但从不释放：

```typescript
function captureFrame(): ImageData | null {
  const canvas = document.createElement('canvas')  // 泄漏
  // ...
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
```

建议：使用对象池或可复用的 Canvas 单例。

**O(n) 采样可优化 (C6)** — `scene.rs calculate_frame_similarity`

```rust
let step = ((frame1_data.len() / 4) / sample_count).max(1);
for i in 0..sample_count {
    let idx = i * step * 4;
    // 每像素做 RGB 距离计算
    let diff = ((r1 - r2).powi(2) + (g1 - g2).powi(2) + (b1 - b2).powi(2)).sqrt();
}
```

当前实现对每帧采 1000 个点，可考虑：
- 采样间隔动态调整
- 或使用直方图差分替代像素级比较

**Settings deep watch 性能 (H1)** — `useSettingsTab.ts`

```typescript
watch(localSettings, (newSettings) => {
  Object.assign(settingsStore.settings, newSettings)
}, { deep: true })
```

每次按键触发整个对象深比较，建议使用 `shallowRef` 或显式同步。

---

### 2.3 错误处理

**Rust ROI 裁剪边界漏洞 (C3)** — `ocr.rs`

```rust
fn crop_frame_to_roi(...) -> Result<Vec<u8>, String> {
    // 外层检查了 roi_x + roi_w > img_width
    // 但内层循环直接用 src_idx + 3 < frame_data.len() 检查
    for y in roi_y..(roi_y + roi_h) {
        for x in roi_x..(roi_x + roi_w) {
            let src_idx = ((y * img_width + x) * 4) as usize;
            if src_idx + 3 < frame_data.len() {  // 只在有足够字节时才写入
                cropped.push(frame_data[src_idx]);  // 这里 src_idx 可能已越界
            }
        }
    }
```

`src_idx + 3 < frame_data.len()` 仅验证有足够字节，但 `src_idx` 本身可能已超出 `frame_data.len()`。应改为 `src_idx + 3 >= frame_data.len() ? break : ...`。

**BatchProcessor 无错误处理 (L2)** — `useBatchProcessor.ts`

```typescript
// 无 catch 块，Promise 拒绝会导致未处理的 rejection
this.processingQueue.push(new Promise(async (resolve) => { ... }))
```

**Vue 组件缺少错误边界** — `*.vue`

Tauri `invoke` 调用分散在组件中，无统一错误处理。建议封装 `invoke` wrapper。

---

### 2.4 代码重复

**重复的快捷键定义 (C4)** — `useKeyboardShortcuts.ts`

```typescript
{ key: 'ArrowLeft', action: () => videoPlayer.seekRelative(-1), ... },
{ key: 'ArrowLeft', shift: true, action: () => videoPlayer.seekRelative(-10), ... },
```

相同键的快捷键注册为独立项，匹配时 `return` 导致后续快捷键无法触发。Shift+ArrowLeft 的快捷键永远不会被执行。

**重复的 ASS 时间戳函数 (M3)** — `export.rs`

`format_timestamp_ass` 实际与 VTT/SRT 的时间戳格式化逻辑高度相似，可抽象为通用函数。

**detect_scenes 重复实现 (H3)** — `video.rs`

```rust
// 作为命令导出
#[tauri::command]
pub async fn detect_scenes(...) // 实际调用 scenedetect

// 内部异步函数
pub async fn detect_scenes(...) // 实际也调用 ffmpeg
```

两处实现用途不同但命名冲突，且内部版本未被使用。

---

### 2.5 命名规范

- `confidenceThreshold` vs `confidence_threshold` — TS/Rust 混用下划线命名
- `get_video_metadata` (Rust) vs `getVideoMetadata` (TS) — 无统一命名约定
- `extractCroppedFrameAtTime` 过长，可考虑 `extractFrameAtTime`（ROI 作为参数）

---

### 2.6 架构维度

**Store 与 Composables 耦合** — 各 composables 直接引用 store

```typescript
// useVideoPlayer.ts
const projectStore = useProjectStore()

// useTheme.ts
const settingsStore = useSettingsStore()
```

当前规模可接受，但随着项目扩大建议：
- Composables 只暴露方法，不直接暴露 store 实例
- 或通过依赖注入传递 store

**职责单一性** — `useSubtitleExtractor.ts` 承担了：
- OCR 参数配置
- 帧处理流程
- 结果后处理
- 错误重试

建议拆分：配置逻辑 → 处理流程 → 后处理器

**可测试性** — `core/` 模块纯函数偏少，大部分逻辑依赖 Pinia store 和 Tauri invoke，难以单元测试。建议：
- 提取纯函数到独立模块
- 使用依赖注入便于 mock

---

### 2.7 安全维度

**UUID 不安全 (C2)** — `utils.rs`

```rust
pub fn uuid_v4() -> String {
    let random_part = (now.as_nanos() ^ (std::process::id() as u128 * 0x5deece66d)) % 0xfffffffffffff;
    // 时间戳可预测，非密码学安全
}
```

用于临时文件命名，但时间戳信息可能泄露会话细节。建议使用 `uuid` crate 的 `Uuid::new_v4()`。

**路径硬编码 (H2)** — `utils.rs find_script`

```rust
Some(PathBuf::from("/root/.openclaw/workspace/HardSubX/src-tauri/scripts").join(script_name))
```

引用了旧项目名 HardSubX，应移除或替换为相对路径。

**Rust 命令输入验证** — `video.rs get_video_metadata`

仅检查文件存在性，未验证文件是否为有效视频格式。恶意构造的空文件可通过检查但后续 ffmpeg 处理失败。

---

## 三、优化建议

### 3.1 高优先级

1. **修复快捷键冲突** — `useKeyboardShortcuts.ts`
   ```typescript
   // 按键合并处理
   function handleKeyDown(e: KeyboardEvent) {
     // ...
     if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
       // 不 return，继续检查其他快捷键（更精确的优先）
     }
   }
   ```

2. **替换 any 类型** — `useSubtitleExtractor.ts`
   ```typescript
   interface OCRResult {
     text: string;
     confidence: number;
     bounding_box: { x: number; y: number; width: number; height: number };
   }
   const rawResults = await invoke<OCRResult[]>('process_frame', {...})
   ```

3. **修复 ROI 裁剪边界** — `ocr.rs`
   ```rust
   for y in roi_y..(roi_y + roi_h) {
     for x in roi_x..(roi_x + roi_w) {
       let src_idx = ((y * img_width + x) * 4) as usize;
       if src_idx + 3 >= frame_data.len() { break; }  // 修正
       // ...
     }
   }
   ```

4. **使用安全的 UUID** — `utils.rs`
   ```rust
   use uuid::Uuid;
   pub fn generate_id() -> String {
     Uuid::new_v4().to_string()
   }
   ```

### 3.2 中优先级

5. **添加视频元数据校验** — `video.rs`
   ```rust
   if !path_obj.exists() {
     return Err(format!("File not found: {}", path));
   }
   // 额外检查文件大小和扩展名
   ```

6. **优化 Settings 同步** — `useSettingsTab.ts`
   ```typescript
   // 使用 shallowRef + 手动同步
   const localSettings = shallowRef({ ... })
   function syncToStore() { ... }
   ```

7. **移除硬编码路径** — `utils.rs`
   ```rust
   // 删除 HardSubX 路径，仅保留 CARGO_MANIFEST_DIR 相对路径
   ```

8. **统一错误处理** — 建立 `AppError` 枚举替代字符串错误

### 3.3 低优先级

9. **添加缓存层** — `useSubtitleList.ts` 的 `getPreviewThumbnails`
10. **统一命名约定** — TS 使用 camelCase，Rust 使用 snake_case，明确定义映射规则
11. **添加错误边界** — Vue 组件的 `invoke` 调用封装
12. **性能优化** — Canvas 对象池、批量操作合并

---

## 四、统计摘要

| 维度 | 计数 |
|------|------|
| 🔴 高严重 | 4 |
| 🟡 中严重 | 10 |
| 🟢 低严重 | 3 |
| **总计** | **17** |

| 类型 | 计数 |
|------|------|
| TypeScript 问题 | 9 |
| Rust 问题 | 6 |
| 架构问题 | 2 |
| **总计** | **17** |

---

*审查完成 | SubLens Dev Team*