import RemoteLoader, { createWithRemoteLoader } from '@kne/remote-loader';
import AppChildrenRouter from '@kne/app-children-router';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import withLocale from './withLocale';
import { useIntl } from '@kne/react-intl';
import { useGlobalContext } from '@kne/global-context';
import RightOptions from './RightOptions';
import './index.scss';
import '@kne/react-box/dist/index.css';

const Blog = ({ baseUrl }) => {
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
};

const Document = ({ baseUrl }) => {
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
};

const RemoteComponent = ({ baseUrl }) => {
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
};

const NpmPackage = ({ baseUrl }) => {
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
};

const DefaultLocaleHandler = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { setting } = usePreset();
  const { locale: currentLocale } = useIntl();
  const { setGlobalValue } = useGlobalContext();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('language');
  const initializedRef = useRef(false);

  useEffect(() => {
    const selected = setting?.advanced?.languages?.selected;
    const defaultLang = setting?.advanced?.languages?.default;

    if (lang === 'en' || lang === 'en-US') {
      if (currentLocale !== 'en-US') {
        setGlobalValue('locale', 'en-US');
      }
      initializedRef.current = true;
      return;
    }
    if (lang === 'zh' || lang === 'zh-CN') {
      if (currentLocale !== 'zh-CN') {
        setGlobalValue('locale', 'zh-CN');
      }
      initializedRef.current = true;
      return;
    }

    if (initializedRef.current) return;

    if (selected && selected.length > 0) {
      if (!selected.includes(currentLocale)) {
        const target = defaultLang || selected[0];
        if (target !== currentLocale) {
          setGlobalValue('locale', target);
        }
      }
    } else {
      if (currentLocale !== 'zh-CN') {
        setGlobalValue('locale', 'zh-CN');
      }
    }
    initializedRef.current = true;
  }, [lang, setting]);

  return null;
});

const AppInner = withLocale(({ Layout, AfterUserLoginLayout, AfterAdminUserLoginLayout }) => {
  const { formatMessage, locale: currentLocale } = useIntl();
  const baseUrl = '';
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const navigate = useNavigate();

  const shouldShowFooter = !(location.pathname.startsWith('/account') || location.pathname.startsWith('/admin') || location.pathname === '/remote-components/detail' || location.pathname.startsWith('/share'));

  const adminNavigateTo = path => {
    if (!path || path === '/' || !String(path).startsWith('/admin')) {
      window.location.href = path || '/';
      return;
    }
    navigate(path);
  };

  return (
    <>
      <DefaultLocaleHandler />
      <AppChildrenRouter
        notFoundPage
        errorPage
        baseUrl={baseUrl}
        list={[
          {
            path: 'account/*',
            element: <RemoteLoader module="components-admin:Account" baseUrl={baseUrl + '/account'} className="login-container" systemName="Developer Document" registerOpen={false} allowLanguageSwitch={false} />
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
                      defaultTitle: 'Developer Document',
                      rightOptions: <RightOptions />,
                      navigateTo: adminNavigateTo,
                      list: [
                        {
                          key: 'npm-package',
                          title: formatMessage({ id: 'app.adminNav.npmPackage' }),
                          path: '/admin/npm-package'
                        },
                        {
                          key: 'remote-component',
                          title: formatMessage({ id: 'app.adminNav.remoteComponent' }),
                          path: '/admin/remote-component'
                        },
                        /*{
                          key: 'apis',
                          title: '接口文档管理',
                          path: '/admin/apis'
                        },*/
                        {
                          key: 'blog',
                          title: formatMessage({ id: 'app.adminNav.blog' }),
                          path: '/admin/blog'
                        },
                        {
                          key: 'document',
                          title: formatMessage({ id: 'app.adminNav.document' }),
                          path: '/admin/document'
                        },
                        {
                          key: 'task',
                          title: formatMessage({ id: 'app.adminNav.task' }),
                          path: '/admin/task'
                        },
                        {
                          key: 'user',
                          title: formatMessage({ id: 'app.adminNav.user' }),
                          path: '/admin/user'
                        },
                        {
                          key: 'file',
                          title: formatMessage({ id: 'app.adminNav.file' }),
                          path: '/admin/file'
                        },
                        {
                          key: 'setting',
                          title: formatMessage({ id: 'app.adminNav.setting' }),
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
          },
          {
            path: 'share',
            loader: () => import('@pages/Share')
          }
        ]}
      >
        <AppChildrenRouter
          notFoundPage
          errorPage
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
                defaultTitle: 'Developer Document',
                rightOptions: <RightOptions />,
                list: [
                  {
                    key: 'npm-packages',
                    title: formatMessage({ id: 'app.nav.npmPackages' }),
                    path: '/npm-packages'
                  },
                  {
                    key: 'remote-components',
                    title: formatMessage({ id: 'app.nav.remoteComponents' }),
                    path: '/remote-components'
                  },
                  /*{
                key: 'apis',
                title: '接口文档',
                path: '/apis'
              },*/
                  {
                    key: 'blog',
                    title: formatMessage({ id: 'app.nav.blog' }),
                    path: '/blog'
                  },
                  {
                    key: 'documents',
                    title: formatMessage({ id: 'app.nav.documents' }),
                    path: '/documents'
                  },
                  {
                    key: 'about',
                    title: formatMessage({ id: 'app.nav.about' }),
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
      {shouldShowFooter && (
        <footer className="global-page-footer">
          <div className="global-page-footer__inner">
            <div className="global-page-footer__brand">
              <div className="global-page-footer__title">Developer Document</div>
              <div className="global-page-footer__desc">{formatMessage({ id: 'app.footer.desc' })}</div>
            </div>
            <div className="global-page-footer__meta">© {currentYear} Developer Document. All rights reserved.</div>
          </div>
        </footer>
      )}
    </>
  );
});

const App = createWithRemoteLoader({
  modules: ['components-core:Global', 'components-admin:Authenticate@Layout', 'components-admin:Authenticate@AfterUserLoginLayout', 'components-admin:Authenticate@AfterAdminUserLoginLayout']
})(({ remoteModules, globalPreset }) => {
  const [Global, Layout, AfterUserLoginLayout, AfterAdminUserLoginLayout] = remoteModules;
  return (
    <Global preset={globalPreset} themeToken={globalPreset.themeToken}>
      <AppInner Layout={Layout} AfterUserLoginLayout={AfterUserLoginLayout} AfterAdminUserLoginLayout={AfterAdminUserLoginLayout} />
    </Global>
  );
});

export default App;
