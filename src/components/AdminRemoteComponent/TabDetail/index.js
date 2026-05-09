import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { ShareButton, RemoteComponentDetailView } from '@components/Shared';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [Page, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const current = searchParams.get('current');
    const { formatMessage } = useIntl();

    return (
      <Page name="admin-remote-component-detail">
        <Fetch
          {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
          render={({ data }) => {
            if (!data) {
              return (
                <div>
                  <Empty description={formatMessage({ id: 'adminRemoteComponent.tabDetail.notFound' })} />
                </div>
              );
            }

            return <RemoteComponentDetailView data={data} current={current} headerExtra={<ShareButton type="remote-component" id={data.id} disabled={!data.isPublic} disabledReason={formatMessage({ id: 'common.privateCannotShare' })} />} />;
          }}
        />
      </Page>
    );
  })
);

export default TabDetail;
