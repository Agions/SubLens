# Calibrator

基于语言脚本（CJK / Latin）的多信号加权置信度校准。

## 签名

```typescript
function calibrateConfidence(
  subtitles: SubtitleItem[],
  signals: ConfidenceSignal[]
): SubtitleItem[]
```

## 信号类型

### 惩罚信号（降低置信度）

| 信号 | 说明 |
|:---|:---|
| `mixedLanguage` | 混语（同一字幕含 CJK + Latin）|
| `tooShort` | 文本过短（< 3 字符）|
| `repeatedChars` | 重复字符过多 |
| `isolatedCjk` | 孤立 CJK 字符 |
| `quoteMismatch` | 引号不平衡 |
| `latinUppercase` | 拉丁文本全大写（OCR 误识特征）|
| `trailingComma` | 尾随逗号（字幕完整结尾通常无逗号）|

### 奖励信号（提升置信度）

| 信号 | 说明 |
|:---|:---|
| `charDiversity` | 字符多样性高 |
| `sentenceComplete` | 句子完整结尾（。！？.!?）|
| `reasonableLength` | 字幕长度合理（3–80 字符）|

## 示例

```typescript
import { calibrateConfidence } from '@/core/Calibrator'

const calibrated = calibrateConfidence(subtitles, [
  'mixedLanguage',
  'tooShort',
  'repeatedChars'
])
```

## 评分范围

置信度最终校准到 0.0–1.0：

| 等级 | 范围 | 说明 |
|:---|:---|:---|
| 高 | ≥ 0.85 | 可直接使用 |
| 中 | 0.60–0.85 | 建议检查 |
| 低 | < 0.60 | 需要人工校对 |
