import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function RadarNav() {
  return (
    <nav className={styles.sectionNav} aria-label="AI 雷达栏目">
      <Link to="/radar">开源雷达</Link>
      <Link to="/radar/rss">RSS 周报</Link>
      <Link to="/radar/archive">往期</Link>
    </nav>
  );
}
