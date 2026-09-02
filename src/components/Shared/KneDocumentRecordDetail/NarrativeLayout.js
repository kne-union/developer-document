import styles from './style.module.scss';

export const RecordDetailLayout = ({ main, aside }) => {
  if (!main && !aside) {
    return null;
  }
  return (
    <div className={aside ? styles.shell : styles['shell-single']}>
      <div className={styles.main}>{main}</div>
      {aside ? <aside className={styles.aside}>{aside}</aside> : null}
    </div>
  );
};

export const StoryPanel = ({ children }) => {
  return <div className={styles.story}>{children}</div>;
};

export const StoryChapter = ({ step, title, subtitle, children }) => {
  if (!children) {
    return null;
  }
  return (
    <section className={styles.chapter}>
      <div className={styles['chapter-head']}>
        <span className={styles['chapter-step']}>{String(step).padStart(2, '0')}</span>
        <h3 className={styles['chapter-title']}>{title}</h3>
        {subtitle ? <span className={styles['chapter-subtitle']}>{subtitle}</span> : null}
      </div>
      <div className={styles['chapter-body']}>{children}</div>
    </section>
  );
};

export const SubSection = ({ label, children }) => {
  if (!children) {
    return null;
  }
  return (
    <div className={styles['sub-section']}>
      {label ? <div className={styles['sub-label']}>{label}</div> : null}
      {children}
    </div>
  );
};

export const AsidePanel = ({ title, children }) => {
  if (!children) {
    return null;
  }
  return (
    <div className={styles['aside-panel']}>
      {title ? <h4 className={styles['aside-title']}>{title}</h4> : null}
      {children}
    </div>
  );
};

export const ArticleBlock = ({ children }) => {
  if (!children) {
    return null;
  }
  return <div className={styles.prose}>{children}</div>;
};

export const KeypointList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <div className={styles.keypoints}>
      {items.map((item, index) => (
        <div key={index} className={styles.keypoint}>
          <span className={styles['keypoint-index']}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles['keypoint-text']}>{item}</span>
        </div>
      ))}
    </div>
  );
};

export const CautionList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <div className={styles.cautions}>
      {items.map((item, index) => (
        <div key={index} className={styles.caution}>
          <span className={styles['caution-mark']}>!</span>
          <span className={styles['caution-text']}>{item}</span>
        </div>
      ))}
    </div>
  );
};

export const AsideMetaList = ({ items }) => {
  const rows = items.filter(item => item.value != null && item.value !== '');
  if (!rows.length) {
    return null;
  }
  return (
    <dl className={styles['aside-meta']}>
      {rows.map(item => (
        <div key={item.label} className={styles['aside-meta-row']}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const RecordList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <ul className={styles.records}>
      {items.map((item, index) => (
        <li key={index} className={styles['record-item']}>
          <div className={styles['record-title']}>{item.title}</div>
          {item.meta ? <div className={styles['record-meta']}>{item.meta}</div> : null}
        </li>
      ))}
    </ul>
  );
};
