import { ref } from 'vue'

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
  ocrEngine: string
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

  // Process single job
  async function processJob(job: BatchJob, options: BatchOptions) {
    // This would call the Tauri backend
    // For now, simulate processing
    
    const fileName = job.inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'output'
    
    for (let i = 0; i <= 100; i += 10) {
      if (!isProcessing.value || job.status === 'cancelled') {
        throw new Error('Job cancelled')
      }
      
      job.progress = i
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`[Batch] Processed: ${fileName}`)
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
