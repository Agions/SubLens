import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export interface FileInfo {
  path: string
  name: string
  size: number
  is_file: boolean
  is_dir: boolean
}

export function useFileOperations() {
  // Open file dialog
  async function openFileDialog(title: string = 'Select File'): Promise<string | null> {
    try {
      const path = await invoke<string>('open_file_dialog', {
        title,
        filters: []
      })
      return path
    } catch (e) {
      console.error('[FileOps] Failed to open file dialog:', e)
      return null
    }
  }

  // Save file dialog
  async function saveFileDialog(
    title: string = 'Save File',
    defaultName: string = 'output.srt'
  ): Promise<string | null> {
    try {
      const path = await invoke<string>('save_file_dialog', {
        title,
        defaultName,
        filters: []
      })
      return path
    } catch (e) {
      console.error('[FileOps] Failed to save file dialog:', e)
      return null
    }
  }

  // Write text to file
  async function writeTextFile(path: string, content: string): Promise<boolean> {
    try {
      await invoke('write_text_file', { path, content })
      return true
    } catch (e) {
      console.error('[FileOps] Failed to write file:', e)
      return false
    }
  }

  // Read text from file
  async function readTextFile(path: string): Promise<string | null> {
    try {
      const content = await invoke<string>('read_text_file', { path })
      return content
    } catch (e) {
      console.error('[FileOps] Failed to read file:', e)
      return null
    }
  }

  // Get file info
  async function getFileInfo(path: string): Promise<FileInfo | null> {
    try {
      const info = await invoke<FileInfo>('get_file_info', { path })
      return info
    } catch (e) {
      console.error('[FileOps] Failed to get file info:', e)
      return null
    }
  }

  // Export subtitles to file
  async function exportSubtitles(
    content: string,
    format: string,
    baseName: string = 'subtitle'
  ): Promise<string | null> {
    const extensions: Record<string, string> = {
      srt: 'srt',
      vtt: 'vtt',
      ass: 'ass',
      json: 'json',
      txt: 'txt'
    }

    const ext = extensions[format] || 'txt'
    const defaultName = `${baseName}.${ext}`

    const filePath = await saveFileDialog(`Export ${format.toUpperCase()}`, defaultName)
    if (!filePath) return null

    const success = await writeTextFile(filePath, content)
    return success ? filePath : null
  }

  return {
    openFileDialog,
    saveFileDialog,
    writeTextFile,
    readTextFile,
    getFileInfo,
    exportSubtitles
  }
}
