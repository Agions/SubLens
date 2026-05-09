<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSystemCheck } from '@/composables/useSystemCheck'

// Tab components
import FilesTab from './tabs/FilesTab.vue'
import ProgressTab from './tabs/ProgressTab.vue'
import ROITab from './tabs/ROITab.vue'
import OCRTab from './tabs/OCRTab.vue'
import ExportTab from './tabs/ExportTab.vue'
import SettingsTab from './tabs/SettingsTab.vue'

const settingsStore = useSettingsStore()
const { checkDependencies } = useSystemCheck()


type TabKey = 'files' | 'progress' | 'roi' | 'ocr' | 'export' | 'settings'
const activeTab = ref<TabKey>('files')

// Settings tab local state
const localSettings = ref({ ...settingsStore.settings })

// Tab keyboard navigation
const tabs = [
  { key: 'files', icon: 'file', label: '文件' },
  { key: 'progress', icon: 'chart', label: '进度' },
  { key: 'roi', icon: 'crop', label: '区域' },
  { key: 'ocr', icon: 'ocr', label: 'OCR' },
  { key: 'export', icon: 'export', label: '导出' },
  { key: 'settings', icon: 'settings', label: '设置' },
] as const

const tabRefs = ref<HTMLElement[]>([])

function handleTabKeydown(e: KeyboardEvent) {
  const currentIndex = tabs.findIndex(t => t.key === activeTab.value)
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    const nextIndex = (currentIndex + 1) % tabs.length
    activeTab.value = tabs[nextIndex].key
    tabRefs.value[nextIndex]?.focus()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
    activeTab.value = tabs[prevIndex].key
    tabRefs.value[prevIndex]?.focus()
  } else if (e.key === 'Home') {
    e.preventDefault()
    activeTab.value = tabs[0].key
    tabRefs.value[0]?.focus()
  } else if (e.key === 'End') {
    e.preventDefault()
    activeTab.value = tabs[tabs.length - 1].key
    tabRefs.value[tabs.length - 1]?.focus()
  }
}

onMounted(() => {
  checkDependencies()
})

watch(localSettings, (newSettings) => {
  Object.assign(settingsStore.settings, newSettings)
}, { deep: true })
</script>

<template>
  <aside class="side-panel">
    <!-- Tab Bar -->
    <div
      class="tab-bar"
      role="tablist"
      @keydown="handleTabKeydown"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="tab.key"
        :ref="el => { if (el) tabRefs[index] = el as HTMLElement }"
        :class="['tab-item', { active: activeTab === tab.key }]"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :tabindex="activeTab === tab.key ? 0 : -1"
        @click="activeTab = tab.key"
      >
        <!-- File icon -->
        <svg v-if="tab.icon === 'file'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M12 3v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
        <!-- Chart icon -->
        <svg v-if="tab.icon === 'chart'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 17V7m0 4V5m0 8V9m4-5V7m0 6V3m0 10V9m4-6V5m0 8V7m4-4V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <!-- Crop icon -->
        <svg v-if="tab.icon === 'crop'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M6 3v11a1 1 0 001 1h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3 6h11a1 1 0 011 1v11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- OCR icon -->
        <svg v-if="tab.icon === 'ocr'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- Export icon -->
        <svg v-if="tab.icon === 'export'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v10m0 0L6 9m4 4l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- Settings icon -->
        <svg v-if="tab.icon === 'settings'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 3v2m0 10v2M3 10h2m10 0h2M5.05 5.05l1.41 1.41m7.08 7.08l1.41 1.41M5.05 14.95l1.41-1.41m7.08-7.08l1.41-1.41" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ── Files Tab ─────────────────────────────────────── -->
    <FilesTab v-if="activeTab === 'files'" />

    <!-- ── Progress Tab ──────────────────────────────────── -->
    <ProgressTab v-if="activeTab === 'progress'" />

    <!-- ── ROI Tab ──────────────────────────────────────── -->
    <ROITab v-if="activeTab === 'roi'" />

    <!-- ── OCR Tab ───────────────────────────────────────── -->
    <OCRTab v-if="activeTab === 'ocr'" />

    <!-- ── Export Tab ────────────────────────────────────── -->
    <ExportTab v-if="activeTab === 'export'" />

    <!-- ── Settings Tab (Component) ───────────────────────── -->
    <SettingsTab v-if="activeTab === 'settings'" />
  </aside>
