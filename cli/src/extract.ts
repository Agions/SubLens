#!/usr/bin/env node
/**
 * SubLens CLI v3.2.0
 * Video Subtitle Extraction Tool
 */

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join, basename, extname } from 'path'
import { spawnSync } from 'child_process'
import { createWorker } from 'tesseract.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { postProcessText, calibrateConfidence, mergeSimilarSubtitles, type RawSubtitle } from './postprocess.js'
import { FORMATTERS, FORMAT_NAMES, type ExportFormat, type SubtitleItem } from './formats.js'

// ── ROI ──────────────────────────────────────────────────────────────────────

interface ROI { x: number; y: number; width: number; height: number; unit: 'percent' }

const ROI_PRESETS: Record<string, ROI> = {
  bottom: { x: 0, y: 80, width: 100, height: 20, unit: 'percent' },
  top:    { x: 0, y: 0,  width: 100, height: 20, unit: 'percent' },
  center: { x: 10, y: 70, width: 80, height: 20, unit: 'percent' },
  left:   { x: 0, y: 30, width: 40, height: 40, unit: 'percent' },
  right:  { x: 60, y: 30, width: 40, height: 40, unit: 'percent' },
}

// ── FFmpeg Helpers ─────────────────────────────────────────────────────────────

function run(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000 })
  if (r.error) throw r.error
  if (r.status !== 0 && r.stderr) throw new Error(r.stderr.slice(0, 500))
  return r.stdout as string
}

function getVideoInfo(videoPath: string) {
  const out = run('ffprobe', [
    '-v', 'quiet', '-print_format', 'json',
    '-show_streams', '-show_format', videoPath,
  ])
  const data = JSON.parse(out)
  const vs = data.streams.find((s: any) => s.codec_type === 'video')
  const fmt = data.format
  const fpsNum = parseInt(vs.r_frame_rate.split('/')[0])
  const fpsDen = parseInt(vs.r_frame_rate.split('/')[1] ?? '1')
  const fps = fpsNum / fpsDen
  return {
    width: vs.width,
    height: vs.height,
    fps,
    duration: parseFloat(fmt.duration || '0'),
    totalFrames: Math.ceil(parseFloat(fmt.duration || '0') * fps),
    codec: vs.codec_name,
  }
}

function extractROIFrameToFile(
  videoPath: string, frameIndex: number, outPath: string,
  roi: ROI, width: number, height: number
): void {
  const x = Math.round((roi.x / 100) * width)
  const y = Math.round((roi.y / 100) * height)
  const w = Math.round((roi.width / 100) * width)
  const h = Math.round((roi.height / 100) * height)
  run('ffmpeg', [
    '-y', '-ss', String(frameIndex),
    '-i', videoPath,
    '-vf', `crop=${w}:${h}:${x}:${y}`,
    '-frames:v', '1', '-q:v', '2',
    outPath,
  ])
}

function progressBar(current: number, total: number, extra = ''): string {
  const pct = Math.round((current / total) * 100)
  const filled = Math.floor(pct / 5)
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
  return `\r   [${bar}] ${pct}%${extra ? ` ${extra}` : ''}  `
}

// ── Arg Parsing ────────────────────────────────────────────────────────────────

type Argv = Record<string, unknown>

