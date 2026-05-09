import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { ShareButton, RemoteComponentDetailView } from '@components/Shared';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [Page, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const current = searchParams.get('current');

  return (
    <Page name="admin-remote-component-detail">
      <Fetch
        {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
        render={({ data }) => {
          if (!data) {
            return (
              <div>
                <Empty description="无法读取到远程组件信息" />
              </div>
            );
          }

          return <RemoteComponentDetailView data={data} current={current} headerExtra={<ShareButton type="remote-component" id={data.id} disabled={!data.isPublic} disabledReason="私有组件无法分享" />} />;
        }}
      />
    </Page>
  );
});

export default TabDetail;
