/**
 * core/ — SubLens 核心业务逻辑模块
 *
 * 子模块：
 * - Pipeline         后处理管道（4阶段清洗）
 * - SceneDetect     场景变化检测
 * - Exporter        多格式导出引擎
 * - Calibrator       置信度校准
 */

// Re-export all public APIs
export { Pipeline, DEFAULT_PIPELINE_OPTIONS } from './Pipeline'
export type { PipelineOptions } from './Pipeline'

export { SceneDetect, DEFAULT_SCENE_DETECTOR_OPTIONS } from './SceneDetect'
export type { SceneDetectOptions } from './SceneDetect'

export { Exporter, getExporter } from './Exporter'
export type { ExportFormat, ExportResult } from './Exporter'

export { Calibrator, getCalibrator, langToScript } from './Calibrator'
export type { CalibrationResult, CalibrationSignal, Script } from './Calibrator'
