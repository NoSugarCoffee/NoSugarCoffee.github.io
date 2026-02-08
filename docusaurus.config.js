import {themes as prismThemes} from 'prism-react-renderer';

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
  title: '诗序',
  tagline: 'Dinosaurs are cool',
  url: 'https://NoSugarCoffee.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/blog.svg',
  organizationName: 'NoSugarCoffee', // Usually your GitHub org/user name.
  projectName: 'shixu', // Usually your repo name.
  plugins: [
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'translation',
        routeBasePath: 'translation',
        path: './translation',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'trending',
        routeBasePath: 'trending',
        path: './reports',
        blogTitle: 'GitHub AI Trending Reports',
        blogDescription: 'Weekly analysis of trending AI repositories on GitHub',
        postsPerPage: 10,
        blogSidebarCount: 'ALL',
        blogSidebarTitle: 'All Reports',
        remarkPlugins: [],
        rehypePlugins: [],
      },
    ],
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          routeBasePath: '/',
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
        title: '技术原创',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo-light.jpg',
          srcDark: 'img/logo-dark.jpg',
        },
        items: [
          {to: '/translation', label: '外刊翻译', position: 'left'},
          {to: '/trending', label: 'AI Trending', position: 'left'},
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
