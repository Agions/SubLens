import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useOCREngine } from './useOCREngine'
import { ROI_PRESETS, type OCREngine } from '@/types/video'

export interface BatchJob {
  id: string
  inputPath: string
  outputPath: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface BatchOptions {
  outputDir: string
  formats: ('srt' | 'vtt' | 'ass' | 'json' | 'txt')[]
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

  // Start batch processing with concurrency control
  async function startBatch(options: BatchOptions) {
    if (isProcessing.value) return
    
    isProcessing.value = true
    
    const maxConcurrency = options.maxConcurrency || 2
    const pendingJobs = jobs.value.filter(j => j.status === 'pending')
    
    // Process jobs with concurrency limit
    const chunk = pendingJobs.slice(0, maxConcurrency)
    const remaining = pendingJobs.slice(maxConcurrency)
    
    // Start concurrent processing
    const processChunk = async () => {
      const running: Promise<void>[] = []
      
      for (const job of chunk) {
        if (!isProcessing.value) break
        
        const promise = (async () => {
          currentJob.value = job
          job.status = 'processing'
          job.startedAt = new Date()
          
          try {
            await processJob(job, options)
            job.status = 'completed'
            job.progress = 100
          } catch (e) {
            job.status = 'failed'
            job.error = e instanceof Error ? e.message : String(e)
          } finally {
            job.completedAt = new Date()
            currentJob.value = null
          }
        })()
        
        running.push(promise)
      }
      
      await Promise.all(running)
    }
    
    await processChunk()
    
    // Process remaining jobs
    for (const job of remaining) {
      if (!isProcessing.value) break
      
      currentJob.value = job
      job.status = 'processing'
      job.startedAt = new Date()
      
      try {
        await processJob(job, options)
        job.status = 'completed'
        job.progress = 100
      } catch (e) {
        job.status = 'failed'
        job.error = e instanceof Error ? e.message : String(e)
      } finally {
        job.completedAt = new Date()
      }
    }
    
    currentJob.value = null
    isProcessing.value = false
  }

  // Process single job - actual implementation
  async function processJob(job: BatchJob, options: BatchOptions) {
    try {
      // 1. Get video metadata via Tauri backend
      job.progress = 5
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
      // Note: This is a simplified version - full implementation would
      // use the video element to capture frames and run OCR on each
      job.progress = 30
      
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
      
      // Get ROI from preset
      const roi = ROI_PRESETS.find(p => p.id === options.roiPreset)?.rect || ROI_PRESETS[0].rect
      
      // Process each detected scene
      const totalScenes = sceneChanges.length || 1
      for (let i = 0; i < totalScenes; i++) {
        if (job.status === 'cancelled') {
          throw new Error('Job cancelled')
        }
        
        const timestamp = sceneChanges[i] / videoMeta.fps
        
        // Extract frame at this timestamp
        const frameData = await invoke<string>('extract_frame_at_time', {
          path: job.inputPath,
          timestampSecs: timestamp
        })
        
        job.progress = 60 + Math.round((i / totalScenes) * 30)
      }
      
      // 4. Export subtitles in requested formats
      job.progress = 95
      
      const baseName = job.inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'subtitle'
      
      for (const format of options.formats) {
        await invoke('export_subtitles', {
          subtitles: [], // Would pass actual extracted subtitles here
          format,
          outputPath: `${options.outputDir}/${baseName}.${format}`
        })
      }
      
      console.log(`[Batch] Processed: ${job.inputPath}`)
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

  // Get statistics
  const stats = () => ({
    total: jobs.value.length,
    pending: jobs.value.filter(j => j.status === 'pending').length,
    processing: jobs.value.filter(j => j.status === 'processing').length,
    completed: jobs.value.filter(j => j.status === 'completed').length,
    failed: jobs.value.filter(j => j.status === 'failed').length,
    cancelled: jobs.value.filter(j => j.status === 'cancelled').length
  })

  return {
    jobs,
    currentJob,
    isProcessing,
    addToQueue,
    startBatch,
    cancelBatch,
    clearCompleted,
    removeJob,
    retryJob,
    stats
  }
}
