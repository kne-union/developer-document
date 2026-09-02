import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { Empty } from 'antd';
import { ShareButton, NpmPackageDetailView } from '@components/Shared';
import DetailPageHeaderTitle from '@components/Shared/DetailPageHeaderTitle';
import styles from '@components/Shared/detailPage.module.scss';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Layout@PageHeader']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [usePreset, Page, PageHeader] = remoteModules;
    const { apis } = usePreset();
    const [searchParams] = useSearchParams();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.npmPackage.detail, {
          params: { id: searchParams.get('id') }
        })}
        render={({ data }) => (
          <Page
            {...props}
            name="admin-npm-package-detail"
            headerFixed={false}
            header={<PageHeader title={<DetailPageHeaderTitle baseUrl={baseUrl} title={data?.packageName || data?.name || formatMessage({ id: 'common.loading' })} />} info={data ? `ID: ${data.id}` : undefined} />}
          >
            {!data ? (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminNpmPackage.detail.notFound' })} />
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
