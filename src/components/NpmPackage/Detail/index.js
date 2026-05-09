import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Typography } from 'antd';
import { useMemo } from 'react';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, NpmPackageDetailView } from '@components/Shared';
import styles from '@components/Shared/detailPage.module.scss';

const { Title, Paragraph } = Typography;

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(({ remoteModules }) => {
  const [usePreset, Page] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLoggedIn = useMemo(() => hasUserToken(), []);
  const apiConfig = isLoggedIn ? apis.npmPackage.detail : apis.npmPackage.publicDetail || apis.npmPackage.detail;

  return (
    <Fetch
      {...Object.assign({}, apiConfig, {
        params: { id: searchParams.get('id') }
      })}
      render={({ data }) => {
        if (!data) {
          return (
            <Page name="npm-package-detail">
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到对应组件" />
                </div>
              </div>
            </Page>
          );
        }

        if (!isLoggedIn && !data.isPublic) {
          return (
            <Page name="npm-package-detail">
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Title level={4}>该组件未公开</Title>
                  <Paragraph>登录后可查看完整信息与示例。</Paragraph>
                  <Button type="primary" onClick={() => navigate('/account/login')}>
                    去登录
                  </Button>
                </div>
              </div>
            </Page>
          );
        }

        return (
          <Page name="npm-package-detail">
            <NpmPackageDetailView data={data} headerExtra={<ShareButton type="npm-package" id={data.id} disabled={!data.isPublic} disabledReason="私有组件无法分享" />} />
          </Page>
        );
      }}
    />
  );
});

export default Detail;
