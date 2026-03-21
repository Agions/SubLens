import { onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from './useVideoPlayer'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()
  const videoPlayer = useVideoPlayer()

  const shortcuts: KeyboardShortcut[] = [
    // Playback
    { key: ' ', action: () => videoPlayer.togglePlay(), description: '播放/暂停' },
    { key: 'ArrowLeft', action: () => videoPlayer.seekRelative(-1), description: '后退1帧' },
    { key: 'ArrowRight', action: () => videoPlayer.seekRelative(1), description: '前进1帧' },
    { key: 'ArrowLeft', shift: true, action: () => videoPlayer.seekRelative(-10), description: '后退10帧' },
    { key: 'ArrowRight', shift: true, action: () => videoPlayer.seekRelative(10), description: '前进10帧' },
    { key: 'Home', action: () => projectStore.setCurrentFrame(0), description: '跳到开头' },
    { key: 'End', action: () => {
      if (projectStore.videoMeta) {
        projectStore.setCurrentFrame(projectStore.videoMeta.totalFrames - 1)
      }
    }, description: '跳到结尾' },
    
    // Volume
    { key: 'ArrowUp', action: () => videoPlayer.setVolume(projectStore.volume + 0.1), description: '增加音量' },
    { key: 'ArrowDown', action: () => videoPlayer.setVolume(projectStore.volume - 0.1), description: '减小音量' },
    { key: 'm', action: () => videoPlayer.toggleMute(), description: '静音' },
    
    // Subtitles
    { key: 'Delete', action: () => {
      if (subtitleStore.selectedId) {
        subtitleStore.deleteSubtitle(subtitleStore.selectedId)
      }
    }, description: '删除选中字幕' },
    { key: 'z', ctrl: true, action: () => subtitleStore.undo(), description: '撤销' },
    { key: 'z', ctrl: true, shift: true, action: () => subtitleStore.redo(), description: '重做' },
    { key: 'a', ctrl: true, action: () => {
      if (subtitleStore.subtitles.length > 0) {
        subtitleStore.selectSubtitle(subtitleStore.subtitles[0].id)
      }
    }, description: '全选字幕' },
    
    // Navigation
    { key: 'j', action: () => {
      // Jump to next subtitle
      const current = subtitleStore.selectedSubtitle
      if (current) {
        const next = subtitleStore.subtitles.find(s => s.startFrame > current.startFrame)
        if (next) {
          subtitleStore.selectSubtitle(next.id)
          projectStore.setCurrentFrame(next.startFrame)
        }
      }
    }, description: '下一条字幕' },
    { key: 'k', action: () => {
      // Jump to previous subtitle
      const current = subtitleStore.selectedSubtitle
      if (current) {
        const prev = [...subtitleStore.subtitles].reverse().find(s => s.startFrame < current.startFrame)
        if (prev) {
          subtitleStore.selectSubtitle(prev.id)
          projectStore.setCurrentFrame(prev.startFrame)
        }
      }
    }, description: '上一条字幕' },
    
    // Export
    { key: 's', ctrl: true, action: () => {
      // Trigger export dialog
      console.log('[Shortcuts] Export triggered')
    }, description: '导出字幕' },
    
    // Help
    { key: '?', shift: true, action: () => {
      // Toggle shortcuts help
      console.log('[Shortcuts] Help triggered')
    }, description: '显示快捷键' },
  ]

  function handleKeyDown(e: KeyboardEvent) {
    // Don't trigger shortcuts when typing in input fields
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    for (const shortcut of shortcuts) {
      const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey)
      const shiftMatch = !!shortcut.shift === e.shiftKey
      const altMatch = !!shortcut.alt === e.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }

  function setupShortcuts() {
    window.addEventListener('keydown', handleKeyDown)
  }

  function cleanupShortcuts() {
    window.removeEventListener('keydown', handleKeyDown)
  }

  function getShortcutText(shortcut: KeyboardShortcut): string {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push('Alt')
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase())
    return parts.join('+')
  }

  return {
    shortcuts,
    setupShortcuts,
    cleanupShortcuts,
    getShortcutText
  }
}