function parseArgs(): Argv {
  return yargs(hideBin(process.argv))
    .scriptName('hardsubx-cli')
    .version('3.2.0')
    .command('extract <video>', 'Extract subtitles from video', yargs => yargs
      .positional('video', { type: 'string', demandOption: true })
      .option('output',    { alias: 'o', type: 'string', default: './subs' })
      .option('format',    { alias: 'f', type: 'string', default: 'srt' })
      .option('roi',       { type: 'string', default: 'bottom' })
      .option('lang',      { alias: 'l', type: 'string', default: 'chi_sim+eng' })
      .option('confidence',{ alias: 'c', type: 'number', default: 70 })
      .option('interval', { alias: 'i', type: 'number', default: 1 })
      .option('scene',    { type: 'number', default: 0.30 })
      .option('workers',   { alias: 'w', type: 'number', default: 2 })
      .option('no-merge', { type: 'boolean', default: false })
    )
    .command('info <video>', 'Show video info', yargs => yargs
      .positional('video', { type: 'string', demandOption: true })
    )
    .command('preview <video>', 'Preview a frame', yargs => yargs
      .positional('video', { type: 'string', demandOption: true })
      .option('frame', { alias: 'n', type: 'number', demandOption: true })
      .option('roi',  { type: 'string', default: 'bottom' })
    )
    .demandCommand(1)
    .strict()
    .parse() as Argv
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tmpDir = '/tmp/hardsubx-cli'
  mkdirSync(tmpDir, { recursive: true })

  try {
    const argv = parseArgs()
    const cmd = (argv._ as string[])[0]

    if (cmd === 'info') {
      const videoPath = argv.video as string
      if (!existsSync(videoPath)) { console.error('❌ Video not found'); process.exit(1) }
      const info = getVideoInfo(videoPath)
      console.log(`
🔍 SubLens CLI v3.2.0 — Video Info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 File:   ${videoPath}
📐 Size:   ${info.width}×${info.height}
⏱️  Time:  ${info.duration.toFixed(2)}s
🎬 FPS:    ${info.fps.toFixed(2)}
🧮 Frames: ${info.totalFrames}
🎨 Codec:  ${info.codec}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      return
    }

    if (cmd === 'preview') {
      const videoPath = argv.video as string
      const frameNum = argv.frame as number
      const roiPreset = (argv.roi as string) ?? 'bottom'
      const roi = ROI_PRESETS[roiPreset] ?? ROI_PRESETS.bottom
      if (!existsSync(videoPath)) { console.error('❌ Video not found'); process.exit(1) }
      const info = getVideoInfo(videoPath)
      const outPath = join(tmpDir, `preview_${frameNum}.png`)
      extractROIFrameToFile(videoPath, frameNum, outPath, roi, info.width, info.height)
      console.log(`✅ Frame #${frameNum} → ${outPath}\n   ROI: ${roiPreset} (${roi.width}×${roi.height}% at ${roi.x}%,${roi.y}%)`)
      return
    }

    // ── EXTRACT ──────────────────────────────────────────────────────────────

    const videoPath = argv.video as string
    if (!existsSync(videoPath)) { console.error('❌ Video not found'); process.exit(1) }

    const outputDir = (argv.output as string) ?? './subs'
    const formats = ((argv.format as string) ?? 'srt').split(',') as ExportFormat[]
    const roiPreset = (argv.roi as string) ?? 'bottom'
    const roi = ROI_PRESETS[roiPreset] ?? ROI_PRESETS.bottom
    const lang = (argv.lang as string) ?? 'chi_sim+eng'
    const confThresh = ((argv.confidence as number) ?? 70) / 100
    const frameInterval = (argv.interval as number) ?? 1
    const workers = (argv.workers as number) ?? 2
    const enableMerge = !(argv['no-merge'] as boolean)

    process.stdout.write('\n⚙️  Analyzing video...\n')
    const info = getVideoInfo(videoPath)
    console.log(`   ${info.width}×${info.height} · ${info.fps.toFixed(2)} FPS · ${info.totalFrames} frames\n`)

    process.stdout.write(`🧠 Initializing Tesseract.js (${workers} workers, lang=${lang})...\n`)
    const worker = await createWorker(lang, workers, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') process.stdout.write(`\r   OCR: ${Math.round(m.progress * 100)}%`)
      },
    })
    console.log('\n✅ OCR engine ready\n')

    process.stdout.write(`🎬 Extracting (ROI=${roiPreset}, lang=${lang}, interval=${frameInterval})...\n`)

    const rawSubs: RawSubtitle[] = []
    let lastPct = -1
    let framesProcessed = 0

    for (let fi = 0; fi < info.totalFrames; fi += frameInterval) {
      const pct = Math.round((fi / info.totalFrames) * 100)
      if (pct !== lastPct) {
        process.stdout.write(progressBar(fi, info.totalFrames, `#${fi}`))
        lastPct = pct
      }

      const roiPng = join(tmpDir, `roi_${fi}.png`)
      try {
        extractROIFrameToFile(videoPath, fi, roiPng, roi, info.width, info.height)
        const { data: { text, confidence } } = await worker.recognize(roiPng)

        const rawText = text.trim()
        if (rawText) {
          const processed = postProcessText(rawText, lang.split('_')[0] ?? 'ch')
          const calibrated = calibrateConfidence(processed, (confidence ?? 0) / 100, lang.split('_')[0] ?? 'ch')
          if (calibrated >= confThresh && processed.length > 0) {
            const timestamp = fi / info.fps
            rawSubs.push({
              startTime: timestamp,
              endTime: timestamp + (2 / info.fps),
              text: processed,
              confidence: calibrated,
            })
          }
        }
        framesProcessed++
      } catch {
        // Skip frame on error
      }
    }

    await worker.terminate()
    process.stdout.write(progressBar(info.totalFrames, info.totalFrames, `#${info.totalFrames}`))
    process.stdout.write('\n')

    console.log(`\n✅ Processed ${framesProcessed} frames → ${rawSubs.length} raw subtitles`)

    // ── Merge ──────────────────────────────────────────────────────────────
    let finalSubs = rawSubs
    if (enableMerge && rawSubs.length > 1) {
      const merged = mergeSimilarSubtitles(rawSubs, info.fps, 0.80, 0.5)
      console.log(`🔗 Merged → ${merged.length} subtitles`)
      finalSubs = merged
    }

    // ── Build SubtitleItem list ───────────────────────────────────────────
    const subtitles: SubtitleItem[] = finalSubs.map((s, i) => ({
      id: `sub-${i}`,
      index: i + 1,
      startTime: s.startTime,
      endTime: s.endTime,
      startFrame: Math.round(s.startTime * info.fps),
      endFrame: Math.round(s.endTime * info.fps),
      text: s.text,
      confidence: s.confidence,
      language: lang.split('+')[0],
      edited: false,
    }))

    // ── Export ────────────────────────────────────────────────────────────
    mkdirSync(outputDir, { recursive: true })
    const baseName = basename(videoPath, extname(videoPath))

    for (const fmt of formats) {
      const formatter = FORMATTERS[fmt]
      if (!formatter) { console.warn(`⚠️  Unknown format: ${fmt}`); continue }
      const outPath = join(outputDir, `${baseName}.${fmt}`)
      writeFileSync(outPath, formatter(subtitles), 'utf8')
      console.log(`   ✅ ${FORMAT_NAMES[fmt]} → ${outPath}`)
    }

    console.log(`\n🎉 Done! ${subtitles.length} subtitles exported to ${outputDir}/`)
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`)
  process.exit(1)
})
