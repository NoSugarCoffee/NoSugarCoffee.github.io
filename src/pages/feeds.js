import React from 'react';
import Layout from '@theme/Layout';
import {usePluginData} from '@docusaurus/useGlobalData';
import wechatArticles from '@site/src/data/wechat-articles.json';
import styles from './feeds.module.css';

function formatChinaDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function WechatArticleCard({article}) {
  return (
    <a className={styles.articleCard} href={article.url} target="_blank" rel="noopener noreferrer">
      {/* WeChat's image CDN refuses requests that carry a foreign Referer. */}
      <img className={styles.articleCover} src={article.cover} alt="" referrerPolicy="no-referrer" loading="lazy" />
      <div className={styles.articleBody}>
        <h3 className={styles.articleTitle}>{article.title}</h3>
        {article.description && <p className={styles.articleDescription}>{article.description}</p>}
        <time className={styles.articleDate} dateTime={article.publishedAt}>
          {formatChinaDate(article.publishedAt)}
        </time>
      </div>
    </a>
  );
}

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
    <Layout title="文章与订阅" description="我在微信公众号写的文章，以及我订阅的 RSS">
      <main className="container margin-vert--lg">
        <section className="margin-bottom--xl">
          <h1>✍️ 我的公众号文章</h1>
          <div className={styles.articleGrid}>
            {wechatArticles.map((article) => (
              <WechatArticleCard key={article.url} article={article} />
            ))}
          </div>
        </section>

        <section>
          <h1>📡 我订阅的 RSS</h1>
          <p>
            完整列表在 <a href="https://github.com/NoSugarCoffee/rss-feeds">rss-feeds</a>，可以直接把{' '}
            <a href={opmlUrl}>feeds.opml</a> 导入你的 RSS 阅读器。
          </p>
          {groups.map((group) => (
            <FeedGroup key={group.name} group={group} />
          ))}
        </section>
      </main>
    </Layout>
  );
}
