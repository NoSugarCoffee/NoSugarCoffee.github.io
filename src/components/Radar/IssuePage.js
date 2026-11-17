import React from 'react';
import Layout from '@theme/Layout';

export default function IssuePage({data}) {
  return (
    <Layout>
      <main className="container margin-vert--lg">
        <h1>{data.issue.headline}</h1>
      </main>
    </Layout>
  );
}
