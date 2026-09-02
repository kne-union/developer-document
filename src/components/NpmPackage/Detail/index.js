import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Typography } from 'antd';
import { useMemo } from 'react';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, NpmPackageDetailView } from '@components/Shared';
import DetailPageHeaderTitle from '@components/Shared/DetailPageHeaderTitle';
import styles from '@components/Shared/detailPage.module.scss';

const { Title, Paragraph } = Typography;

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Layout@PageHeader']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [usePreset, Page, PageHeader] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const isLoggedIn = useMemo(() => hasUserToken(), []);
    const apiConfig = isLoggedIn ? apis.npmPackage.detail : apis.npmPackage.publicDetail || apis.npmPackage.detail;

    return (
      <Fetch
        {...Object.assign({}, apiConfig, {
          params: { id: searchParams.get('id') }
        })}
        render={({ data }) => (
          <Page
            {...props}
            name="npm-package-detail"
            headerFixed={false}
            header={<PageHeader title={<DetailPageHeaderTitle baseUrl={baseUrl} title={data?.packageName || data?.name || formatMessage({ id: 'common.loading' })} />} info={data ? `ID: ${data.id}` : undefined} />}
          >
            {!data ? (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'npmPackage.detail.notFound' })} />
                </div>
              </div>
            ) : !isLoggedIn && !data.isPublic ? (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Title level={4}>{formatMessage({ id: 'npmPackage.detail.notPublic' })}</Title>
                  <Paragraph>{formatMessage({ id: 'npmPackage.detail.loginToView' })}</Paragraph>
                  <Button type="primary" onClick={() => navigate('/account/login')}>
                    {formatMessage({ id: 'common.goLogin' })}
                  </Button>
                </div>
              </div>
            ) : (
              <NpmPackageDetailView data={data} headerExtra={<ShareButton type="npm-package" id={data.id} disabled={!data.isPublic} disabledReason={formatMessage({ id: 'common.privateCannotShare' })} />} />
            )}
          </Page>
        )}
      />
    );
  })
);

export default Detail;
