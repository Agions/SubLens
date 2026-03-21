<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBatchProcessor, type BatchJob, type BatchOptions } from '@/composables/useBatchProcessor'

const {
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
} = useBatchProcessor()

const dropZoneActive = ref(false)
const selectedFiles = ref<string[]>([])

const options = ref<BatchOptions>({
  outputDir: './exports',
  formats: ['srt', 'json'],
  roiPreset: 'bottom',
  ocrEngine: 'tesseract',
  languages: ['ch'],
  sceneThreshold: 0.3,
  confidenceThreshold: 0.7
})

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  dropZoneActive.value = false
  
  const files = e.dataTransfer?.files
  if (!files) return
  
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('video/')) {
      paths.push((file as any).path || file.name)
    }
  }
  
  if (paths.length > 0) {
    selectedFiles.value = [...selectedFiles.value, ...paths]
  }
}

function handleFileSelect() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = 'video/*'
  input.onchange = () => {
    const files = input.files
    if (!files) return
    
    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      paths.push((files[i] as any).path || files[i].name)
    }
    
    if (paths.length > 0) {
      selectedFiles.value = [...selectedFiles.value, ...paths]
    }
  }
  input.click()
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

function addToBatchAndStart() {
  if (selectedFiles.value.length === 0) return
  
  addToQueue(selectedFiles.value, options.value)
  startBatch(options.value)
}

function getStatusColor(status: BatchJob['status']): string {
  switch (status) {
    case 'completed': return 'var(--success)'
    case 'failed': return 'var(--error)'
    case 'processing': return 'var(--primary)'
    case 'cancelled': return 'var(--warning)'
    default: return 'var(--text-muted)'
  }
}

function getStatusText(status: BatchJob['status']): string {
  switch (status) {
    case 'pending': return '等待中'
    case 'processing': return '处理中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'cancelled': return '已取消'
    default: return status
  }
}
</script>

<template>
  <div class="batch-view">
    <header class="batch-header">
      <h2 class="batch-title">批量处理</h2>
      <div class="batch-actions">
        <button 
          class="btn btn-primary" 
          :disabled="selectedFiles.length === 0 || isProcessing"
          @click="addToBatchAndStart"
        >
          {{ isProcessing ? '处理中...' : '开始处理' }}
        </button>
        <button 
          v-if="isProcessing" 
          class="btn btn-danger"
          @click="cancelBatch"
        >
          取消
        </button>
        <button 
          v-else 
          class="btn"
          @click="clearCompleted"
        >
          清空已完成
        </button>
      </div>
    </header>

    <div class="batch-content">
      <!-- File Drop Zone -->
      <div class="files-section">
        <h3 class="section-title">视频文件 ({{ selectedFiles.length }})</h3>
        
        <div 
          :class="['drop-zone', { active: dropZoneActive }]"
          @dragover.prevent="dropZoneActive = true"
          @dragleave="dropZoneActive = false"
          @drop="handleFileDrop"
          @click="handleFileSelect"
        >
          <span class="drop-icon">📁</span>
          <span class="drop-text">拖拽视频文件到这里，或点击选择</span>
          <span class="drop-hint">支持 MP4, MKV, AVI, MOV, WebM</span>
        </div>

        <div v-if="selectedFiles.length > 0" class="file-list">
          <div 
            v-for="(file, index) in selectedFiles" 
            :key="index"
            class="file-item"
          >
            <span class="file-icon">🎬</span>
            <span class="file-name">{{ file.split('/').pop() }}</span>
            <button class="remove-btn" @click.stop="removeFile(index)">✕</button>
          </div>
        </div>
      </div>

      <!-- Options -->
      <div class="options-section">
        <h3 class="section-title">处理选项</h3>
        
        <div class="option-group">
          <label class="option-label">OCR 引擎</label>
          <select v-model="options.ocrEngine" class="option-select">
            <option value="tesseract">Tesseract.js</option>
            <option value="paddle">PaddleOCR</option>
            <option value="easyocr">EasyOCR</option>
          </select>
        </div>

        <div class="option-group">
          <label class="option-label">字幕区域</label>
          <select v-model="options.roiPreset" class="option-select">
            <option value="bottom">底部字幕</option>
            <option value="top">顶部字幕</option>
            <option value="left">左侧字幕</option>
            <option value="right">右侧字幕</option>
            <option value="center">中心字幕</option>
          </select>
        </div>

        <div class="option-group">
          <label class="option-label">导出格式</label>
          <div class="format-checks">
            <label class="check-item">
              <input type="checkbox" value="srt" v-model="options.formats" />
              <span>SRT</span>
            </label>
            <label class="check-item">
              <input type="checkbox" value="vtt" v-model="options.formats" />
              <span>VTT</span>
            </label>
            <label class="check-item">
              <input type="checkbox" value="ass" v-model="options.formats" />
              <span>ASS</span>
            </label>
            <label class="check-item">
              <input type="checkbox" value="json" v-model="options.formats" />
              <span>JSON</span>
            </label>
          </div>
        </div>

        <div class="option-group">
          <label class="option-label">置信度阈值: {{ (options.confidenceThreshold * 100).toFixed(0) }}%</label>
          <input 
            type="range" 
            v-model.number="options.confidenceThreshold"
            min="0" 
            max="100" 
            class="option-slider"
          />
        </div>
      </div>

      <!-- Jobs Queue -->
      <div v-if="jobs.length > 0" class="jobs-section">
        <h3 class="section-title">处理队列</h3>
        
        <div class="stats-bar">
          <span class="stat">总计: {{ stats().total }}</span>
          <span class="stat success">完成: {{ stats().completed }}</span>
          <span class="stat error">失败: {{ stats().failed }}</span>
          <span class="stat processing">处理中: {{ stats().processing }}</span>
        </div>

        <div class="job-list">
          <div 
            v-for="job in jobs" 
            :key="job.id"
            :class="['job-item', job.status]"
          >
            <div class="job-info">
              <span class="job-icon">
                {{ job.status === 'completed' ? '✅' : 
                   job.status === 'failed' ? '❌' : 
                   job.status === 'processing' ? '🔄' : '⏳' }}
              </span>
              <span class="job-name">{{ job.inputPath.split('/').pop() }}</span>
            </div>
            
            <div class="job-status">
              <span class="status-text" :style="{ color: getStatusColor(job.status) }">
                {{ getStatusText(job.status) }}
              </span>
              
              <div v-if="job.status === 'processing'" class="progress-bar">
                <div class="progress-fill" :style="{ width: `${job.progress}%` }"></div>
              </div>
              
              <div v-if="job.status === 'failed'" class="error-text">{{ job.error }}</div>
            </div>
            
            <div class="job-actions">
              <button 
                v-if="job.status === 'failed'"
                class="action-btn"
                @click="retryJob(job.id)"
                title="重试"
              >
                🔄
              </button>
              <button 
                class="action-btn"
                @click="removeJob(job.id)"
                title="移除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.batch-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.batch-title {
  font-size: $text-xl;
  font-weight: 600;
}

