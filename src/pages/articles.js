import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {ArticleGrid} from '@site/src/components/WechatArticleCard';
import wechatArticles from '@site/src/data/wechat-articles.json';

export default function Articles() {
  return (
    <Layout title="文章" description="我在公众号「代码之序」发表的文章">
      <main className="container margin-vert--lg">
        <h1>✍️ 文章</h1>
        <p>
          全部发表在公众号「代码之序」，点开即可在微信中阅读。想第一时间收到新文章，<Link to="/">去首页扫码关注</Link>。
        </p>
        <ArticleGrid articles={wechatArticles} />
      </main>
    </Layout>
  );
}
