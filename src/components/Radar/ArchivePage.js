import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function ArchivePage({data}) {
  return (
    <Layout title="往期 · AI 开源雷达" description="AI 开源雷达的全部往期">
      <main className="container margin-vert--lg">
        <h1>AI 开源雷达 · 往期</h1>
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
      </main>
    </Layout>
  );
}
