import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Zyfai Documentation',
  tagline: 'DeFi Yield Optimization Made Simple',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.zyf.ai',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'ondefy', // Usually your GitHub org/user name.
  projectName: 'zyfai-sdk', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ondefy/zyfai-sdk/tree/main/website/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Zyfai',
      logo: {
        alt: 'Zyfai Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://sdk.zyf.ai',
          label: 'Dashboard',
          position: 'left',
        },
        {
          href: 'https://www.npmjs.com/package/@zyfai/sdk',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/ondefy/zyfai-sdk',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Quick Start',
              to: '/docs/quickstart',
            },
            {
              label: 'Security',
              to: '/docs/security',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/zyfai',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/Zyfai',
            },
            {
              label: 'Telegram',
              href: 'https://t.me/zyfai',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Dashboard',
              href: 'https://sdk.zyf.ai',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/ondefy/zyfai-sdk',
            },
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/@zyfai/sdk',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Zyfai. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
