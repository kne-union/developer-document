import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { ShareButton, RemoteComponentDetailView } from '@components/Shared';
import DetailPageHeaderTitle from '@components/Shared/DetailPageHeaderTitle';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [Page, PageHeader, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const current = searchParams.get('current');
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
        render={({ data }) => (
          <Page
            {...props}
            name="admin-remote-component-detail"
            headerFixed={false}
            header={<PageHeader title={<DetailPageHeaderTitle baseUrl={baseUrl} title={data?.remote || data?.name || formatMessage({ id: 'common.loading' })} />} info={data ? `ID: ${data.id}` : undefined} />}
          >
            {!data ? (
              <Empty description={formatMessage({ id: 'adminRemoteComponent.tabDetail.notFound' })} />
            ) : (
              <RemoteComponentDetailView data={data} current={current} headerExtra={<ShareButton type="remote-component" id={data.id} disabled={!data.isPublic} disabledReason={formatMessage({ id: 'common.privateCannotShare' })} />} />
            )}
          </Page>
        )}
      />
    );
  })
);

export default TabDetail;
