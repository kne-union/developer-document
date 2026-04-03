import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, Navigate } from 'react-router-dom';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';

const ExamplePage = createEntry.ExamplePage;

const ComponentPage = createWithRemoteLoader({
  modules: ['components-core:Layout@Page']
})(({ remoteModules, name, remote, tpl, url, defaultVersion, current }) => {
  const [Page] = remoteModules;
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    loading,
    error,
    remoteModules: targetModules
  } = useLoader({
    modules: ['components'],
    options: {
      url,
      tpl,
      remote,
      version: defaultVersion
    }
  });

  if (loading) {
    return null;
  }

  if (error) {
    return <Navigate to={`/error?msg=加载远程组件库失败，请稍后重试`} replace />;
  }

  const [components] = targetModules;
  let currentName = current;
  if (!(currentName && components[currentName])) {
    currentName = Object.keys(components)[0];
  }

  return (
    <ExamplePage
      name={name}
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
      items={Object.keys(components).map(name => ({
        label: name,
        key: name
      }))}
    />
  );
});

const Detail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [Page, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const current = searchParams.get('current');

  return (
    <Fetch
      {...Object.assign({}, apis.remoteComponent.detail, { params: { id } })}
      render={({ data }) => {
        if (!data) {
          return null;
        }

        // 检查是否公开
        if (!data.isPublic) {
          return <Navigate to="/error?msg=该组件未公开，请登录后查看" replace />;
        }

        return <ComponentPage {...data} name="components-detail" current={current} />;
      }}
    />
  );
});

export default Detail;