.batch-actions {
  display: flex;
  gap: $space-2;
  
  .btn {
    padding: $space-2 $space-4;
    border-radius: $radius-md;
    font-weight: 500;
    transition: all $transition-fast;
    
    &.btn-primary {
      background: var(--primary);
      color: white;
      &:hover:not(:disabled) { opacity: 0.9; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    
    &.btn-danger {
      background: var(--error);
      color: white;
    }
  }
}

.batch-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-template-rows: auto 1fr;
  gap: $space-4;
}

.files-section {
  grid-column: 1;
  grid-row: 1 / 3;
}

.options-section {
  grid-column: 2;
  grid-row: 1;
}

.jobs-section {
  grid-column: 2;
  grid-row: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: $text-sm;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: $space-3;
}

.drop-zone {
  padding: $space-8;
  border: 2px dashed var(--border);
  border-radius: $radius-lg;
  text-align: center;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover, &.active {
    border-color: var(--primary);
    background: rgba(#{var(--primary)}, 0.05);
  }
  
  .drop-icon {
    display: block;
    font-size: 48px;
    margin-bottom: $space-3;
  }
  
  .drop-text {
    display: block;
    color: var(--text-secondary);
    margin-bottom: $space-1;
  }
  
  .drop-hint {
    font-size: $text-xs;
    color: var(--text-muted);
  }
}

.file-list {
  margin-top: $space-3;
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  background: var(--bg-surface);
  border-radius: $radius-md;
  margin-bottom: $space-2;
  
  .file-icon { font-size: 16px; }
  .file-name { flex: 1; font-size: $text-sm; }
  
  .remove-btn {
    width: 20px;
    height: 20px;
    @include flex-center;
    font-size: 12px;
    color: var(--text-muted);
    border-radius: $radius-sm;
    
    &:hover {
      background: var(--error);
      color: white;
    }
  }
}

.option-group {
  margin-bottom: $space-4;
  
  .option-label {
    display: block;
    font-size: $text-sm;
    color: var(--text-secondary);
    margin-bottom: $space-2;
  }
  
  .option-select {
    width: 100%;
    padding: $space-2;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: $radius-md;
    color: var(--text-primary);
  }
  
  .option-slider {
    width: 100%;
  }
}

.format-checks {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.check-item {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-1 $space-2;
  background: var(--bg-surface);
  border-radius: $radius-sm;
  font-size: $text-sm;
  cursor: pointer;
  
  input { accent-color: var(--primary); }
}

.stats-bar {
  display: flex;
  gap: $space-3;
  padding: $space-2;
  background: var(--bg-surface);
  border-radius: $radius-md;
  margin-bottom: $space-3;
  
  .stat {
    font-size: $text-xs;
    color: var(--text-muted);
    
    &.success { color: var(--success); }
    &.error { color: var(--error); }
    &.processing { color: var(--primary); }
  }
}

.job-list {
  flex: 1;
  overflow-y: auto;
}

.job-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: var(--bg-surface);
  border-radius: $radius-md;
  margin-bottom: $space-2;
  
  &.processing {
    border-left: 3px solid var(--primary);
  }
  
  &.failed {
    border-left: 3px solid var(--error);
  }
  
  &.completed {
    border-left: 3px solid var(--success);
  }
}

.job-info {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex: 1;
  min-width: 0;
  
  .job-name {
    font-size: $text-sm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.job-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $space-1;
  
  .status-text {
    font-size: $text-xs;
  }
}

.progress-bar {
  width: 60px;
  height: 4px;
  background: var(--bg-overlay);
  border-radius: $radius-full;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.error-text {
  font-size: $text-xs;
  color: var(--error);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-actions {
  display: flex;
  gap: $space-1;
  
  .action-btn {
    width: 24px;
    height: 24px;
    @include flex-center;
    font-size: 12px;
    border-radius: $radius-sm;
    
    &:hover {
      background: var(--bg-overlay);
    }
  }
}
</style>
