import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Layout@PageHeader', 'components-core:StateBar', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [Page, PageHeader, StateBar, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams, setSearchParams] = useSearchParams();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.worklog.detail, { params: { id: searchParams.get('id') } })}
        render={({ data }) => {
          const activeKey = searchParams.get('tab') || 'content';

          return (
            <Page {...props} headerFixed={false} header={<PageHeader title={data.title || data.relativePath} info={`ID: ${data.id}`} />}>
              <StateBar
                activeKey={activeKey}
                onChange={key => {
                  searchParams.set('tab', key);
                  setSearchParams(searchParams.toString());
                }}
                stateOption={[
                  { tab: formatMessage({ id: 'adminWorklog.tabDetail.content' }), key: 'content' },
                  { tab: formatMessage({ id: 'adminWorklog.tabDetail.meta' }), key: 'meta' }
                ]}
              />
              {activeKey === 'meta' ? (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(
                    {
                      relativePath: data.relativePath,
                      projectName: data.projectName,
                      title: data.title,
                      writtenAt: data.writtenAt ? dayjs(data.writtenAt).format('YYYY-MM-DD HH:mm:ss') : null,
                      createdUser: data.createdUser?.nickname || data.createdUser?.email || null,
                      createdUserId: data.createdUserId,
                      createdAt: data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') : null,
                      updatedAt: data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm:ss') : null
                    },
                    null,
                    2
                  )}
                </pre>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data.content, null, 2)}</pre>
              )}
            </Page>
          );
        }}
      />
    );
  })
);

export default TabDetail;
