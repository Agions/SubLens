# Calibrator — 置信度校准

## 概述

`Calibrator.ts` 负责根据文本特征对 OCR 置信度进行加权校准，输出更可靠的置信度评估。

设计原则：纯函数、规则驱动、易于扩展。

## 质量信号

每条 OCR 结果可附带多个**质量信号**（Quality Signals），用于标识潜在问题：

```typescript
type QualitySignal =
  | 'mixed_language'    // 混语种
  | 'ultra_short'       // 极短文本
  | 'repeated_chars'   // 重复字符
  | 'bracket_mismatch'  // 括号不匹配
  | 'uppercase_ratio'   // 大写比例过高
  | 'no_alphabetic'    // 无字母字符
```

## 校准规则

| 信号 | 触发条件 | 置信度调整 | 说明 |
|:---|:---|:---|:---|
| `mixed_language` | 同时存在 CJK + Latin 字符 | × 0.90 | 混排文本识别不稳定 |
| `ultra_short` | 字符数 ≤ 2 | × 0.80 | 短文本噪声多 |
| `repeated_chars` | 连续 3+ 相同字符 | × 0.75 | OCR 典型错误 |
| `bracket_mismatch` | 中文括号不成对 | × 0.95 | 文本可能不完整 |
| `uppercase_ratio` | 拉丁字母中大写 > 70% | × 0.90 | 不符合正常大小写分布 |
| `no_alphabetic` | 全文无任何字母 | × 0.85 | 可能是纯符号/数字 |

## 使用方式

```typescript
import { Calibrator } from '@/core/Calibrator'

const calibrator = new Calibrator()

const result = calibrator.calibrate({
  text: 'Hello World',
  confidence: 0.92,
  language: 'en'
})

// result:
// {
//   calibrated: 0.92,
//   signals: [],
//   issues: []
// }
```

### 带问题的示例

```typescript
const result = calibrator.calibrate({
  text: '가가가가',      // 韩文重复
  confidence: 0.95,
  language: 'ko'
})

// result:
// {
//   calibrated: 0.7125,  0.95 * 0.75
//   signals: ['repeated_chars'],
//   issues: ['韩文字符连续重复，可能为 OCR 噪声']
// }
```

## 内部实现

```typescript
interface CalibrationRule {
  signal: QualitySignal
  condition: (text: string, lang: string) => boolean
  weight: number
  message: string
}

const rules: CalibrationRule[] = [
  {
    signal: 'repeated_chars',
    condition: (text) => /(.){2,}/.test(text),
    weight: 0.75,
    message: '连续重复字符，可能是 OCR 噪声',
  },
  {
    signal: 'ultra_short',
    condition: (text) => text.trim().length <= 2,
    weight: 0.80,
    message: '文本过短，置信度有限',
  },
  // ... 更多规则
]

function calibrate(input: CalibrateInput): CalibrateResult {
  const { text, confidence, language } = input
  let calibrated = confidence
  const signals: QualitySignal[] = []
  const issues: string[] = []

  for (const rule of rules) {
    if (rule.condition(text, language)) {
      calibrated *= rule.weight
      signals.push(rule.signal)
      issues.push(rule.message)
    }
  }

  return { calibrated, signals, issues }
}
```

## 配置

```typescript
const calibrator = new Calibrator({
  // 自定义规则（追加到默认规则）
  customRules: [
    {
      signal: 'custom',
      condition: (text) => text.includes('???'),
      weight: 0.5,
      message: '包含未知字符',
    }
  ],
  // 设为 false 禁用默认规则
  useDefaultRules: true,
})
```

## 置信度等级

校准后的置信度用于划分质量等级：

| 等级 | 范围 | 颜色 | 建议操作 |
|:---|:---|:---|:---|
| 高 | ≥ 0.85 | 绿色 | 可直接导出 |
| 中 | 0.60 ~ 0.85 | 黄色 | 建议审核 |
| 低 | < 0.60 | 红色 | 需要修正 |

## 与 Pipeline 的配合

`Calibrator` 通常在 Pipeline 的 Stage 0 之前调用：

```
RawSubtitle (confidence: OCR原始)
    │ Calibrator.calibrate()
    ▼
CalibratedSubtitle (confidence: 加权后)
    │ Pipeline.process()
    ▼
CleanSubtitle
```

## 测试

```bash
pnpm test src/core/Calibrator.ts
```
