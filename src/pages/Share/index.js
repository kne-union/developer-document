import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { Typography, Empty } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useMemo, useEffect } from 'react';
import { useGlobalContext } from '@kne/global-context';
import { BlogDetailView, DocumentDetailView, RemoteComponentDetailView, NpmPackageDetailView } from '@components/Shared';
import withLocale from '../../withLocale';
import { useIntl } from '@kne/react-intl';
import styles from './style.module.scss';

const { Title, Paragraph } = Typography;

const TYPE_CONFIG = {
  blog: { api: 'blog' },
  document: { api: 'document' },
  'remote-component': { api: 'remoteComponent' },
  'npm-package': { api: 'npmPackage' }
};

const DETAIL_VIEWS = {
  blog: BlogDetailView,
  document: DocumentDetailView,
  'remote-component': RemoteComponentDetailView,
  'npm-package': NpmPackageDetailView
};

const Share = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const current = searchParams.get('current');

    const typeConfig = TYPE_CONFIG[type];
    const DetailView = DETAIL_VIEWS[type];

    const apiConfig = useMemo(() => {
      if (!typeConfig) return null;
      return apis[typeConfig.api]?.detail || null;
    }, [typeConfig, apis]);

    if (!type || !id || !apiConfig || !DetailView) {
      return (
        <div className={styles.container}>
          <div className={styles.noticePanel}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'share.paramError' })} />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <Fetch
          {...Object.assign({}, apiConfig, { params: { id } })}
          render={({ data }) => {
            if (!data) {
              return (
                <div className={styles.noticePanel}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'share.notExist' })} />
                </div>
              );
            }

            if ((type === 'blog' || type === 'document') && data.status !== 'published') {
              return (
                <div className={styles.noticePanel}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'share.notPublished' })} />
                </div>
              );
            }

            if (!data.isPublic) {
              return (
                <div className={styles.noticePanel}>
                  <LockOutlined className={styles.noticeIcon} />
                  <Title level={4} className={styles.noticeTitle}>
                    {formatMessage({ id: 'share.privateContent' })}
                  </Title>
                  <Paragraph className={styles.noticeDesc}>{formatMessage({ id: 'share.loginToView' })}</Paragraph>
                </div>
              );
            }

            return (
              <div className={styles.shareContent}>
                <DetailView data={data} current={current} simple />
              </div>
            );
          }}
        />
      </div>
    );
  })
);

export default Share;
