import React from 'react';
import styles from './styles.module.css';

function formatChinaDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function WechatArticleCard({article}) {
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

export function ArticleGrid({articles}) {
  return (
    <div className={styles.articleGrid}>
      {articles.map((article) => (
        <WechatArticleCard key={article.url} article={article} />
      ))}
    </div>
  );
}
