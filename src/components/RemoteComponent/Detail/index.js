import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Typography } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, RemoteComponentDetailView } from '@components/Shared';
import DetailPageHeaderTitle from '@components/Shared/DetailPageHeaderTitle';
import styles from '@components/Shared/detailPage.module.scss';

const { Title, Paragraph } = Typography;

const Detail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [Page, PageHeader, usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = searchParams.get('id');
    const current = searchParams.get('current');

    return (
      <Fetch
        {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
        render={({ data }) => (
          <Page
            {...props}
            name="remote-component-detail"
            headerFixed={false}
            header={<PageHeader title={<DetailPageHeaderTitle baseUrl={baseUrl} title={data?.remote || data?.name || formatMessage({ id: 'common.loading' })} />} info={data ? `ID: ${data.id}` : undefined} />}
          >
            {!data ? (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'remoteComponent.detail.notFound' })} />
                </div>
              </div>
            ) : !data.isPublic && !hasUserToken() ? (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Title level={4}>{formatMessage({ id: 'remoteComponent.detail.notPublic' })}</Title>
                  <Paragraph>{formatMessage({ id: 'remoteComponent.detail.loginToView' })}</Paragraph>
                  <Button type="primary" onClick={() => navigate('/account/login')}>
                    {formatMessage({ id: 'common.goLogin' })}
                  </Button>
                </div>
              </div>
            ) : (
              <RemoteComponentDetailView data={data} current={current} headerExtra={<ShareButton type="remote-component" id={data.id} disabled={!data.isPublic} disabledReason={formatMessage({ id: 'common.privateCannotShare' })} />} />
            )}
          </Page>
        )}
      />
    );
  })
);

export default Detail;