</template>

<style lang="scss" scoped>
.side-panel {
  width: $sidebar-width;
  background: $bg-surface;
  border-right: 1px solid $border;
  display: flex;
  @include flex-column;
  overflow: hidden;
}

// ── Tab Bar ─────────────────────────────────────────────────
.tab-bar {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
  animation: fade-up 0.3s ease-out both;
}

.tab-item {
  flex: 1;
  display: flex;
  @include flex-column;
  align-items: center;
  gap: 3px;
  padding: $space-2 $space-1;
  border-radius: $radius-md;
  color: $text-muted;
  transition: all $transition-base;

  &:hover {
    color: $text-secondary;
    background: $bg-overlay;
  }

  &.active {
    color: $primary;
    background: rgba($primary, 0.1);

    .tab-icon {
      filter: drop-shadow(0 0 4px rgba($primary, 0.4));
    }
  }

  .tab-icon {
    width: 18px;
    height: 18px;
    transition: filter $transition-base;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

// ── Content ─────────────────────────────────────────────────
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  @include custom-scrollbar;
  animation: fade-up 0.3s ease-out both;
}

.section {
  margin-bottom: $space-6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.section-title {
  font-size: $text-xs;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

// ── Video Card ────────────────────────────────────────────────
.video-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-4;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.video-icon {
  display: flex;
  justify-content: center;
  margin-bottom: $space-4;

  svg {
    width: 48px;
    height: 48px;
    color: $primary;
    opacity: 0.7;
  }
}

.video-meta {
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .meta-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .meta-value {
    font-size: $text-sm;
    font-weight: 500;
    color: $text-secondary;

    &.truncate {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// ── Empty Card ──────────────────────────────────────────────
.empty-card {
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  padding: $space-8 $space-4;
  background: $bg-elevated;
  border: 1.5px dashed $border;
  border-radius: $radius-lg;
  animation: fade-up 0.3s 0.05s ease-out both;

  .empty-icon {
    width: 48px;
    height: 48px;
    color: $text-muted;
    margin-bottom: $space-3;
    opacity: 0.5;
  }

  .empty-text {
    font-size: $text-sm;
    color: $text-muted;
  }
}

// ── Progress Ring ───────────────────────────────────────────
.progress-ring-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto $space-5;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.progress-ring {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);

  .ring-track {
    stroke: $bg-overlay;
  }

  .ring-progress {
    stroke: var(--primary);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 50%, transparent));
    transition: stroke-dashoffset 0.4s ease;
  }
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;

  .ring-percent {
    font-family: $font-display;
    font-size: 32px;
    font-weight: 800;
    color: $text-primary;
    line-height: 1;
  }

  .ring-unit {
    font-family: $font-display;
    font-size: $text-base;
    font-weight: 600;
    color: $text-muted;
    align-self: flex-end;
    margin-bottom: 4px;
  }
}

// ── Stats Grid ──────────────────────────────────────────────
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-2;
  margin-bottom: $space-4;
}

.stat-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  text-align: center;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $border-light;
  }

  .stat-value {
    display: block;
    font-family: $font-display;
    font-size: $text-lg;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 2px;

    &.text-success { color: $success; }
  }

  .stat-label {
    font-size: 10px;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

// ── Action Button ────────────────────────────────────────────
.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  font-weight: 700;
  font-size: $text-base;
  border-radius: $radius-lg;
  transition: all $transition-base;

  .btn-icon {
    width: 18px;
    height: 18px;
  }

  &--primary {
    background: linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 85%, white));
    color: #fff;
    box-shadow: 0 4px 16px color-mix(in oklch, var(--primary) 40%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px color-mix(in oklch, var(--primary) 50%, transparent);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &--danger {
    background: $bg-elevated;
    border: 1.5px solid rgba($error, 0.3);
    color: $error;

    &:hover {
      background: rgba($error, 0.08);
      border-color: rgba($error, 0.5);
    }
  }
}

// ── Extracting Badge ────────────────────────────────────────
.extracting-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: $success;
  background: rgba($success, 0.1);
  padding: 3px 8px;
  border-radius: $radius-full;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: $success;
  border-radius: 50%;
  animation: pulse-anim 1.5s ease-in-out infinite;
}

