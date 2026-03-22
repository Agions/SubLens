import { invoke } from '@tauri-apps/api/core'
import type { VideoMetadata } from '@/types/video'

export async function getVideoMetadata(path: string): Promise<VideoMetadata> {
  try {
    const meta = await invoke<{
      path: string
      width: number
      height: number
      duration: number
      fps: number
      total_frames: number
      codec: string
    }>('get_video_metadata', { path })
    
    return {
      path: meta.path,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      fps: meta.fps,
      totalFrames: meta.total_frames,
      codec: meta.codec
    }
  } catch (e) {
    console.error('[VideoMetadata] Failed to get metadata from Tauri:', e)
    // Fallback to browser-based metadata extraction
    return await getVideoMetadataBrowser(path)
  }
}

async function getVideoMetadataBrowser(path: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    // For Tauri, we need to use the asset protocol
    const src = path.startsWith('http') ? path : `asset://localhost/${encodeURIComponent(path)}`
    
    video.onloadedmetadata = () => {
      resolve({
        path,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        fps: 30, // Default, can be adjusted
        totalFrames: Math.floor(video.duration * 30),
        codec: 'unknown'
      })
      URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
      URL.revokeObjectURL(video.src)
    }
    
    video.src = src
  })
}

export function useVideoMetadata() {
  return {
    getVideoMetadata
  }
}
