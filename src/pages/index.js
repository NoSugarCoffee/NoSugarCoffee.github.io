import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ArticleGrid} from '@site/src/components/WechatArticleCard';
import wechatArticles from '@site/src/data/wechat-articles.json';
import styles from './index.module.css';

const HOMEPAGE_ARTICLE_COUNT = 6;
const ACCOUNT_SUMMARY = '关于 AI 编程和代码知识库的实践笔记：RAG、代码图、Agent 与开发环境。';

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>代码之序</h1>
          <p className={styles.heroSummary}>{ACCOUNT_SUMMARY}</p>
        </div>
        <figure className={styles.qr}>
          <img src={useBaseUrl('/img/wechat-qrcode.jpg')} alt="公众号 代码之序 二维码" width="160" height="160" />
          {/* A phone can't scan its own screen, so mobile visitors need the account name. */}
          <figcaption>
            扫码关注
            <br />
            或在微信搜索「代码之序」
          </figcaption>
        </figure>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout description={ACCOUNT_SUMMARY}>
      <Hero />
      <main className="container margin-vert--xl">
        <h2>最近的文章</h2>
        <ArticleGrid articles={wechatArticles.slice(0, HOMEPAGE_ARTICLE_COUNT)} />
        <p className={styles.allArticles}>
          <Link to="/articles">全部文章 →</Link>
        </p>
      </main>
    </Layout>
  );
}
