import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SubLens',
  description: '智能视频字幕提取工具 — 基于 Tauri 2.x + Vue 3 + Rust，输出 12 种字幕格式',
  lang: 'zh-CN',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#08090a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'SubLens — 智能视频字幕提取工具' }],
    ['meta', { property: 'og:description', content: '从视频中提取硬编码字幕，输出 SRT · VTT · ASS · JSON 等 12 种格式' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'SubLens',

    nav: [
      { text: '快速开始', link: '/guide/getting-started', activeMatch: '/guide/getting-started' },
      { text: '操作流程', link: '/guide/first-extraction' },
      { text: 'OCR 引擎', link: '/guide/ocr-engines' },
      { text: '导出格式', link: '/guide/export-formats' },
      {
        text: 'API',
        items: [
          { text: '命令总览', link: '/api/commands' },
          { text: 'Pipeline', link: '/api/pipeline' },
          { text: 'Exporter', link: '/api/exporter' },
          { text: 'SceneDetect', link: '/api/scene-detect' },
          { text: 'Calibrator', link: '/api/calibrator' },
        ],
      },
      {
        text: '更多',
        items: [
          { text: '快捷键', link: '/guide/keyboard-shortcuts' },
          { text: '常见问题', link: '/guide/faq' },
          { text: '架构设计', link: '/architecture' },
          { text: '开发者指南', link: '/developer-guide' },
          { text: 'GitHub', link: 'https://github.com/Agions/SubLens' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速上手',
          items: [
            { text: '安装与运行', link: '/guide/getting-started' },
            { text: '首次提取', link: '/guide/first-extraction' },
            { text: '快捷键', link: '/guide/keyboard-shortcuts' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
        {
          text: '核心功能',
          collapsed: false,
          items: [
            { text: 'OCR 引擎', link: '/guide/ocr-engines' },
            { text: 'ROI 区域', link: '/guide/roi' },
            { text: '导出格式', link: '/guide/export-formats' },
          ],
        },
        {
          text: '架构与开发',
          items: [
            { text: '架构设计', link: '/architecture' },
            { text: '开发者指南', link: '/developer-guide' },
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

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    editLink: {
      pattern: 'https://github.com/Agions/SubLens/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    footer: {
      message: '基于 MIT 许可证开源',
      copyright: 'Copyright © 2024-present SubLens Contributors',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/SubLens' },
    ],
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },

  vite: {
    css: {
      preprocessorOptions: {},
    },
  },
})
