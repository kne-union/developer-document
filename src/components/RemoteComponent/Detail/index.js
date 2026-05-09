import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Typography } from 'antd';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, RemoteComponentDetailView } from '@components/Shared';
import styles from '@components/Shared/detailPage.module.scss';

const { Title, Paragraph } = Typography;

const Detail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [Page, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');
  const current = searchParams.get('current');

  return (
    <Page name="remote-component-detail">
      <Fetch
        {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
        render={({ data }) => {
          if (!data) {
            return (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到对应远程组件" />
                </div>
              </div>
            );
          }

          const isLoggedIn = hasUserToken();

          if (!data.isPublic && !isLoggedIn) {
            return (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Title level={4}>该远程组件未公开</Title>
                  <Paragraph>登录后可查看完整信息与示例。</Paragraph>
                  <Button type="primary" onClick={() => navigate('/account/login')}>
                    去登录
                  </Button>
                </div>
              </div>
            );
          }

          return <RemoteComponentDetailView data={data} current={current} headerExtra={<ShareButton type="remote-component" id={data.id} disabled={!data.isPublic} disabledReason="私有组件无法分享" />} />;
        }}
      />
    </Page>
  );
});

export default Detail;
