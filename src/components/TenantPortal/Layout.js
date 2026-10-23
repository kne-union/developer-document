import { createWithRemoteLoader } from '@kne/remote-loader';
import { AppstoreOutlined, UserSwitchOutlined, LogoutOutlined } from '@ant-design/icons';
import SystemLayout from '@kne/system-layout';
import { Outlet } from 'react-router-dom';
import { useIntl } from '@kne/react-intl';
import withLocale from '@root/withLocale';
import '@kne/system-layout/dist/index.css';

const Layout = createWithRemoteLoader({
  modules: ['components-admin:Tenant@Authenticate', 'components-admin:Account@useLogout']
})(({ remoteModules, baseUrl, children }) => {
  const [Authenticate, useLogout] = remoteModules;
  const logout = useLogout();
  const { formatMessage } = useIntl();
  return (
    <Authenticate>
      {({ global }) => {
        const { tenantUserInfo, tenant } = global;
        return (
          <SystemLayout
            logo={{ id: tenant?.logo }}
            userInfo={tenantUserInfo}
            menu={{
              base: baseUrl,
              items: [
                {
                  path: '/',
                  label: formatMessage({ id: 'app.nav.apps' }),
                  toolbar: true,
                  icon: <AppstoreOutlined />
                },
                {
                  group: 'account',
                  groupLabel: formatMessage({ id: 'tenantPortal.account' }),
                  label: formatMessage({ id: 'tenantPortal.switchTenant' }),
                  icon: <UserSwitchOutlined />,
                  onClick: () => {
                    window.location.href = '/login-tenant';
                  }
                },
                {
                  group: 'account',
                  groupLabel: formatMessage({ id: 'tenantPortal.account' }),
                  label: formatMessage({ id: 'tenantPortal.logout' }),
                  icon: <LogoutOutlined />,
                  onClick: logout
                }
              ]
            }}
          >
            {children || <Outlet />}
          </SystemLayout>
        );
      }}
    </Authenticate>
  );
});

export default withLocale(Layout);
