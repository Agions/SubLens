<script setup lang="ts">
import { ref, computed } from 'vue'
import { type ExportFormat } from '@/core'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useFileOperations } from '@/composables/useFileOperations'
import { useNotification } from '@/composables/useNotification'

const { error: notifyError } = useNotification()

defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:open', value: boolean): void
}>()

const isOpen = ref(false)

function close() {
  isOpen.value = false
  emit('close')
  emit('update:open', false)
  exportResults.value = []
}

function openDialog() {
  isOpen.value = true
}

defineExpose({ open: openDialog, close })

const subtitleStore = useSubtitleStore()
const fileOps = useFileOperations()

const selectedFormats = computed(() => {
  return Object.entries(subtitleStore.exportFormats)
    .filter(([, enabled]) => enabled)
    .map(([format]) => format)
})

const isExporting = ref(false)
const exportResults = ref<string[]>([])

const formatDescriptions: Record<string, string> = {
  srt: 'SubRip - 最通用',
  vtt: 'WebVTT - 网页视频',
  ass: 'ASS - 高级字幕样式',
  ssa: 'SSA - 旧版格式',
  json: 'JSON - 含帧映射',
  txt: 'TXT - 纯文本',
  lrc: 'LRC - 歌词格式',
  sbv: 'SBV - YouTube',
  csv: 'CSV - Excel表格',
}

async function handleExport() {
  if (selectedFormats.value.length === 0) {
    notifyError('请至少选择一种导出格式')
    return
  }

  isExporting.value = true
  exportResults.value = []

  const baseName = `subtitles_${Date.now()}`

  for (const format of selectedFormats.value) {
    try {
      const content = subtitleStore.exportToFormat(format as ExportFormat)
      if (!content) {
        exportResults.value.push(`❌ ${format.toUpperCase()}: 生成内容失败`)
        continue
      }

      const ext = format
      const defaultName = `${baseName}.${ext}`

      const filePath = await fileOps.saveFileDialog(`导出 ${format.toUpperCase()}`, defaultName)
      if (!filePath) {
        exportResults.value.push(`⏭️  ${format.toUpperCase()}: 已取消`)
        continue
      }

      const saved = await fileOps.writeTextFile(filePath, content)
      if (saved) {
        exportResults.value.push(`✅ ${format.toUpperCase()}: ${filePath}`)
      } else {
        exportResults.value.push(`❌ ${format.toUpperCase()}: 保存失败`)
      }
    } catch (e) {
      exportResults.value.push(`❌ ${format.toUpperCase()}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  isExporting.value = false
}
</script>

<template>
  <Modal :open="isOpen" title="导出字幕" size="md" @close="close">
    <div class="export-content">
      <p class="export-info">
        共 {{ subtitleStore.totalCount }} 条字幕将被导出
      </p>

      <div class="formats-grid">
        <label
          v-for="format in (Object.keys(subtitleStore.exportFormats) as Array<keyof typeof subtitleStore.exportFormats>)"
          :key="format"
          :class="['format-item', { selected: subtitleStore.exportFormats[format] }]"
        >
          <input
            type="checkbox"
            v-model="subtitleStore.exportFormats[format]"
          />
          <div class="format-info">
            <span class="format-name">{{ format.toUpperCase() }}</span>
            <span class="format-desc">{{ formatDescriptions[format] }}</span>
          </div>
        </label>
      </div>

      <div v-if="exportResults.length > 0" class="export-results">
        <h4>导出结果</h4>
        <ul>
          <li v-for="result in exportResults" :key="result">{{ result }}</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="close">取消</Button>
      <Button variant="primary" :loading="isExporting" @click="handleExport">
        导出 {{ selectedFormats.length }} 个格式
      </Button>
    </template>
  </Modal>
</template>

<style lang="scss" scoped>
.export-content {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.export-info {
  font-size: $text-sm;
  color: $text-secondary;
  padding: $space-3;
  background: $bg-elevated;
  border-radius: $radius-md;
}

.formats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-2;
}

.format-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $border-light;
  }

  &.selected {
    border-color: $primary;
    background: $primary-dim;
  }

  input {
    accent-color: $primary;
  }
}

.format-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-name {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 600;
  color: $text-primary;
}

.format-desc {
  font-size: $text-xs;
  color: $text-muted;
}

.export-results {
  padding: $space-3;
  background: $bg-elevated;
  border-radius: $radius-md;

  h4 {
    font-size: $text-sm;
    font-weight: 600;
    margin-bottom: $space-2;
  }

  ul {
    list-style: none;
  }

  li {
    font-size: $text-sm;
    padding: $space-1 0;
  }
}
</style>
