import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useOCREngine } from './useOCREngine'
import { type OCREngine } from '@/types/video'

export interface BatchJob {
  id: string
  inputPath: string
  outputPath: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  stageLabel?: string
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface BatchOptions {
  outputDir: string
  formats: ('srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'txt' | 'lrc' | 'sbv' | 'csv')[]
  roiPreset: string
  ocrEngine: OCREngine
  languages: string[]
  sceneThreshold: number
  confidenceThreshold: number
  maxConcurrency?: number
}

/**
 * 生成加密安全的唯一ID
 */
function generateJobId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `job-${globalThis.crypto.randomUUID()}`;
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useBatchProcessor() {
  const jobs = ref<BatchJob[]>([])
  const currentJob = ref<BatchJob | null>(null)
  const isProcessing = ref(false)

  // Timing for ETA
  const batchStartTime = ref<number | null>(null)
  const avgProcessingTime = ref<number>(0) // ms per completed job

  // Overall queue progress (0-100)
  const overallProgress = computed(() => {
    if (jobs.value.length === 0) return 0
    let completed = 0, inProgress = 0
    for (const job of jobs.value) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        completed++
      } else if (job.status === 'processing') {
        inProgress += job.progress
      }
    }
    return Math.round((completed * 100 + inProgress) / jobs.value.length)
  })

  // Estimated seconds remaining
  const estimatedTimeRemaining = computed(() => {
    if (!isProcessing.value || jobs.value.length === 0) return null
    let remaining = 0
    for (const job of jobs.value) {
      if (job.status === 'pending' || job.status === 'processing') remaining++
    }
    if (remaining === 0) return null
    const avgMs = avgProcessingTime.value || 30000
    return Math.ceil((remaining * avgMs) / 1000)
  })

  function updateAvgProcessingTime(jobDurationMs: number) {
    const prev = avgProcessingTime.value
    const count = jobs.value.filter(j => j.status === 'completed').length
    // Running average
    avgProcessingTime.value = prev === 0
      ? jobDurationMs
      : Math.round(prev * (count - 1) / count + jobDurationMs / count)
  }

  // Add files to queue
  function addToQueue(inputPaths: string[], options: BatchOptions): BatchJob[] {
    const newJobs: BatchJob[] = inputPaths.map(inputPath => ({
      id: generateJobId(),
      inputPath,
      outputPath: options.outputDir,
      status: 'pending',
      progress: 0
    }))
    
    jobs.value.push(...newJobs)
    return newJobs
  }

