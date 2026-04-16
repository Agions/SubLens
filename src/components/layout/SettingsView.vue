<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/composables/useTheme'
import { useSystemCheck } from '@/composables/useSystemCheck'

const settingsStore = useSettingsStore()
const { setTheme } = useTheme()
const {
  checkDependencies,
  lastResult,
  isChecking,
  getStatusMessage,
} = useSystemCheck()

const localSettings = ref({ ...settingsStore.settings })

watch(localSettings, (newSettings) => {
  Object.assign(settingsStore.settings, newSettings)
  // Apply theme changes
  setTheme(newSettings.theme)
}, { deep: true })

onMounted(() => {
  localSettings.value = { ...settingsStore.settings }
  // Run system check on mount
  checkDependencies()
})

function resetAll() {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    settingsStore.resetSettings()
    localSettings.value = { ...settingsStore.settings }
    setTheme(localSettings.value.theme)
  }
}

async function runDiagnostics() {
  await checkDependencies()
}

function getDepStatusClass(dep: { name: string, installed: boolean }) {
  return dep.installed ? 'status-ok' : 'status-error'
}

function getDepIcon(dep: { name: string, installed: boolean }) {
  return dep.installed ? '✓' : '✗'
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h2 class="settings-title">设置</h2>
      <button class="btn-reset" @click="resetAll">
        重置所有
      </button>
    </header>

    <div class="settings-content">
      <!-- Appearance -->
      <section class="settings-section">
        <h3 class="section-title">外观</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">主题</span>
            <span class="setting-desc">选择应用界面主题</span>
          </div>
          <div class="setting-control">
            <select v-model="localSettings.theme" class="select-input">
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">语言</span>
            <span class="setting-desc">选择界面显示语言</span>
          </div>
          <div class="setting-control">
            <select v-model="localSettings.language" class="select-input">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </section>

      <!-- General -->
      <section class="settings-section">
        <h3 class="section-title">通用</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动保存</span>
            <span class="setting-desc">自动保存项目进度</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.autoSave" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item" v-if="localSettings.autoSave">
          <div class="setting-info">
            <span class="setting-label">自动保存间隔</span>
            <span class="setting-desc">自动保存的间隔时间（秒）</span>
          </div>
          <div class="setting-control">
            <input 
              type="number" 
              v-model.number="localSettings.autoSaveInterval"
              min="10"
              max="300"
              class="number-input"
            />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">确认删除</span>
            <span class="setting-desc">删除字幕时显示确认对话框</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.confirmDelete" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- Subtitles -->
      <section class="settings-section">
        <h3 class="section-title">字幕</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">显示缩略图</span>
            <span class="setting-desc">在字幕列表中显示帧缩略图</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.showThumbnails" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">最大历史记录</span>
            <span class="setting-desc">撤销/重做的最大步数</span>
          </div>
          <div class="setting-control">
            <input 
              type="number" 
              v-model.number="localSettings.maxHistory"
              min="10"
              max="200"
              class="number-input"
            />
          </div>
        </div>
      </section>

      <!-- System Diagnostics -->
      <section class="settings-section">
        <h3 class="section-title">系统诊断</h3>
        
        <div class="diagnostics-status" :class="lastResult?.all_satisfied ? 'ok' : 'warning'">
          <span class="status-icon">{{ lastResult?.all_satisfied ? '✓' : '⚠' }}</span>
          <span class="status-text">{{ getStatusMessage() }}</span>
        </div>

        <div class="dependency-list" v-if="lastResult">
          <div 
            v-for="dep in lastResult.dependencies" 
            :key="dep.name"
            class="dependency-item"
          >
            <div class="dep-info">
              <span class="dep-name">{{ dep.name }}</span>
              <span class="dep-version" v-if="dep.version">{{ dep.version }}</span>
              <span class="dep-error" v-if="dep.error">{{ dep.error }}</span>
            </div>
            <span 
              class="dep-status"
              :class="getDepStatusClass(dep)"
            >
              {{ getDepIcon(dep) }} {{ dep.installed ? '已安装' : '未安装' }}
            </span>
          </div>
        </div>

        <div class="recommendations" v-if="lastResult?.recommendations.length">
          <h4 class="rec-title">建议</h4>
          <ul class="rec-list">
            <li v-for="(rec, i) in lastResult.recommendations" :key="i">{{ rec }}</li>
          </ul>
        </div>

        <button 
          class="btn-diagnostics" 
          @click="runDiagnostics"
          :disabled="isChecking"
        >
          {{ isChecking ? '检查中...' : '重新检查' }}
        </button>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h3 class="section-title">关于</h3>
        
        <div class="about-info">
          <div class="about-logo">🎬</div>
          <div class="about-text">
            <h4>SubLens</h4>
            <p>专业视频字幕提取工具</p>
            <p class="version">版本 3.0.0</p>
          </div>
        </div>

        <div class="about-links">
          <a href="https://github.com/Agions/HardSubX" target="_blank" class="about-link">
            GitHub
          </a>
          <a href="https://github.com/Agions/HardSubX/issues" target="_blank" class="about-link">
            问题反馈
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-base;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-6;
  border-bottom: 1px solid $border;
  background: $bg-surface;
}

