import { ref, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

export function useVideoPlayer() {
  const projectStore = useProjectStore()
  
  const videoRef = ref<HTMLVideoElement | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Initialize video element
  function initVideo(element: HTMLVideoElement) {
    videoRef.value = element
    
    element.addEventListener('loadedmetadata', () => {
      isReady.value = true
      isLoading.value = false
    })
    
    element.addEventListener('error', () => {
      error.value = '视频加载失败'
      isLoading.value = false
    })
    
    element.addEventListener('play', () => {
      projectStore.setPlaying(true)
    })
    
    element.addEventListener('pause', () => {
      projectStore.setPlaying(false)
    })
    
    element.addEventListener('ended', () => {
      projectStore.setPlaying(false)
    })
    
    // Throttled frame update — prevents store updates on every timeupdate event
  // (browsers fire timeupdate at unpredictable rates, causing excess re-renders)
  let _rafPending = false
  let _lastFrameTime = 0

  element.addEventListener('timeupdate', () => {
    if (_rafPending) return
    _rafPending = true
    requestAnimationFrame(() => {
      if (projectStore.videoMeta && element.currentTime) {
        const frame = Math.floor(element.currentTime * projectStore.videoMeta.fps)
        // Only update if frame actually changed (avoids unnecessary reactivity)
        if (frame !== _lastFrameTime) {
          _lastFrameTime = frame
          projectStore.setCurrentFrame(frame)
        }
      }
      _rafPending = false
    })
  })
  }
  
  // Load video
  async function loadVideo(path: string) {
    if (!videoRef.value) {
      error.value = 'Video element not initialized'
      return
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // For Tauri, we'd use the asset protocol
      // For web development, we'd use a blob URL or direct path
      videoRef.value.src = path
      await videoRef.value.load()
    } catch (e) {
      error.value = `Failed to load video: ${e}`
      isLoading.value = false
    }
  }
  
  // Playback controls
  function play() {
    videoRef.value?.play()
  }
  
  function pause() {
    videoRef.value?.pause()
  }
  
  function togglePlay() {
    if (projectStore.isPlaying) {
      pause()
    } else {
      play()
    }
  }
  
  function seek(time: number) {
    if (videoRef.value) {
      videoRef.value.currentTime = time
    }
  }
  
  function seekToFrame(frame: number) {
    if (projectStore.videoMeta) {
      const time = frame / projectStore.videoMeta.fps
      seek(time)
    }
  }
  
  function seekRelative(deltaFrames: number) {
    const newFrame = projectStore.currentFrame + deltaFrames
    seekToFrame(Math.max(0, newFrame))
  }
  
  // Volume
  function setVolume(volume: number) {
    if (videoRef.value) {
      videoRef.value.volume = Math.max(0, Math.min(1, volume))
      projectStore.volume = videoRef.value.volume
    }
  }
  
  function toggleMute() {
    if (videoRef.value) {
      videoRef.value.muted = !videoRef.value.muted
      projectStore.isMuted = videoRef.value.muted
    }
  }
  
  // Frame capture
  function captureFrame(): ImageData | null {
    if (!videoRef.value || !isReady.value) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    ctx.drawImage(videoRef.value, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  
  function captureFrameAsDataURL(): string | null {
    if (!videoRef.value || !isReady.value) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    ctx.drawImage(videoRef.value, 0, 0)
    return canvas.toDataURL('image/png')
  }
  
  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case ' ':
        e.preventDefault()
        togglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        seekRelative(-1)
        break
      case 'ArrowRight':
        e.preventDefault()
        seekRelative(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume(projectStore.volume + 0.1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume(projectStore.volume - 0.1)
        break
      case 'm':
        toggleMute()
        break
    }
  }
  
  // Cleanup
  onUnmounted(() => {
    if (videoRef.value) {
      videoRef.value.pause()
      videoRef.value.src = ''
    }
  })
  
  return {
    videoRef,
    isReady,
    isLoading,
    error,
    initVideo,
    loadVideo,
    play,
    pause,
    togglePlay,
    seek,
    seekToFrame,
    seekRelative,
    setVolume,
    toggleMute,
    captureFrame,
    captureFrameAsDataURL,
    handleKeydown
  }
}
