<script setup lang="ts">
import { ref } from 'vue'

const projectName = ref('未命名项目')

function handleOpenFile() {
  console.log('[ToolBar] Open file')
}

function handleSave() {
  console.log('[ToolBar] Save project')
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">📽️</span>
        <span class="logo-text">VisionSub</span>
      </div>
      <div class="divider"></div>
      <span class="project-name">{{ projectName }}</span>
    </div>
    
    <div class="toolbar-center">
      <button class="toolbar-btn" @click="handleOpenFile">
        <span class="btn-icon">📂</span>
        <span class="btn-text">打开</span>
      </button>
      <button class="toolbar-btn" @click="handleSave">
        <span class="btn-icon">💾</span>
        <span class="btn-text">保存</span>
      </button>
    </div>
    
    <div class="toolbar-right">
      <button class="toolbar-btn icon-only" title="视图">
        <span class="btn-icon">🖼️</span>
      </button>
      <button class="toolbar-btn icon-only" title="设置">
        <span class="btn-icon">⚙️</span>
      </button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.toolbar {
  height: $toolbar-height;
  background: $bg-surface;
  border-bottom: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-4;
  user-select: none;
}

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
    font-size: 20px;
  }
  
  .logo-text {
    font-family: $font-display;
    font-weight: 600;
    font-size: $text-lg;
    background: linear-gradient(135deg, $primary, $accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.divider {
  width: 1px;
  height: 24px;
  background: $border;
}

.project-name {
  font-size: $text-sm;
  color: $text-secondary;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: all $transition-fast;
  
  &:hover {
    background: $bg-overlay;
    color: $text-primary;
  }
  
  &:active {
    transform: scale(0.97);
  }
  
  &.icon-only {
    padding: $space-2;
  }
  
  .btn-icon {
    font-size: 16px;
  }
  
  .btn-text {
    font-size: $text-sm;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: $space-1;
}
</style>