.settings-title {
  font-size: $text-xl;
  font-weight: 600;
}

.btn-reset {
  padding: $space-2 $space-4;
  font-size: $text-sm;
  color: $text-secondary;
  background: $bg-overlay;
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    background: $border;
    color: $text-primary;
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-6;
  @include custom-scrollbar;
}

.settings-section {
  margin-bottom: $space-8;
}

.section-title {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: $space-4;
  padding-bottom: $space-2;
  border-bottom: 1px solid $border;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 0;
}

.setting-info {
  .setting-label {
    display: block;
    font-size: $text-base;
    color: $text-primary;
    margin-bottom: 2px;
  }
  
  .setting-desc {
    font-size: $text-sm;
    color: $text-muted;
  }
}

.setting-control {
  .select-input,
  .number-input {
    padding: $space-2 $space-3;
    font-size: $text-sm;
    background: $bg-surface;
    border: 1px solid $border;
    border-radius: $radius-md;
    color: $text-primary;
    
    &:focus {
      outline: none;
      border-color: $primary;
    }
  }
  
  .number-input {
    width: 80px;
    text-align: center;
  }
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .toggle-slider {
      background: $primary;
      
      &::before {
        transform: translateX(20px);
      }
    }
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: $bg-overlay;
    border-radius: $radius-full;
    transition: all $transition-fast;
    
    &::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: all $transition-fast;
    }
  }
}

.about-info {
  display: flex;
  align-items: center;
  gap: $space-4;
  padding: $space-4;
  background: $bg-surface;
  border-radius: $radius-lg;
  margin-bottom: $space-4;
}

.about-logo {
  font-size: 48px;
}

.about-text {
  h4 {
    font-size: $text-lg;
    font-weight: 600;
    margin-bottom: $space-1;
  }
  
  p {
    font-size: $text-sm;
    color: $text-secondary;
  }
  
  .version {
    font-family: $font-display;
    color: $text-muted;
    margin-top: $space-1;
  }
}

.about-links {
  display: flex;
  gap: $space-3;
}

.about-link {
  padding: $space-2 $space-4;
  font-size: $text-sm;
  color: $primary;
  background: $primary-dim;
  border-radius: $radius-md;
  text-decoration: none;
  transition: all $transition-fast;
  
  &:hover {
    background: $primary;
    color: white;
    text-decoration: none;
  }
}

// System Diagnostics
.diagnostics-status {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  margin-bottom: $space-4;
  
  &.ok {
    background: rgba($success, 0.1);
    color: $success;
  }
  
  &.warning {
    background: rgba($warning, 0.1);
    color: $warning;
  }
  
  .status-icon {
    font-size: $text-lg;
  }
  
  .status-text {
    font-size: $text-sm;
  }
}

.dependency-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-4;
}

.dependency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3;
  background: $bg-surface;
  border-radius: $radius-md;
  
  .dep-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .dep-name {
    font-size: $text-sm;
    font-weight: 500;
    color: $text-primary;
  }
  
  .dep-version {
    font-size: $text-xs;
    color: $text-muted;
    font-family: $font-mono;
  }
  
  .dep-error {
    font-size: $text-xs;
    color: $error;
  }
  
  .dep-status {
    font-size: $text-xs;
    padding: $space-1 $space-2;
    border-radius: $radius-sm;
    
    &.status-ok {
      background: rgba($success, 0.1);
      color: $success;
    }
    
    &.status-error {
      background: rgba($error, 0.1);
      color: $error;
    }
  }
}

.recommendations {
  padding: $space-3;
  background: $bg-surface;
  border-radius: $radius-md;
  margin-bottom: $space-4;
  
  .rec-title {
    font-size: $text-sm;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: $space-2;
  }
  
  .rec-list {
    margin: 0;
    padding-left: $space-4;
    
    li {
      font-size: $text-sm;
      color: $text-muted;
      margin-bottom: $space-1;
    }
  }
}

.btn-diagnostics {
  width: 100%;
  padding: $space-3;
  font-size: $text-sm;
  font-weight: 500;
  color: $text-primary;
  background: $bg-surface;
  border: 1px solid $border;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover:not(:disabled) {
    background: $bg-overlay;
    border-color: $primary;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