// ── ROI Cards ───────────────────────────────────────────────
.roi-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.roi-card {
  position: relative;
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  @include flex-column;
  align-items: center;
  gap: $space-2;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
    transform: translateY(-1px);
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.05);
    box-shadow: 0 0 0 1px rgba($primary, 0.1);
  }

  .roi-preview {
    width: 100%;
    height: 40px;
    background: $bg-overlay;
    border-radius: $radius-sm;
    position: relative;
    overflow: hidden;
  }

  .roi-zone {
    position: absolute;
    background: rgba($primary, 0.5);
    border: 1px solid rgba($primary, 0.8);
    border-radius: 2px;
  }

  .roi-name {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  .roi-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    svg { width: 10px; height: 10px; }
  }
}

// ── ROI Detail ───────────────────────────────────────────────
.roi-detail-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .detail-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .detail-value {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
    font-family: $font-display;
  }
}

// ── Engine List ─────────────────────────────────────────────

.engine-list {
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.engine-card {
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-lg;
  padding: $space-3;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;
  cursor: pointer;

  &:hover {
    border-color: $border-light;
  }

  &.active {
    border-color: rgba($primary, 0.5);
    background: rgba($primary, 0.04);
    box-shadow: 0 0 16px rgba($primary, 0.1);
  }
}

.engine-header {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-3;
}

.engine-avatar {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.5px;

  &.avatar-paddle { background: linear-gradient(135deg, oklch(0.65 0.2 250), oklch(0.55 0.22 260)); color: #fff; }
  &.avatar-easyocr { background: linear-gradient(135deg, oklch(0.65 0.2 50), oklch(0.70 0.18 65)); color: #fff; }
  &.avatar-tesseract { background: linear-gradient(135deg, oklch(0.45 0.02 260), oklch(0.35 0.02 260)); color: #fff; }
}

.engine-info {
  flex: 1;
  min-width: 0;
}

.engine-name-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: 2px;
}

.engine-name {
  font-size: $text-sm;
  font-weight: 700;
  color: $text-primary;
}

.rec-chip {
  font-size: 9px;
  font-weight: 700;
  background: rgba($success, 0.12);
  color: $success;
  padding: 2px 6px;
  border-radius: $radius-full;
  border: 1px solid rgba($success, 0.2);
  letter-spacing: 0.02em;
}

.engine-tech {
  font-size: 10px;
  color: $text-muted;
  font-family: $font-display;
}

.engine-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  @include card-border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;

  svg { width: 14px; height: 14px; }

  .engine-card.active & {
    background: $primary;
    border-color: $primary;
    svg { color: #fff; }
  }
}

.engine-stats {
  display: flex;
  gap: $space-4;
  margin-bottom: $space-2;
  padding: $space-2 0;
  border-top: 1px solid $border;
  border-bottom: 1px solid $border;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: $text-muted;

  svg { width: 10px; height: 10px; }

  &.stat-lang {
    margin-left: auto;
    font-weight: 600;
    font-family: $font-display;
    color: $text-secondary;
  }
}

.star-row {
  display: flex;
  gap: 2px;
}

.star {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $bg-overlay;
  transition: background $transition-fast;

  &.filled { background: $warning; }
}

.engine-desc-text {
  font-size: 10px;
  color: $text-muted;
}

// ── Language Chips ───────────────────────────────────────────
.lang-count {
  font-size: 10px;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 6px;
  border-radius: $radius-full;
}

.lang-family {
  margin-bottom: $space-3;
}

.family-label {
  font-size: 10px;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: $space-2;
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.lang-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: $space-1 $space-3;
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-full;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  transition: all $transition-base;

  .lang-flag { font-size: 12px; }

  &:hover {
    border-color: $border-light;
    color: $text-primary;
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.1);
    color: $primary;
  }
}

// ── Accuracy Meter ───────────────────────────────────────────
.accuracy-meter {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  background: rgba($primary, 0.04);
  border: 1px solid rgba($primary, 0.15);
  border-radius: $radius-xl;
  margin-bottom: $space-4;
  animation: fade-up 0.3s ease-out both;
}

.meter-icon {
  width: 16px;
  height: 16px;
  color: $primary;
  flex-shrink: 0;
}

.meter-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
}

.meter-track {
  flex: 1;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: $radius-full;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;

  &.meter-high { background: linear-gradient(90deg, var(--success), color-mix(in oklch, var(--success) 80%, white)); }
  &.meter-mid { background: linear-gradient(90deg, var(--warning), color-mix(in oklch, var(--warning) 80%, white)); }
  &.meter-low { background: linear-gradient(90deg, var(--error), color-mix(in oklch, var(--error) 80%, white)); }
}

.meter-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 800;
  min-width: 36px;
  text-align: right;
  color: $primary;
}

