import { Empty } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Actions from '../Actions';
import LifecycleBar from '../LifecycleBar';
import VersionPanel from '../VersionPanel';
import EnvEditor from '../EnvEditor';
import LogViewer from '../LogViewer';
import DataOps from '../DataOps';
import Overview from './Overview';
import DeployingStatusPoller from './DeployingStatusPoller';
import DetailPageHeaderTitle from '@components/Shared/DetailPageHeaderTitle';
import style from './style.module.scss';

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@StateBarPage', 'components-core:Layout@PageHeader']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [usePreset, StateBarPage, PageHeader] = remoteModules;
    const { apis } = usePreset();
    const [searchParams, setSearchParams] = useSearchParams();
    const { formatMessage } = useIntl();
    const name = searchParams.get('name');

    if (!name) {
      return <Empty description={formatMessage({ id: 'appManager.detail.missingName' })} />;
    }

    return (
      <Fetch
        {...Object.assign({}, apis.appManager.detail, {
          params: { name }
        })}
        render={({ data, reload }) => {
          const activeKey = searchParams.get('tab') || 'overview';

          let content = <Empty description={formatMessage({ id: 'appManager.detail.notFound' })} />;
          if (data) {
            if (activeKey === 'versions') {
              content = <VersionPanel data={data} onSuccess={reload} />;
            } else if (activeKey === 'env') {
              content = <EnvEditor data={data} onSuccess={reload} />;
            } else if (activeKey === 'data') {
              content = <DataOps data={data} onSuccess={reload} />;
            } else if (activeKey === 'logs') {
              content = <LogViewer data={data} />;
            } else {
              content = <Overview data={data} />;
            }
          }

          return (
            <div className={style['detail-page']}>
              <DeployingStatusPoller status={data?.status} reload={reload} />
              <StateBarPage
                {...props}
                name="admin-app-manager-detail"
                headerFixed={false}
                header={
                  data ? (
                    <div className={style['detail-header']}>
                      <PageHeader
                        title={<DetailPageHeaderTitle baseUrl={baseUrl} title={data.label || data.name || formatMessage({ id: 'common.loading' })} />}
                        info={data.name}
                        tags={undefined}
                        buttonOptions={<Actions data={data} onSuccess={reload} includeLifecycle={false} />}
                      />
                      <LifecycleBar data={data} onSuccess={reload} />
                    </div>
                  ) : (
                    <PageHeader title={<DetailPageHeaderTitle baseUrl={baseUrl} title={formatMessage({ id: 'common.loading' })} />} />
                  )
                }
                stateBar={{
                  activeKey,
                  onChange: key => {
                    const next = new URLSearchParams(searchParams);
                    next.set('tab', key);
                    setSearchParams(next, { replace: true });
                  },
                  stateOption: [
                    { tab: formatMessage({ id: 'appManager.tabs.overview' }), key: 'overview' },
                    { tab: formatMessage({ id: 'appManager.tabs.versions' }), key: 'versions' },
                    { tab: formatMessage({ id: 'appManager.tabs.env' }), key: 'env' },
                    { tab: formatMessage({ id: 'appManager.tabs.data' }), key: 'data' },
                    { tab: formatMessage({ id: 'appManager.tabs.logs' }), key: 'logs' }
                  ]
                }}
              >
                {content}
              </StateBarPage>
            </div>
          );
        }}
      />
    );
  })
);

export default Detail;
