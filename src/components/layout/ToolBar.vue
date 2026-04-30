<script setup lang="ts">
import { ref, inject } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useFileOperations } from '@/composables/useFileOperations'
import { useVideoPlayer } from '@/composables/useVideoPlayer'
import { useVideoMetadata } from '@/composables/useVideoMetadata'
import { useTheme } from '@/composables/useTheme'
import { useNotification } from '@/composables/useNotification'
import AboutDialog from '@/components/common/AboutDialog.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()
const { error: notifyError } = useNotification()

const projectName = ref('未命名项目')
const showAbout = ref(false)
const isLoading = ref(false)
const { currentTheme, toggleTheme } = useTheme()
const openBatchProcess = inject<() => void>('openBatchProcess')

async function handleOpenFile() {
  if (isLoading.value) return

  try {
    const fileOps = useFileOperations()

    const filePath = await fileOps.openFileDialog('选择视频文件')
    if (!filePath) return

    isLoading.value = true

    const { getVideoMetadata } = useVideoMetadata()
    const metadata = await getVideoMetadata(filePath)

    projectStore.setVideo(filePath, metadata)

    const filename = filePath.split('/').pop() || filePath.split('\\').pop() || 'video'
    projectName.value = filename.replace(/\.[^.]+$/, '')

    const videoPlayer = useVideoPlayer()
    await videoPlayer.loadVideo(filePath)

  } catch (e) {
    console.error('[ToolBar] Failed to open file:', e)
    notifyError(`打开文件失败: ${e}`)
  } finally {
    isLoading.value = false
  }
}

async function handleSave() {
  if (isLoading.value) return

  try {
    const fileOps = useFileOperations()

    const subtitles = subtitleStore.subtitles.map(sub => ({
      id: sub.id,
      index: sub.index,
      start_time: sub.startTime,
      end_time: sub.endTime,
      start_frame: sub.startFrame,
      end_frame: sub.endFrame,
      text: sub.text,
      confidence: sub.confidence,
      language: sub.language,
      roi: sub.roi
    }))

    const filePath = await fileOps.saveFileDialog('保存项目', `${projectName.value}.hardsubx.json`)
    if (!filePath) return

    isLoading.value = true

    const projectData = JSON.stringify({
      version: '3.0.0',
      projectName: projectName.value,
      videoPath: projectStore.videoPath,
      subtitles
    }, null, 2)

    await fileOps.writeTextFile(filePath, projectData)


  } catch (e) {
    console.error('[ToolBar] Failed to save project:', e)
    notifyError(`保存失败: ${e}`)
  } finally {
    isLoading.value = false
  }
}

function openAbout() {
  showAbout.value = true
}
</script>

<template>
  <header class="toolbar">
    <!-- ── Left: Logo + Project ─────────────────── -->
    <div class="toolbar-left">
      <div class="logo">
        <svg
          class="logo-icon"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M9 9l6 3-6 3V9z"
            fill="currentColor"
          />
        </svg>
        <span class="logo-text">SubLens</span>
      </div>

      <div class="divider" />

      <span class="project-name">{{ projectName }}</span>
    </div>

    <!-- ── Center: Actions ────────────────────────── -->
    <div class="toolbar-center">
      <button
        class="toolbar-btn"
        @click="handleOpenFile"
      >
        <svg
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M3 7v9a1 1 0 001 1h12a1 1 0 001-1V7M8 3v10m0-10L4 7m4-4l4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="btn-text">打开</span>
      </button>

      <button
        class="toolbar-btn"
        @click="handleSave"
      >
        <svg
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5 3v14a1 1 0 001 1h8a1 1 0 001-1V7l-4-4H6a1 1 0 00-1 1z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7 15v2m4-2v2m4-2v2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span class="btn-text">保存</span>
      </button>
    </div>

    <!-- ── Right: Theme + About ───────────────────── -->
    <div class="toolbar-right">
      <button
        class="toolbar-btn icon-only"
        :title="currentTheme === 'dark' ? '切换亮色模式' : '切换暗色模式'"
        @click="toggleTheme"
      >
        <!-- Sun icon (show when dark) -->
        <svg
          v-if="currentTheme === 'dark'"
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <circle
            cx="10"
            cy="10"
            r="4"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <!-- Moon icon (show when light) -->
        <svg
          v-else
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        class="toolbar-btn icon-only"
        title="批量处理"
        @click="openBatchProcess?.()"
      >
        <svg
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
          <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
          <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
          <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>
        </svg>
      </button>

      <button
        class="toolbar-btn icon-only"
        title="关于"
        @click="openAbout"
      >
        <svg
          class="btn-icon"
          viewBox="0 0 20 20"
          fill="none"
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M10 14v-4M10 7h.01"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </header>

  <AboutDialog v-model:open="showAbout" />
</template>

<style lang="scss" scoped>
.toolbar {
  height: $toolbar-height;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-4;
  user-select: none;
}

// ── Left ────────────────────────────────────────────────────
.toolbar-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.logo {
  display: flex;
  align-items: center;
  gap: $space-2;

  .logo-icon {
    width: 24px;
    height: 24px;
    color: var(--primary);
    flex-shrink: 0;
  }

  .logo-text {
    font-family: $font-ui;
    font-weight: 700;
    font-size: $text-xs;
    color: var(--text-primary);
    letter-spacing: $tracking-tight;
  }
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border);
}

.project-name {
  font-size: 12px;
  color: var(--text-muted);
}

// ── Center ──────────────────────────────────────────────────
.toolbar-center {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  @include pressable;
  @include focus-ring;

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  &.icon-only {
    padding: $space-2;
  }

  .btn-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .btn-text {
    font-size: 12px;
    font-weight: 600;
  }
}

// ── Right ───────────────────────────────────────────────────
.toolbar-right {
  display: flex;
  align-items: center;
  gap: $space-1;
}
</style>