// ── Advanced Panel ───────────────────────────────────────────
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: $text-muted;
  padding: 3px 8px;
  border-radius: $radius-sm;
  background: $bg-overlay;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover { color: $text-secondary; background: $border; }
  &.active { color: $primary; }
}

.toggle-arrow {
  width: 10px;
  height: 6px;
  transition: transform $transition-base;

  &.open { transform: rotate(180deg); }
}

.advanced-panel {
  display: flex;
  @include flex-column;
  gap: $space-3;
  padding: $space-3;
  background: rgba($bg-overlay, 0.5);
  border: 1px solid $border;
  border-radius: $radius-lg;
  margin-top: $space-2;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}

.option-sub-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding-left: $space-2;
  margin-top: -$space-1;
  margin-bottom: $space-1;
}

.option-info {
  display: flex;
  @include flex-column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.option-name {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
}

.option-hint {
  font-size: 10px;
  color: $text-muted;
}

.sensitivity-val {
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 700;
  color: $primary;
  min-width: 32px;
  text-align: right;
}

.sub-label {
  font-size: 10px;
  color: $text-muted;
  white-space: nowrap;
}

.sub-value {
  font-family: $font-display;
  font-size: 10px;
  font-weight: 700;
  color: $primary;
  min-width: 28px;
  text-align: right;
}

// ── Toggle Switch ────────────────────────────────────────────
.toggle-switch {
  width: 36px;
  height: 20px;
  background: $bg-overlay;
  @include card-border;
  border-radius: $radius-full;
  padding: 2px;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;

  &.on {
    background: $primary;
    border-color: $primary;
  }
}

.toggle-thumb {
  display: block;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform $transition-base;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);

  .toggle-switch.on & { transform: translateX(16px); }
}

// ── Stepper ─────────────────────────────────────────────────
.stepper {
  display: flex;
  align-items: center;
  gap: $space-2;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: 2px;
}

.stepper-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  border: none;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  svg { width: 10px; height: 10px; }
  &:hover { background: $bg-overlay; color: $text-primary; }
}

.stepper-val {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $text-primary;
  min-width: 20px;
  text-align: center;
}

// ── Slider ────────────────────────────────────────────────────
.threshold-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $primary;
}

.threshold-hint {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: 10px;
  color: $text-muted;
  margin-top: $space-1;
  flex-wrap: wrap;

  strong {
    color: $warning;
    font-weight: 700;
  }
}

