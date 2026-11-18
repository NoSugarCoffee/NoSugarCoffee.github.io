import {themes as prismThemes} from 'prism-react-renderer';
import legacyTrendingRoutes from './src/data/legacy-trending-routes.json';

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
  title: '诗序',
  tagline: '关于 AI 编程和代码知识库的实践笔记：RAG、代码图、Agent 与开发环境。',
  url: 'https://NoSugarCoffee.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/blog.svg',
  organizationName: 'NoSugarCoffee', // Usually your GitHub org/user name.
  projectName: 'shixu', // Usually your repo name.
  plugins: [
    [
      require.resolve('./plugins/ai-radar'),
      {dataDir: 'radar-data', rssDataDir: 'radar-rss-data'},
    ],
    [
      require.resolve('./plugins/rss-feeds'),
      {
        opmlUrl: 'https://raw.githubusercontent.com/NoSugarCoffee/rss-feeds/main/feeds.opml',
      },
    ],
    [
      // The blog used to live at the site root and translations at /translation;
      // keep links people already shared working after the move to /archive.
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {from: '/Go error handing', to: '/archive/Go error handing'},
          {from: '/Maven Summary', to: '/archive/Maven Summary'},
          {from: '/Mvnd vs Maven', to: '/archive/Mvnd vs Maven'},
          {from: '/translation/Go 的依赖注入', to: '/archive/Go 的依赖注入'},
          {from: '/translation/超大规模代码库的RAG实践指南', to: '/articles'},
          {from: '/translation', to: '/archive'},
          // The weekly reports at /trending became the AI 开源雷达 at /radar.
          ...legacyTrendingRoutes.map((from) => ({from, to: '/radar'})),
        ],
      },
    ],
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: {
          showReadingTime: true,
          routeBasePath: 'archive',
          blogTitle: '归档',
          blogSidebarTitle: '归档',
          editUrl:
            'https://github.com/NoSugarCoffee/NoSugarCoffee.github.io/edit/master/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [{name: 'google-site-verification', content: 'JuUp00xMkr_DW0Xw_LZpUryS9dZQ0vfdjJCP5lS36qo'}],
      navbar: {
        title: '诗序',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo-dark.png',
          srcDark: 'img/logo-light.png',
        },
        items: [
          {to: '/articles', label: '文章', position: 'left'},
          {to: '/radar', label: 'AI 雷达', position: 'left'},
          {to: '/archive', label: '归档', position: 'left'},
          {to: '/feeds', label: '订阅', position: 'right'},
          {
            href: 'https://nosugarcoffee.github.io/leetcode/',
            label: 'Leetcode Solutions',
            position: 'right',
          },
          {
            href: 'https://github.com/NoSugarCoffee/shixu',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} 诗序 de 小窝, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      }
    }),
});
