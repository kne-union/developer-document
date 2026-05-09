import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { Typography, Empty } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { BlogDetailView, DocumentDetailView, RemoteComponentDetailView, NpmPackageDetailView } from '@components/Shared';
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
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { apis } = usePreset();
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="参数错误，请提供正确的 type 和 id" />
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
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="内容不存在或已被删除" />
              </div>
            );
          }

          if ((type === 'blog' || type === 'document') && data.status !== 'published') {
            return (
              <div className={styles.noticePanel}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该内容尚未发布，无法查看" />
              </div>
            );
          }

          if (!data.isPublic) {
            return (
              <div className={styles.noticePanel}>
                <LockOutlined className={styles.noticeIcon} />
                <Title level={4} className={styles.noticeTitle}>
                  该内容为私密内容
                </Title>
                <Paragraph className={styles.noticeDesc}>请登录后查看完整内容。</Paragraph>
              </div>
            );
          }

          return <DetailView data={data} current={current} simple />;
        }}
      />
    </div>
  );
});

export default Share;