.threshold-action {
  color: $primary;
  cursor: pointer;
  font-weight: 600;
  transition: opacity $transition-fast;

  &:hover { opacity: 0.75; }
}

.slider-track {
  @include slider-track;
  margin-bottom: $space-2;

  &.small { height: 4px; margin-bottom: 0; }
  @include slider-fill-colors;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: $text-muted;
}

// ── Export ───────────────────────────────────────────────────

// ── Export ───────────────────────────────────────────────────
.export-list {
  display: flex;
  @include flex-column;
  gap: $space-2;
  margin-bottom: $space-4;
}

.export-card {
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
  }

  &.selected {
    border-color: $primary;
    background: rgba($primary, 0.04);
  }
}

.export-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.export-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  @include card-border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;

  svg { width: 12px; height: 12px; color: #fff; }

  .export-card.selected & {
    background: $primary;
    border-color: $primary;
  }
}

.export-info {
  display: flex;
  @include flex-column;
  gap: 1px;

  .export-name {
    font-family: $font-display;
    font-size: $text-sm;
    font-weight: 600;
    color: $text-primary;
  }

  .export-desc {
    font-size: 10px;
    color: $text-muted;
  }
}

.export-badge {
  color: $primary;
  opacity: 0.7;

  svg {
    width: 14px;
    height: 14px;
  }
}

.export-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-lg;
  font-weight: 700;
  font-size: $text-base;
  color: $text-primary;
  transition: all $transition-base;

  &:hover {
    border-color: $primary;
    background: rgba($primary, 0.05);
    color: $primary;
  }

  .export-btn-icon {
    width: 18px;
    height: 18px;
  }
}

// ── Settings Tab ─────────────────────────────────────────────
.settings-tab {
  padding: $space-3;
  overflow-y: auto;
  @include custom-scrollbar;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-2;
  border-bottom: 1px solid $border-light;
  
  &:last-child { border-bottom: none; }
}

.setting-info {
  flex: 1;
  min-width: 0;
  
  .setting-label {
    display: block;
    font-size: $text-sm;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 2px;
  }
  
  .setting-desc {
    font-size: $text-xs;
    color: $text-muted;
    line-height: 1.4;
  }
}

.setting-control {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-shrink: 0;
  margin-left: $space-3;
}

.select-input {
  padding: $space-1 $space-2;
  font-size: $text-xs;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  min-width: 70px;
  
  &:focus {
    outline: none;
    border-color: $primary;
  }
}

.number-input {
  padding: $space-1 $space-2;
  font-size: $text-xs;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  color: $text-primary;
  width: 60px;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: $primary;
  }
}

.range-input {
  width: 80px;
  accent-color: $primary;
}

.range-value {
  font-size: $text-xs;
  color: $text-secondary;
  min-width: 32px;
  text-align: right;
}

.toggle-item {
  .setting-info { flex: 1; }
}

.toggle-btn {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: $radius-full;
  background: $bg-overlay;
  border: none;
  cursor: pointer;
  transition: background $transition-fast;
  flex-shrink: 0;
  
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $text-muted;
    transition: all $transition-fast;
  }
  
  &.active {
    background: $primary;
    
    .toggle-thumb {
      left: 18px;
      background: white;
    }
  }
}

.system-status {
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.dep-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  border-radius: $radius-md;
  font-size: $text-xs;
  
  &.dep-ok {
    background: rgba($secondary, 0.1);
    .dep-icon { color: $secondary; }
    .dep-status { color: $secondary; }
  }
  
  &.dep-missing {
    background: rgba($error, 0.1);
    .dep-icon { color: $error; }
    .dep-status { color: $error; }
  }
}

.dep-icon {
  font-weight: 600;
  width: 16px;
  text-align: center;
}

.dep-name {
  flex: 1;
  color: $text-primary;
}

.dep-status {
  font-size: 10px;
}

// ── Animations ─────────────────────────────────────────────
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-anim {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
