import RemoteLoader, { createWithRemoteLoader } from '@kne/remote-loader';
import AppChildrenRouter from '@kne/app-children-router';
import { Navigate, Outlet } from 'react-router-dom';
import './index.scss';
import '@kne/react-box/dist/index.css';

const Blog = createWithRemoteLoader({
  modules: []
})(({ remoteModules, baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
      list={[
        {
          index: true,
          loader: () => import('@components/Blog/List')
        },
        {
          path: 'detail',
          loader: () => import('@components/Blog/Detail')
        }
      ]}
    />
  );
});

const Document = createWithRemoteLoader({
  modules: []
})(({ remoteModules, baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
      list={[
        {
          index: true,
          loader: () => import('@components/Document/List')
        },
        {
          path: 'detail',
          loader: () => import('@components/Document/Detail')
        }
      ]}
    />
  );
});

const RemoteComponent = createWithRemoteLoader({
  modules: []
})(({ remoteModules, baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
      list={[
        {
          index: true,
          loader: () => import('@components/RemoteComponent/List')
        },
        {
          path: 'detail',
          loader: () => import('@components/RemoteComponent/Detail')
        }
      ]}
    />
  );
});

const NpmPackage = createWithRemoteLoader({
  modules: []
})(({ remoteModules, baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
      list={[
        {
          index: true,
          loader: () => import('@components/NpmPackage/List')
        },
        {
          path: 'detail',
          loader: () => import('@components/NpmPackage/Detail')
        }
      ]}
    />
  );
});

const App = createWithRemoteLoader({
  modules: ['components-core:Global', 'components-admin:Authenticate@Layout', 'components-admin:Authenticate@AfterUserLoginLayout', 'components-admin:Authenticate@MainLayout', 'components-admin:Authenticate@AfterAdminUserLoginLayout']
})(({ remoteModules, globalPreset }) => {
  const [Global, Layout, AfterUserLoginLayout, MainLayout, AfterAdminUserLoginLayout] = remoteModules;
  const baseUrl = '';
  const currentYear = new Date().getFullYear();

  return (
    <Global preset={globalPreset} themeToken={globalPreset.themeToken}>
      <AppChildrenRouter
        notFoundPage
        errorPage
        baseUrl={baseUrl}
        list={[
          {
            path: 'account/*',
            element: <RemoteLoader module="components-admin:Account" baseUrl={baseUrl + '/account'} className="login-container" systemName="Developer Document" allowLanguageSwitch={false} />
          },
          {
            path: 'admin/initAdmin',
            element: (
              <AppChildrenRouter
                errorPage
                notFoundPage
                element={<AfterUserLoginLayout />}
                list={[
                  {
                    index: true,
                    element: <RemoteLoader module="components-admin:Admin@InitAdmin" />
                  }
                ]}
              />
            )
          },
          {
            path: 'admin/*',
            element: (
              <AppChildrenRouter
                errorPage
                baseUrl={baseUrl + '/admin'}
                element={
                  <AfterAdminUserLoginLayout
                    navigation={{
                      base: `${baseUrl}/admin`,
                      list: [
                        {
                          key: 'npm-package',
                          title: '组件管理',
                          path: '/admin/npm-package'
                        },
                        {
                          key: 'remote-component',
                          title: '远程组件管理',
                          path: '/admin/remote-component'
                        },
                        /*{
                          key: 'apis',
                          title: '接口文档管理',
                          path: '/admin/apis'
                        },*/
                        {
                          key: 'blog',
                          title: '博客管理',
                          path: '/admin/blog'
                        },
                        {
                          key: 'document',
                          title: '文档管理',
                          path: '/admin/document'
                        },
                        {
                          key: 'task',
                          title: '任务管理',
                          path: '/admin/task'
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
                list={[
                  {
                    index: true,
                    element: <Navigate to={`${baseUrl}/admin/setting`} replace />
                  },
                  {
                    path: 'file',
                    element: <RemoteLoader module="components-file-manager:FileListPage" />
                  },
                  {
                    path: 'blog/*',
                    loader: () => import('@components/AdminBlog')
                  },
                  {
                    path: 'document/*',
                    loader: () => import('@components/AdminDocument')
                  },
                  {
                    path: 'remote-component/*',
                    loader: () => import('@components/AdminRemoteComponent')
                  },
                  {
                    path: 'npm-package/*',
                    loader: () => import('@components/AdminNpmPackage')
                  },
                  {
                    path: 'task/*',
                    element: <RemoteLoader module="components-admin:Task" baseUrl={baseUrl + '/admin'} />
                  },
                  {
                    path: 'setting/*',
                    element: <RemoteLoader module="developer-document:Setting" baseUrl={`${baseUrl}/admin/setting`} />
                  },
                  {
                    path: '*',
                    element: <RemoteLoader module="components-admin:Admin" baseUrl={baseUrl + '/admin'} />
                  }
                ]}
              />
            )
          }
        ]}
      >
        <AppChildrenRouter
          baseUrl={baseUrl}
          element={
            <Layout
              login={() => {
                const searchParams = new URLSearchParams(window.location.search);
                const referer = encodeURIComponent(window.location.pathname + window.location.search);
                searchParams.append('referer', referer);
                window.location.href = '/account/login?' + searchParams.toString();
              }}
              navigation={{
                list: [
                  {
                    key: 'npm-packages',
                    title: '组件',
                    path: '/npm-packages'
                  },
                  {
                    key: 'remote-components',
                    title: '远程组件',
                    path: '/remote-components'
                  },
                  /*{
                key: 'apis',
                title: '接口文档',
                path: '/apis'
              },*/
                  {
                    key: 'blog',
                    title: '博客',
                    path: '/blog'
                  },
                  {
                    key: 'documents',
                    title: '文档',
                    path: '/documents'
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
          list={[
            {
              index: true,
              loader: () => import('@pages/Home')
            },
            {
              path: 'about',
              loader: () => import('@pages/About')
            },
            {
              path: 'blog/*',
              element: <Blog baseUrl={baseUrl + '/blog'} />
            },
            {
              path: 'documents/*',
              element: <Document baseUrl={baseUrl + '/documents'} />
            },
            {
              path: 'remote-components/*',
              element: <RemoteComponent baseUrl={baseUrl + '/remote-components'} />
            },
            {
              path: 'npm-packages/*',
              element: <NpmPackage baseUrl={baseUrl + '/npm-packages'} />
            }
          ]}
        />
      </AppChildrenRouter>
      <footer className="global-page-footer">
        <div className="global-page-footer__inner">
          <div className="global-page-footer__brand">
            <div className="global-page-footer__title">Developer Document</div>
            <div className="global-page-footer__desc">组件与工程实践沉淀</div>
          </div>
          <div className="global-page-footer__meta">© {currentYear} Developer Document. All rights reserved.</div>
        </div>
      </footer>
    </Global>
  );
});

export default App;
