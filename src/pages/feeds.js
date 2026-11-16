import React from 'react';
import Layout from '@theme/Layout';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './feeds.module.css';

function FeedGroup({group}) {
  return (
    <div className={styles.feedGroup}>
      <h3>{group.name}</h3>
      <ul className={styles.feedList}>
        {group.feeds.map((feed) => (
          <li key={feed.feedUrl}>
            <a href={feed.siteUrl} target="_blank" rel="noopener noreferrer">
              {feed.name}
            </a>
            <a className={styles.feedLink} href={feed.feedUrl} target="_blank" rel="noopener noreferrer">
              RSS
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Feeds() {
  const {opmlUrl, groups} = usePluginData('rss-feeds');

  return (
    <Layout title="我的订阅" description="我订阅的 RSS">
      <main className="container margin-vert--lg">
        <h1>📡 我订阅的 RSS</h1>
        <p>
          完整列表在 <a href="https://github.com/NoSugarCoffee/rss-feeds">rss-feeds</a>，可以直接把{' '}
          <a href={opmlUrl}>feeds.opml</a> 导入你的 RSS 阅读器。
        </p>
        {groups.map((group) => (
          <FeedGroup key={group.name} group={group} />
        ))}
      </main>
    </Layout>
  );
}
