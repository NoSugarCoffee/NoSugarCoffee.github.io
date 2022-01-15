const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
  title: '诗序',
  tagline: 'Dinosaurs are cool',
  url: 'https://NoSugarCoffee.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
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
        translation: {
          showReadingTime: true,
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
        title: '诗序 de 小窝',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {to: '/translation', label: 'Translation', position: 'left'},
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
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      algolia: {
        apiKey: '49dc85e8a73e0d05a1529ef30bf8148c',
        indexName: 'shixu_blog',
        appId: '7HGYXE2ADQ',
        placeholder: 'Search...'
      },
    }),
});
