<script setup lang="ts">
import { useSettingsTab } from '@/composables/useSettingsTab'
import { useProjectStore } from '@/stores/project'

const { localSettings, systemDeps, handleThemeChange } = useSettingsTab()
const projectStore = useProjectStore()
</script>

<template>
  <div class="tab-content settings-tab">
    <div class="section">
      <div class="section-header">
        <span class="section-title">外观</span>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">主题</span>
          <span class="setting-desc">选择应用界面主题</span>
        </div>
        <div class="setting-control">
          <select v-model="localSettings.theme" class="select-input" @change="handleThemeChange">
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">语言</span>
          <span class="setting-desc">界面显示语言</span>
        </div>
        <div class="setting-control">
          <select v-model="localSettings.language" class="select-input">
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">字幕列表</span>
      </div>
      <div class="setting-item toggle-item">
        <div class="setting-info">
          <span class="setting-label">显示缩略图</span>
          <span class="setting-desc">在字幕列表中显示帧缩略图</span>
        </div>
        <div class="setting-control">
          <button
            :class="['toggle-btn', { active: localSettings.showThumbnails }]"
            @click="localSettings.showThumbnails = !localSettings.showThumbnails"
          >
            <span class="toggle-thumb" />
          </button>
        </div>
      </div>
      <div class="setting-item toggle-item">
        <div class="setting-info">
          <span class="setting-label">删除确认</span>
          <span class="setting-desc">删除字幕时显示确认对话框</span>
        </div>
        <div class="setting-control">
          <button
            :class="['toggle-btn', { active: localSettings.confirmDelete }]"
            @click="localSettings.confirmDelete = !localSettings.confirmDelete"
          >
            <span class="toggle-thumb" />
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">自动保存</span>
      </div>
      <div class="setting-item toggle-item">
        <div class="setting-info">
          <span class="setting-label">启用自动保存</span>
          <span class="setting-desc">定期自动保存项目进度</span>
        </div>
        <div class="setting-control">
          <button
            :class="['toggle-btn', { active: localSettings.autoSave }]"
            @click="localSettings.autoSave = !localSettings.autoSave"
          >
            <span class="toggle-thumb" />
          </button>
        </div>
      </div>
      <div class="setting-item" v-if="localSettings.autoSave">
        <div class="setting-info">
          <span class="setting-label">保存间隔</span>
          <span class="setting-desc">自动保存间隔（秒）</span>
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
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">处理选项</span>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">合并相似度阈值</span>
          <span class="setting-desc">字幕合并的文本相似度阈值</span>
        </div>
        <div class="setting-control slider-control">
          <div class="slider-track">
            <div class="slider-fill" :style="{ width: projectStore.extractOptions.mergeThreshold * 100 + '%' }"/>
            <input
              type="range"
              v-model.number="projectStore.extractOptions.mergeThreshold"
              min="0.5"
              max="1.0"
              step="0.01"
              class="slider"
            />
          </div>
          <span class="slider-value">{{ Math.round(projectStore.extractOptions.mergeThreshold * 100) }}%</span>
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">置信度阈值</span>
          <span class="setting-desc">字幕识别的最低置信度</span>
        </div>
        <div class="setting-control slider-control">
          <div class="slider-track">
            <div class="slider-fill" :style="{ width: projectStore.extractOptions.confidenceThreshold * 100 + '%' }"/>
            <input
              type="range"
              v-model.number="projectStore.extractOptions.confidenceThreshold"
              min="0"
              max="1"
              step="0.01"
              class="slider"
            />
          </div>
          <span class="slider-value">{{ Math.round(projectStore.extractOptions.confidenceThreshold * 100) }}%</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">系统状态</span>
      </div>
      <div class="system-status">
        <div
          v-for="dep in systemDeps"
          :key="dep.name"
          :class="['dep-item', dep.installed ? 'dep-ok' : 'dep-missing']"
        >
          <span class="dep-icon">{{ dep.installed ? '✓' : '✗' }}</span>
          <span class="dep-name">{{ dep.name }}</span>
          <span class="dep-status">{{ dep.installed ? '已安装' : '未安装' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
