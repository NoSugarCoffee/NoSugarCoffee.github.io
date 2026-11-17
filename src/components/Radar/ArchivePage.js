import React from 'react';
import Layout from '@theme/Layout';

export default function ArchivePage({data}) {
  return (
    <Layout>
      <main className="container margin-vert--lg">
        {data.issues.map((issue) => (
          <p key={issue.id}>{issue.title}</p>
        ))}
      </main>
    </Layout>
  );
}
