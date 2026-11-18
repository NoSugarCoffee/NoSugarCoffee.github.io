import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {formatChinaDate} from '@site/plugins/ai-radar/issues';
import {rssWeekTitle} from '@site/plugins/ai-radar/rss-weekly';
import RadarNav from './RadarNav';
import styles from './styles.module.css';

function ArticleItem({item}) {
  return (
    <li className={styles.rssItem} data-rss-item>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.rssTitle}>
        {item.title}
      </a>
      <p className={styles.rssMeta}>
        {item.source} ·{' '}
        {formatChinaDate(item.published_at, {year: 'numeric', month: '2-digit', day: '2-digit'})}
      </p>
      <p className={styles.rssSummary}>{item.summary_zh}</p>
    </li>
  );
}

export default function RssWeeklyPage({data}) {
  const {week, prevId, nextId} = data;
  if (!week) {
    return (
      <Layout title="RSS 周报" description="RSS 订阅的每周中文摘要">
        <main className="container margin-vert--lg">
          <RadarNav />
          <h1>RSS 周报</h1>
          <p className={styles.emptyState}>RSS 周报尚未发布，生成第一期后会自动出现在这里。</p>
        </main>
      </Layout>
    );
  }

  const title = rssWeekTitle(week);
  const itemCount = week.groups.reduce((count, group) => count + group.items.length, 0);
  const nonEmptyGroups = week.groups.filter((group) => group.items.length > 0);
  const failedSources = week.failed_feeds.map((feed) => feed.source).join('、');

  return (
    <Layout title={title} description={`${week.week_start} 至 ${week.week_end} 的 RSS 阅读摘要`}>
      <main className="container margin-vert--lg">
        <RadarNav />
        <h1>{title}</h1>
        <p className={styles.meta}>
          {week.week_start} 至 {week.week_end} · {itemCount} 篇文章 · 生成于{' '}
          {formatChinaDate(week.generated_at, {year: 'numeric', month: '2-digit', day: '2-digit'})}
        </p>

        {itemCount === 0 && <p className={styles.emptyState}>本周没有收录到新文章。</p>}

        {nonEmptyGroups.map((group) => (
          <section className={styles.rssGroup} key={group.category}>
            <h2>{group.category}</h2>
            <ul className={styles.rssList}>
              {group.items.map((item) => (
                <ArticleItem key={`${item.url}-${item.published_at}`} item={item} />
              ))}
            </ul>
          </section>
        ))}

        {week.failed_feeds.length > 0 && (
          <p className={styles.failedFeeds}>
            {week.failed_feeds.length} 个订阅源抓取失败：{failedSources}
          </p>
        )}

        <nav className={styles.pager} aria-label="RSS 周报翻页">
          {prevId ? <Link to={`/radar/rss/${prevId}`}>← 上一期</Link> : <span />}
          {nextId ? <Link to={`/radar/rss/${nextId}`}>下一期 →</Link> : <span />}
        </nav>
      </main>
    </Layout>
  );
}
