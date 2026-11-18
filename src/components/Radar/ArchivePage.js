import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import RadarNav from './RadarNav';
import styles from './styles.module.css';

export default function ArchivePage({data}) {
  return (
    <Layout title="往期 · AI 开源雷达" description="AI 开源雷达的全部往期">
      <main className="container margin-vert--lg">
        <RadarNav />
        <h1>AI 开源雷达 · 往期</h1>
        <h2>开源雷达往期</h2>
        <ul className={styles.archive}>
          {data.issues.map((issue) => (
            <li key={issue.id}>
              <Link to={`/radar/${issue.id}`}>{issue.title}</Link>
              <span className={styles.archiveDate}>
                {new Date(issue.generatedAt).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'})}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="margin-top--lg">RSS 周报往期</h2>
        {data.rssWeeks.length === 0 ? (
          <p>RSS 周报尚未发布。</p>
        ) : (
          <ul className={styles.archive}>
            {data.rssWeeks.map((week) => (
              <li key={week.id}>
                <Link to={`/radar/rss/${week.id}`}>{week.title}</Link>
                <span className={styles.archiveDate}>
                  {new Date(week.generatedAt).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'})}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Layout>
  );
}
