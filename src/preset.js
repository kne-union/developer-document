import React from 'react';
import { preset as fetchPreset } from '@kne/react-fetch';
import { Spin, Empty, message } from 'antd';
import { preset as remoteLoaderPreset, loadModule } from '@kne/remote-loader';
import createAjax from '@kne/axios-fetch';
import transform from 'lodash/transform';
import { getApis } from '@components/Apis';
import { setOidcClient, getUserAccessToken } from '@components/Shared/auth';
import ensureSlash from '@kne/ensure-slash';

window.PUBLIC_URL = window.runtimePublicUrl || process.env.PUBLIC_URL;

const publicBase = String(window.PUBLIC_URL || '').replace(/\/+$/, '');

const ensureBootMask = () => {
  if (typeof document === 'undefined') {
    return;
  }
  if (!document.getElementById('app-boot-style')) {
    const style = document.createElement('style');
    style.id = 'app-boot-style';
    style.textContent =
      '#app-boot{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f6f7f9}#app-boot img{width:72px;height:72px;border-radius:22%;overflow:hidden}#app-boot-name{font-size:16px;line-height:24px;font-weight:500;color:rgba(0,0,0,.88)}';
    document.head.appendChild(style);
  }
  let mask = document.getElementById('app-boot');
  if (!mask) {
    mask = document.createElement('div');
    mask.id = 'app-boot';
    const img = document.createElement('img');
    img.id = 'app-boot-logo';
    img.alt = '';
    img.src = `${publicBase}/pwa/home-apple-touch-icon.png`;
    mask.appendChild(img);
    document.body.prepend(mask);
  }
  let name = document.getElementById('app-boot-name');
  if (!name) {
    name = document.createElement('div');
    name.id = 'app-boot-name';
    mask.appendChild(name);
  }
  name.textContent = document.title;
};

ensureBootMask();

const hideBootMask = () => {
  if (typeof document === 'undefined') {
    return;
  }
  document.getElementById('app-boot')?.remove();
};

// runtimeApiUrl 为 '/' 时直接拼接会得到 '//api/...'，浏览器会把它当成协议相对地址
const baseApiUrl = ensureSlash(window.runtimeApiUrl || '');

const loadOidcConfig = async () => {
  const response = await fetch(`${baseApiUrl}/api/oidc/config`);
  const body = await response.json();
  return body && Object.prototype.hasOwnProperty.call(body, 'code') && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
};

