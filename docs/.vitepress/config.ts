import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/SubLens/',
  title: 'SubLens',
  description: 'SubLens - 专业的视频字幕提取工具，从视频中提取硬编码字幕，支持多种格式输出。',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/SubLens/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#0A84FF' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'SubLens' }],
    ['meta', { property: 'og:description', content: '专业的视频字幕提取工具' }],
  ],

  themeConfig: {
    logo: '/SubLens/logo.svg',
    siteTitle: 'SubLens',

    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'CLI', link: '/guide/cli' },
      { text: '架构', link: '/guide/architecture' },
      { text: '导出格式', link: '/guide/export-formats' },
      {
        text: 'v3.5.0',
        items: [
          { text: '更新日志', link: '/CHANGELOG' },
          { text: 'GitHub', link: 'https://github.com/Agions/SubLens' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速上手', link: '/guide/getting-started' },
            { text: 'OCR 引擎', link: '/guide/getting-started#ocr-engines' },
            { text: '键盘快捷键', link: '/guide/keyboard-shortcuts' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: 'CLI 参考', link: '/guide/cli' },
            { text: '导出格式', link: '/guide/export-formats' },
            { text: '架构设计', link: '/guide/architecture' },
          ],
        },
        {
          text: '帮助',
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '故障排除', link: '/guide/troubleshooting' },
          ],
        },
      ],
    },

    footer: {
      message: '基于 MIT 许可证发布。',
      copyright: `Copyright © 2025-${new Date().getFullYear()} SubLens`,
    },

    editLink: {
      pattern: 'https://github.com/Agions/SubLens/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/SubLens' },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: false,
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
})
