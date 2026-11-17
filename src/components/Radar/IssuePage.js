import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {issueTitle} from '@site/plugins/ai-radar/issues';
import styles from './styles.module.css';

function chinaDate(iso, options) {
  return new Date(iso).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai', ...options});
}

function compact(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

// Star deltas are null when the repo was not on that trending page; showing
// nothing beats showing a misleading +0.
function StarLine({item}) {
  const growth =
    item.starsThisWeek != null
      ? `+${compact(item.starsThisWeek)}/周`
      : item.starsThisMonth != null
        ? `+${compact(item.starsThisMonth)}/月`
        : null;
  return (
    <span className={styles.stars}>
      ★{compact(item.stars)}
      {growth && ` · ${growth}`}
    </span>
  );
}

function RepoLink({item, children}) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function ProjectCard({item}) {
  return (
    <article className={styles.card} data-radar-card>
      <header className={styles.cardHeader}>
        <RepoLink item={item}>
          <strong>{item.name}</strong>
        </RepoLink>
        {item.language && <span className={styles.language}>{item.language}</span>}
      </header>
      <p className={styles.comment}>{item.comment}</p>
      <footer className={styles.cardFooter}>
        <StarLine item={item} />
        <span>创建于 {chinaDate(item.createdAt, {month: '2-digit', day: '2-digit'})}</span>
      </footer>
    </article>
  );
}

function EntryRow({item}) {
  const owner = item.id.split('/')[0];
  return (
    <li className={styles.entry}>
      <RepoLink item={item}>
        <strong>{item.name}</strong>
      </RepoLink>
      <span className={styles.owner}>（{owner}）</span>— {item.comment} <StarLine item={item} />
    </li>
  );
}

export default function IssuePage({data}) {
  const {issue, prevId, nextId} = data;
  const title = issueTitle(issue);
  const isEmpty = issue.newProjects.length === 0 && issue.newEntries.length === 0;
  return (
    <Layout title={title} description={issue.summary}>
      <main className="container margin-vert--lg">
        <h1>{title}</h1>
        <p className={styles.meta}>
          {chinaDate(issue.generatedAt, {year: 'numeric', month: '2-digit', day: '2-digit'})} ·{' '}
          {issue.newProjects.length} 个新项目 · {issue.newEntries.length} 个新上榜
        </p>
        <p className={styles.summary}>{issue.summary}</p>

        {isEmpty && <p>本周没有新冒头的项目。</p>}

        {issue.newProjects.length > 0 && (
          <section>
            <h2>🆕 新项目</h2>
            <div className={styles.grid}>
              {issue.newProjects.map((item) => (
                <ProjectCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {issue.newEntries.length > 0 && (
          <section className="margin-top--lg">
            <h2>↗ 新上榜</h2>
            <ul className={styles.entries}>
              {issue.newEntries.map((item) => (
                <EntryRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )}

        <nav className={styles.pager}>
          {prevId ? <Link to={`/radar/${prevId}`}>← 上一期</Link> : <span />}
          <Link to="/radar/archive">往期 →</Link>
        </nav>
        {nextId && (
          <p className={styles.newer}>
            <Link to={`/radar/${nextId}`}>下一期 →</Link>
          </p>
        )}
      </main>
    </Layout>
  );
}
