import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { AsidePanel } from './NarrativeLayout';
import { formatDateTime } from './renderHelpers';
import styles from './style.module.scss';

export const normalizeWorklogRelativePath = path => {
  if (!path) {
    return null;
  }
  const normalized = String(path).replace(/\\/g, '/').trim();
  if (!normalized) {
    return null;
  }
  return normalized.startsWith('worklog/') ? normalized : `worklog/${normalized.replace(/^\//, '')}`;
};

const SourceWorklogList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules, items, worklogBaseUrl, formatMessage }) => {
  const [usePreset] = remoteModules;
  const { ajax, apis } = usePreset();
  const [resolvedMap, setResolvedMap] = useState({});
  const [loading, setLoading] = useState(false);

  const entries = useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((item, index) => ({
        ...item,
        key: item.path || `${index}`,
        relativePath: normalizeWorklogRelativePath(item.path)
      })),
    [items]
  );

  const relativePaths = useMemo(() => [...new Set(entries.map(item => item.relativePath).filter(Boolean))], [entries]);

  const relativePathsKey = relativePaths.join('\u0000');

  useEffect(() => {
    if (!relativePaths.length) {
      setResolvedMap({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    ajax(
      Object.assign({}, apis.worklog.resolve, {
        data: { relativePaths }
      })
    )
      .then(({ data: res }) => {
        if (cancelled || res?.code !== 0) {
          return;
        }
        setResolvedMap(Object.fromEntries((res.data?.items || []).map(entry => [entry.relativePath, entry])));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ajax, apis.worklog.resolve, relativePathsKey]);

  if (!entries.length) {
    return null;
  }

  return (
    <AsidePanel title={formatMessage({ id: 'kneDocumentRecordDetail.sourceWorklogs' })}>
      {loading ? <Spin className={styles['record-loading']} size="small" /> : null}
      <ul className={styles.records}>
        {entries.map(item => {
          const resolved = item.relativePath ? resolvedMap[item.relativePath] : null;
          const title = item.title || resolved?.title || item.relativePath || '-';
          const meta = [item.relativePath, formatDateTime(item.addedAt)].filter(Boolean).join(' · ');
          const detailUrl = resolved?.id && worklogBaseUrl ? `${worklogBaseUrl}/detail?id=${encodeURIComponent(resolved.id)}` : null;

          return (
            <li key={item.key} className={styles['record-item']}>
              {detailUrl ? (
                <Link className={styles['record-link']} to={detailUrl}>
                  <div className={styles['record-title']}>{title}</div>
                </Link>
              ) : (
                <div className={styles['record-title']}>{title}</div>
              )}
              {meta ? <div className={styles['record-meta']}>{meta}</div> : null}
            </li>
          );
        })}
      </ul>
    </AsidePanel>
  );
});

export default SourceWorklogList;