const globalInit = async () => {
  const registry = {
    url: 'https://cdn.leapin-ai.com',
    tpl: '{{url}}/components/@kne-components/{{remote}}/{{version}}/build'
  };

  const componentsCoreRemote = {
    ...registry,
    remote: 'components-core',
    defaultVersion: '0.6.15'
  };
  remoteLoaderPreset({
    remotes: {
      default: componentsCoreRemote,
      'components-core': componentsCoreRemote,
      'components-iconfont': {
        ...registry,
        remote: 'components-iconfont',
        defaultVersion: '0.2.1'
      },
      'components-file-manager': {
        ...registry,
        remote: 'components-file-manager',
        defaultVersion: '0.1.9'
      },
      'components-admin': {
        ...registry,
        remote: 'components-admin',
        defaultVersion: '1.1.131'
      },
      'components-thirdparty': {
        ...registry,
        remote: 'components-thirdparty',
        defaultVersion: '0.1.54'
      },
      'components-app-manager': {
        ...registry,
        remote: 'components-app-manager',
        defaultVersion: '0.1.0'
      },
      'developer-document':
        process.env.NODE_ENV === 'development'
          ? {
              remote: 'developer-document',
              url: '/',
              tpl: '{{url}}',
              defaultVersion: process.env.DEFAULT_VERSION
            }
          : {
              remote: 'developer-document',
              url: '/',
              tpl: '{{url}}',
              defaultVersion: process.env.DEFAULT_VERSION
            }
    }
  });

  let oidc;
  try {
    const [{ default: createOidcClient }, oidcConfig] = await Promise.all([loadModule('components-admin:Oidc@createOidcClient'), loadOidcConfig()]);
    oidc = createOidcClient({ issuer: oidcConfig.issuer, clientId: oidcConfig.clientId, resource: oidcConfig.audience });
    setOidcClient(oidc);
  } catch (e) {
    console.error(e);
    return { error: true };
  }

  const ajax = createAjax({
    baseURL: baseApiUrl,
    errorHandler: error => message.error(error),
    registerInterceptors: interceptors =>
      oidc.registerInterceptors(interceptors, {
        onUnauthorized: response => {
          if (response.config) {
            response.config.showError = false;
          }
          const headers = response.config?.headers;
          const authorization = typeof headers?.get === 'function' ? headers.get('Authorization') || headers.get('authorization') : headers?.Authorization || headers?.authorization;
          // 未登录可以浏览公开页面。没有令牌时接口返回 401，不要提示「缺少访问令牌」，也不要跳转登录。
          if (!authorization) {
            return false;
          }
          oidc.login();
          return true;
        }
      })
  });

  fetchPreset({
    ajax,
    loading: (
      <Spin
        delay={500}
        style={{
          position: 'absolute',
          left: '50%',
          padding: '10px',
          transform: 'translateX(-50%)'
        }}
      />
    ),
    error: null,
    empty: <Empty />,
    transformResponse: response => {
      const { data } = response;
      response.data = {
        code: data.code === 0 ? 200 : data.code,
        msg: data.msg,
        results: data.data
      };
      return response;
    }
  });

  const safeLoadApis = async name => {
    try {
      return await loadModule(name).then(({ default: defaultModule }) => defaultModule);
    } catch (e) {
      console.error(e);
      return () => {
        return {};
      };
    }
  };
  const remoteApis = await (async () => {
    const input = {
      fileManager: 'components-file-manager:Apis@getApis',
      appManager: 'components-app-manager:Apis@getApis'
    };

    const remoteApiKeys = Object.keys(input);
    return transform(
      await Promise.all(remoteApiKeys.map(name => safeLoadApis(Array.isArray(input[name]) ? input[name][0] : input[name]))),
      (result, value, index) => {
        const name = remoteApiKeys[index];
        result[name] = value(input[name][1]);
      },
      {}
    );
  })();
  const getAccountApis = await safeLoadApis('components-admin:Apis@getApis');

  const enums = Object.assign({}, await safeLoadApis('components-admin:Task@enums'), {
    taskType: () => [
      { value: 'blogSearch', description: '知乎文章线索拉取', type: 'info' },
      { value: 'npmPackageSync', description: 'NPM 包同步', type: 'info' },
      { value: 'remoteComponentDeploy', description: '远程组件部署', type: 'info' }
    ]
  });

  const apis = Object.assign(
    {},
    getAccountApis(),
    remoteApis,
    {
      file: {
        contentWindowUrl: 'https://cdn.leapin-ai.com/components/@kne/iframe-resizer/0.1.3/dist/contentWindow.js',
        pdfjsUrl: 'https://cdn.leapin-ai.com/components/pdfjs-dist/4.4.168',
        getUrl: {
          url: `/api/v1/static/file-url/{id}`,
          paramsType: 'urlParams',
          ignoreSuccessState: true
        },
        uploadForEditor: ({ file }) => {
          return ajax
            .postForm({
              url: `/api/v1/static/upload`,
              data: { file }
            })
            .then(response => {
              if (response.data.code === 0) {
                response.data.data = `${ensureSlash(baseApiUrl)}/api/v1/static/file-id/${response.data.data.id}`;
              }
              return response;
            });
        },
        upload: ({ file }) => {
          return ajax.postForm({
            url: `/api/v1/static/upload`,
            data: { file }
          });
        }
      }
    },
    getApis()
  );
  let setting = {};
  try {
    const { data: resData } = await ajax(Object.assign({}, apis.setting.detail));

    if (resData.code !== 0) {
      return { error: true };
    }
    setting = resData.data;
  } catch (e) {
    return { error: true };
  }

  return {
    ajax,
    oidc,
    setting,
    staticUrl: baseApiUrl,
    getUserAccessToken,
    enums,
    apis,
    themeToken: {
      colorPrimary: setting.profile?.theme || '#4183F0',
      colorInfo: setting.profile?.theme || '#4183F0',
      colorBgLayout: '#f5f7fa',
      colorBgContainer: '#ffffff',
      borderRadius: 12,
      borderRadiusLG: 16,
      boxShadowSecondary: '0 10px 24px rgba(15, 23, 42, 0.06)'
    }
  };
};

const globalInitWithBootMask = async () => {
  try {
    return await globalInit();
  } finally {
    hideBootMask();
  }
};

export { globalInitWithBootMask as globalInit };
