/**
 * core/ — SubLens 核心业务逻辑模块
 *
 * 子模块：
 * - SubtitlePipeline   后处理管道（4阶段清洗）
 * - SceneDetector      场景变化检测
 * - SubtitleExporter   多格式导出引擎
 * - ConfidenceCalibrator  置信度校准
 */

// Re-export all public APIs
export { SubtitlePipeline, DEFAULT_PIPELINE_OPTIONS } from './SubtitlePipeline'
export type { PipelineOptions } from './SubtitlePipeline'

export { SceneDetector, DEFAULT_SCENE_DETECTOR_OPTIONS } from './SceneDetector'
export type { SceneDetectorOptions } from './SceneDetector'

export { SubtitleExporter, getExporter } from './SubtitleExporter'
export type { ExportFormat, ExportResult } from './SubtitleExporter'

export { ConfidenceCalibrator, getCalibrator } from './ConfidenceCalibrator'
export type { CalibrationResult, CalibrationSignal } from './ConfidenceCalibrator'
