import KneDocumentJsonView from '@components/Shared/KneDocumentJsonView';
import ExperienceDetail from './ExperienceDetail';
import WorklogDetail from './WorklogDetail';
import styles from './style.module.scss';

export { buildKneDocumentPageHeaderMeta } from './buildPageHeaderMeta';

const KneDocumentRecordDetail = ({ recordType, data, formatMessage, worklogBaseUrl }) => {
  const shared = { data, formatMessage, worklogBaseUrl };
  return recordType === 'worklog' ? <WorklogDetail {...shared} /> : <ExperienceDetail {...shared} />;
};

export const KneDocumentRecordRawJson = ({ data }) => {
  const content = data?.content || {};

  return (
    <div className={styles['json-panel']}>
      <KneDocumentJsonView data={content} theme="light" searchable collapsable />
    </div>
  );
};

export default KneDocumentRecordDetail;
