import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { Empty } from 'antd';
import { ShareButton, NpmPackageDetailView } from '@components/Shared';
import styles from '@components/Shared/detailPage.module.scss';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset, Page] = remoteModules;
    const { apis } = usePreset();
    const [searchParams] = useSearchParams();
    const { formatMessage } = useIntl();

    return (
      <Page name="admin-npm-package-detail">
        <Fetch
          {...Object.assign({}, apis.npmPackage.detail, {
            params: { id: searchParams.get('id') }
          })}
          render={({ data }) => {
            if (!data) {
              return (
                <div className={styles.page}>
                  <div className={styles.emptyCard}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminNpmPackage.detail.notFound' })} />
                  </div>
                </div>
              );
            }

            return <NpmPackageDetailView data={data} headerExtra={<ShareButton type="npm-package" id={data.id} disabled={!data.isPublic} disabledReason={formatMessage({ id: 'common.privateCannotShare' })} />} />;
          }}
        />
      </Page>
    );
  })
);

export default Detail;
