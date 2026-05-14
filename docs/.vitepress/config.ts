import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SubLens',
  description: '视频字幕提取工具 — 从视频中提取硬编码字幕，输出 12 种格式',
  lang: 'zh-CN',
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'SubLens',
    nav: [
      { text: '快速开始', link: '/guide/getting-started' },
      { text: '操作流程', link: '/guide/first-extraction' },
      { text: 'API', link: '/api/commands' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '快速上手',
          items: [
            { text: '安装与运行', link: '/guide/getting-started' },
            { text: '首次提取', link: '/guide/first-extraction' },
            { text: 'OCR 引擎', link: '/guide/ocr-engines' },
            { text: 'ROI 区域', link: '/guide/roi' },
            { text: '导出格式', link: '/guide/export-formats' },
            { text: '快捷键', link: '/guide/keyboard-shortcuts' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
        {
          text: '核心功能',
          collapsed: true,
          items: [
            { text: '多引擎 OCR', link: '/guide/ocr-engines' },
            { text: '智能后处理', link: '/api/pipeline' },
            { text: '场景检测', link: '/api/scene-detect' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Tauri 命令',
          items: [
            { text: '命令总览', link: '/api/commands' },
          ],
        },
        {
          text: '前端 API',
          items: [
            { text: 'Pipeline', link: '/api/pipeline' },
            { text: 'Exporter', link: '/api/exporter' },
            { text: 'SceneDetect', link: '/api/scene-detect' },
            { text: 'Calibrator', link: '/api/calibrator' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/SubLens' },
    ],
    footer: {
      message: '基于 MIT 许可证开源',
      copyright: 'Copyright © 2024-present SubLens Contributors',
    },
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/Agions/SubLens/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  },
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
