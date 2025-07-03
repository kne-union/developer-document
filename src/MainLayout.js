import { createWithRemoteLoader } from '@kne/remote-loader';
import { Outlet } from 'react-router-dom';

const Global = createWithRemoteLoader({
  modules: ['components-core:Global']
})(({ remoteModules, paths, preset, children, ...props }) => {
  const [Global] = remoteModules;

  return (
    <Global {...props} preset={preset}>
      {children}
    </Global>
  );
});

const GlobalLayout = createWithRemoteLoader({
  modules: ['components-core:Layout', 'components-core:Global']
})(({ remoteModules, navigation, title, preset, children, ...props }) => {
  const [Layout, Global] = remoteModules;
  return (
    <Global {...props} preset={preset}>
      <Layout
        navigation={{
          defaultTitle: title,
          ...navigation
        }}
      >
        {children}
      </Layout>
    </Global>
  );
});

const MainLayout = props => {
  return (
    <GlobalLayout {...props}>
      <Outlet />
    </GlobalLayout>
  );
};

export default MainLayout;

export const AfterUserLoginLayout = createWithRemoteLoader({
  modules: ['components-account:Authenticate@UserInfo']
})(({ remoteModules, ...props }) => {
  const [UserInfo] = remoteModules;
  return (
    <GlobalLayout {...props}>
      <UserInfo>
        <Outlet />
      </UserInfo>
    </GlobalLayout>
  );
});

export const AfterTenantUserLoginLayout = createWithRemoteLoader({
  modules: ['components-account:Authenticate@TenantUserInfo', 'Global@GetGlobal']
})(({ remoteModules, ...props }) => {
  const [TenantUserInfo, GetGlobal] = remoteModules;
  return (
    <GlobalLayout {...props}>
      <TenantUserInfo>
        <GetGlobal>
          {value => {
            return <Outlet />;
          }}
        </GetGlobal>
      </TenantUserInfo>
    </GlobalLayout>
  );
});

export const AfterAdminUserLoginLayout = createWithRemoteLoader({
  modules: ['components-account:Authenticate@SuperAdminInfo']
})(({ remoteModules, ...props }) => {
  const [SuperAdminInfo] = remoteModules;
  return (
    <GlobalLayout {...props}>
      <SuperAdminInfo>
        <Outlet />
      </SuperAdminInfo>
    </GlobalLayout>
  );
});

export const BeforeLoginLayout = props => {
  return (
    <Global {...props}>
      <Outlet />
    </Global>
  );
};