  // Start batch processing with concurrency control.
  // Callback-driven slot manager replaces the previous setInterval polling.
  async function startBatch(options: BatchOptions) {
    if (isProcessing.value) return

    isProcessing.value = true
    batchStartTime.value = Date.now()

    const maxConcurrency = options.maxConcurrency || 2
    const allPending = jobs.value.filter(j => j.status === 'pending')
    let running = 0       // active job count
    let pendingIndex = 0  // next job to enqueue from allPending

    // Mutable callback invoked whenever a job slot frees up.
    // Initial no-op; replaced by the drain Promise once that is created.
    let onSlotFree: () => void = () => {}

    function enqueue(job: BatchJob) {
      running++
      job.status = 'processing'
      job.startedAt = new Date()
      const start = Date.now()
      processJob(job, options)
        .then(() => { job.status = 'completed'; job.progress = 100 })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e)
          job.status = 'failed'
          job.error = msg
          console.error(`[Batch] Job ${job.id} failed:`, msg)
        })
        .finally(() => {
          running--
          job.completedAt = new Date()
          updateAvgProcessingTime(Date.now() - start)
          onSlotFree() // signal slot availability — drives the next enqueue
        })
    }

    // Kick off the initial window
    for (let i = 0; i < Math.min(maxConcurrency, allPending.length); i++) {
      enqueue(allPending[i])
      pendingIndex++
    }

    // Drain: resolves when the queue is exhausted AND all running jobs finish.
    // While active, onSlotFree keeps the pipeline topped up.
    await new Promise<void>(resolve => {
      onSlotFree = () => {
        if (!isProcessing.value) { resolve(); return }
        if (pendingIndex >= allPending.length && running === 0) { resolve(); return }
        if (running < maxConcurrency && pendingIndex < allPending.length) {
          enqueue(allPending[pendingIndex++])
        }
      }
      // Check immediately in case the queue was already small enough
      onSlotFree()
    })

    isProcessing.value = false
    batchStartTime.value = null
    currentJob.value = null
  }

  async function processJob(job: BatchJob, options: BatchOptions) {
    const jobStart = Date.now()
    try {
      // 1. Get video metadata via Tauri backend
      job.progress = 5
      job.stageLabel = '读取视频元数据'
      const videoMeta = await invoke<{
        path: string
        width: number
        height: number
        duration: number
        fps: number
        total_frames: number
        codec: string
      }>('get_video_metadata', { path: job.inputPath })
      
      if (!videoMeta || videoMeta.duration <= 0) {
        throw new Error('Failed to read video metadata')
      }
      
      // 2. Initialize OCR engine
      job.progress = 10
      job.stageLabel = '初始化 OCR 引擎'
      const langMap: Record<string, string[]> = {
        ch: ['eng', 'chi_sim'],
        en: ['eng'],
        ja: ['eng', 'jpn'],
        ko: ['eng', 'kor']
      }
      const langs = langMap[options.languages[0]] || ['eng']
      
      const ocr = useOCREngine()
      await ocr.init(options.ocrEngine, langs)
      
      // 3. Extract frames and process OCR
      job.progress = 30
      job.stageLabel = '检测场景变化'
      // Note: This is a simplified version - full implementation would
      // use the video element to capture frames and run OCR on each
      
      // For batch processing, we use the Tauri backend to extract frames
      // and process them via OCR
      const sceneChanges = await invoke<number[]>('detect_scenes', {
        videoPath: job.inputPath,
        config: {
          threshold: options.sceneThreshold,
          min_scene_length: 30,
          frame_interval: 1
        }
      })
      
      job.progress = 60
      job.stageLabel = '提取帧并进行 OCR'
      
      // Process each detected scene
      const totalScenes = sceneChanges.length || 1
      for (let i = 0; i < totalScenes; i++) {
        if (job.status === 'cancelled') {
          throw new Error('Job cancelled')
        }

        const timestamp = sceneChanges[i] / videoMeta.fps
        job.stageLabel = `处理场景 ${i + 1}/${totalScenes}`

        // Extract frame at this timestamp (result used for OCR in full implementation)
        await invoke<string>('extract_frame_at_time', {
          path: job.inputPath,
          timestampSecs: timestamp
        })
        
        job.progress = 60 + Math.round((i / totalScenes) * 30)
      }
      
      // 4. Export subtitles in requested formats
      job.progress = 95
      job.stageLabel = '导出字幕'
      
      const baseName = job.inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'subtitle'
      
      for (const format of options.formats) {
        await invoke('export_subtitles', {
          subtitles: [], // Would pass actual extracted subtitles here
          format,
          outputPath: `${options.outputDir}/${baseName}.${format}`
        })
      }
      
      // Update average processing time
      updateAvgProcessingTime(Date.now() - jobStart)
      
    } catch (e) {
      console.error(`[Batch] Failed to process ${job.inputPath}:`, e)
      throw e
    }
  }

  // Cancel batch processing
  function cancelBatch() {
    isProcessing.value = false
    
    if (currentJob.value) {
      currentJob.value.status = 'cancelled'
    }
  }

  // Clear completed jobs
  function clearCompleted() {
    jobs.value = jobs.value.filter(j => 
      j.status !== 'completed' && j.status !== 'failed' && j.status !== 'cancelled'
    )
  }

  // Remove job
  function removeJob(id: string) {
    const index = jobs.value.findIndex(j => j.id === id)
    if (index !== -1) {
      jobs.value.splice(index, 1)
    }
  }

  // Retry failed job
  function retryJob(id: string) {
    const job = jobs.value.find(j => j.id === id)
    if (job && job.status === 'failed') {
      job.status = 'pending'
      job.progress = 0
      job.error = undefined
    }
  }

  // Get statistics (single-pass memoized computed)
  const stats = computed(() => {
    let total = 0, pending = 0, processing = 0, completed = 0, failed = 0, cancelled = 0
    for (const job of jobs.value) {
      total++
      if (job.status === 'pending') pending++
      else if (job.status === 'processing') processing++
      else if (job.status === 'completed') completed++
      else if (job.status === 'failed') failed++
      else if (job.status === 'cancelled') cancelled++
    }
    return { total, pending, processing, completed, failed, cancelled }
  })

  return {
    jobs,
    currentJob,
    isProcessing,
    overallProgress,
    estimatedTimeRemaining,
    addToQueue,
    startBatch,
    cancelBatch,
    clearCompleted,
    removeJob,
    retryJob,
    stats
  }
}
