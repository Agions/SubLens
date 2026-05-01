import { ref, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { CANVAS_CONTEXT_2D, MIME_IMAGE_PNG } from '@/utils/constants'

// ─── Video event constants ───────────────────────────────────────────
const VIDEO_EVENTS = {
  LOADED_METADATA: 'loadedmetadata',
  ERROR: 'error',
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  TIME_UPDATE: 'timeupdate',
} as const

type VideoEvent = typeof VIDEO_EVENTS[keyof typeof VIDEO_EVENTS]

// ─── Keyboard shortcut constants ─────────────────────────────────────
const KEYBOARD_SHORTCUTS = {
  SPACE: ' ',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  MUTE: 'm',
} as const

export function useVideoPlayer() {
  const projectStore = useProjectStore()

  const videoRef = ref<HTMLVideoElement | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Track listeners so they can be removed on cleanup
  type BoundHandler = [HTMLVideoElement, VideoEvent, EventListener]
  const _listeners: BoundHandler[] = []

  function _addListener(el: HTMLVideoElement, event: VideoEvent, handler: EventListener) {
    el.addEventListener(event, handler)
    _listeners.push([el, event, handler])
  }

  function _cleanupListeners() {
    for (const [el, event, handler] of _listeners) {
      el.removeEventListener(event, handler)
    }
    _listeners.length = 0
  }

  // Initialize video element
  function initVideo(element: HTMLVideoElement) {
    videoRef.value = element

    _addListener(element, VIDEO_EVENTS.LOADED_METADATA, () => {
      isReady.value = true
      isLoading.value = false
    })

    _addListener(element, VIDEO_EVENTS.ERROR, () => {
      error.value = '视频加载失败'
      isLoading.value = false
    })

    _addListener(element, VIDEO_EVENTS.PLAY, () => {
      projectStore.setPlaying(true)
    })

    _addListener(element, VIDEO_EVENTS.PAUSE, () => {
      projectStore.setPlaying(false)
    })

    _addListener(element, VIDEO_EVENTS.ENDED, () => {
      projectStore.setPlaying(false)
    })

    // Throttled frame update — prevents store updates on every timeupdate event
    let _rafPending = false
    let _lastFrameTime = 0

    _addListener(element, VIDEO_EVENTS.TIME_UPDATE, () => {
      if (_rafPending) return
      _rafPending = true
      requestAnimationFrame(() => {
        if (projectStore.videoMeta && element.currentTime) {
          const frame = Math.floor(element.currentTime * projectStore.videoMeta.fps)
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
      const duration = videoRef.value.duration || 0
      // Clamp to valid range [0, duration]
      const clampedTime = Math.max(0, Math.min(time, duration))
      videoRef.value.currentTime = clampedTime
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

  // Reusable offscreen canvas for frame capture (avoids per-frame allocation)
  const _captureCanvas = ref<HTMLCanvasElement | null>(null)
  const _captureCtx = ref<CanvasRenderingContext2D | null>(null)

  function _ensureCaptureCanvas(width: number, height: number): CanvasRenderingContext2D | null {
    if (!_captureCanvas.value || _captureCanvas.value.width !== width || _captureCanvas.value.height !== height) {
      _captureCanvas.value = document.createElement('canvas')
      _captureCanvas.value.width = width
      _captureCanvas.value.height = height
      _captureCtx.value = _captureCanvas.value.getContext(CANVAS_CONTEXT_2D)
    }
    return _captureCtx.value
  }

  // Frame capture
  function captureFrame(): ImageData | null {
    if (!videoRef.value || !isReady.value) return null

    const width = videoRef.value.videoWidth
    const height = videoRef.value.videoHeight
    const ctx = _ensureCaptureCanvas(width, height)
    if (!ctx) return null

    ctx.drawImage(videoRef.value, 0, 0)
    return ctx.getImageData(0, 0, width, height)
  }

  function captureFrameAsDataURL(): string | null {
    if (!videoRef.value || !isReady.value) return null

    const width = videoRef.value.videoWidth
    const height = videoRef.value.videoHeight
    const ctx = _ensureCaptureCanvas(width, height)
    if (!ctx) return null

    ctx.drawImage(videoRef.value, 0, 0)
    return _captureCanvas.value!.toDataURL(MIME_IMAGE_PNG)
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case KEYBOARD_SHORTCUTS.SPACE:
        e.preventDefault()
        togglePlay()
        break
      case KEYBOARD_SHORTCUTS.ARROW_LEFT:
        e.preventDefault()
        seekRelative(-1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_RIGHT:
        e.preventDefault()
        seekRelative(1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_UP:
        e.preventDefault()
        setVolume(projectStore.volume + 0.1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_DOWN:
        e.preventDefault()
        setVolume(projectStore.volume - 0.1)
        break
      case KEYBOARD_SHORTCUTS.MUTE:
        toggleMute()
        break
    }
  }

  // Cleanup — remove all event listeners and clear video src
  onUnmounted(() => {
    _cleanupListeners()
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
