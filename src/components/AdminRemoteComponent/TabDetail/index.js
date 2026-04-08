import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import { useSearchParams, Navigate } from 'react-router-dom';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';

const ExamplePage = createEntry.ExamplePage;

const ComponentPage = createWithRemoteLoader({
  modules: ['components-core:Layout@Page']
})(({ remoteModules, remote, tpl, url, defaultVersion, current, examples }) => {
  const [Page] = remoteModules;
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    error,
    remoteModules: targetModules
  } = useLoader({
    modules: ['components'],
    options: url
      ? {
          url,
          tpl,
          remote,
          version: defaultVersion
        }
      : {
          url: window.location.origin,
          tpl: '{{url}}/@kne-components/{{remote}}/{{version}}/build',
          remote,
          version: examples[0]
        }
  });
  if (loading) {
    return null;
  }

  if (error) {
    return <Navigate to={`/error?msg=加载远程组件库可能不符合规范，您可以向开发者报告该问题`} replace />;
  }

  const [components] = targetModules;
  let currentName = current;
  if (!(currentName && components[currentName])) {
    currentName = Object.keys(components)[0];
  }
  return (
    <ExamplePage
      data={components[currentName]}
      current={currentName}
      menuProps={{
        onChange: name => {
          setSearchParams(searchParams => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('current', name);
            return newSearchParams;
          });
        }
      }}
      items={Object.keys(components).map(name => {
        return {
          label: name,
          key: name
        };
      })}
    />
  );
});

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(({ remoteModules, baseUrl }) => {
  const [Page, PageHeader, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id'),
    current = searchParams.get('current');
  return (
    <Fetch
      {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
      render={({ data, reload }) => {
        if (!(data.url || (data.packageName && data.examples && data.examples.length > 0))) {
          return (
            <Page>
              <Empty description="无法读取到远程组件信息" />
            </Page>
          );
        }
        return <ComponentPage {...data} current={current} />;
      }}
    />
  );
});

export default TabDetail;
