import RemoteLoader, { createWithRemoteLoader } from '@kne/remote-loader';
import { Routes, Route, Navigate } from 'react-router-dom';
import pages from './pages';
import './index.scss';

const { About, Account, Admin, InitAdmin, Home, Error, NotFound } = pages;

const App = createWithRemoteLoader({
  modules: ['components-core:Global', 'components-admin:Authenticate@BeforeLoginLayout', 'components-admin:Authenticate@AfterUserLoginLayout', 'components-admin:Authenticate@AfterAdminUserLoginLayout']
})(({ remoteModules, globalPreset }) => {
  const [Global, BeforeLoginLayout, AfterUserLoginLayout, AfterAdminUserLoginLayout] = remoteModules;
  const baseUrl = '';
  return (
    <Global preset={globalPreset} themeToken={globalPreset.themeToken}>
      <Routes>
        <Route
          element={
            <AfterUserLoginLayout
              baseUrl={baseUrl}
              navigation={{
                list: [
                  {
                    key: 'components',
                    title: '组件',
                    path: '/components'
                  },
                  {
                    key: 'apis',
                    title: '接口文档',
                    path: '/apis'
                  },
                  {
                    key: 'blog',
                    title: '博客',
                    path: '/blog'
                  },
                  {
                    key: 'about',
                    title: '关于我们',
                    path: '/about'
                  }
                ]
              }}
            />
          }
        >
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="admin/initAdmin" element={<AfterUserLoginLayout />}>
          <Route index element={<InitAdmin baseUrl={`${baseUrl}/admin`} />} />
        </Route>
        <Route
          path="admin"
          element={
            <AfterAdminUserLoginLayout
              navigation={{
                base: `${baseUrl}/admin`,
                list: [
                  {
                    key: 'components',
                    title: '组件管理',
                    path: '/admin/components'
                  },
                  {
                    key: 'apis',
                    title: '接口文档管理',
                    path: '/admin/apis'
                  },
                  {
                    key: 'blog',
                    title: '博客管理',
                    path: '/admin/blog'
                  },
                  {
                    key: 'user',
                    title: '用户管理',
                    path: '/admin/user'
                  },
                  {
                    key: 'file',
                    title: '文件管理',
                    path: '/admin/file'
                  },
                  {
                    key: 'setting',
                    title: '设置',
                    path: '/admin/setting'
                  }
                ]
              }}
            />
          }
        >
          <Route index element={<Navigate to={`${baseUrl}/admin/user`} replace />} />
          <Route path="file" element={<RemoteLoader module="components-file-manager:FileListPage" />} />
          <Route path="*" element={<Admin baseUrl={`${baseUrl}/admin`} />} />
        </Route>
        <Route element={<BeforeLoginLayout />}>
          <Route path="error" element={<Error />} />
          <Route path="404" element={<NotFound />} />
          <Route path="account/*" element={<Account baseUrl={baseUrl + '/account'} />} />
        </Route>
      </Routes>
    </Global>
  );
});

export default App;
