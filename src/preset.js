import React from 'react';
import { preset as fetchPreset } from '@kne/react-fetch';
import { Spin, Empty, message } from 'antd';
import { preset as remoteLoaderPreset, loadModule } from '@kne/remote-loader';
import createAjax from '@kne/axios-fetch';
import { getToken } from '@kne/token-storage';
import transform from 'lodash/transform';
import { getApis } from '@components/Apis';

window.PUBLIC_URL = window.runtimePublicUrl || process.env.PUBLIC_URL;

const baseApiUrl = window.runtimeApiUrl || '';

export const globalInit = async () => {
  const ajax = createAjax({
    baseURL: baseApiUrl,
    errorHandler: error => message.error(error),
    getDefaultHeaders: () => {
      return {
        'X-User-Token': getToken('X-User-Token')
      };
    },
    registerInterceptors: interceptors => {
      interceptors.response.use(response => {
        if (response.status === 401 || response.data.code === 401) {
          const searchParams = new URLSearchParams(window.location.search);
          const referer = encodeURIComponent(window.location.pathname + window.location.search);
          searchParams.append('referer', referer);
          window.location.href = '/account/login?' + searchParams.toString();
          response.showError = false;
        }
        return response;
      });
    }
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
  const registry = {
    url: 'https://uc.fatalent.cn',
    tpl: '{{url}}/packages/@kne-components/{{remote}}/{{version}}/build'
  };

  const componentsCoreRemote = {
    ...registry,
    url: 'http://localhost:3001',
    tpl: '{{url}}',
    remote: 'components-core',
    defaultVersion: '0.4.0'
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
        defaultVersion: '0.1.1'
      },
      'components-admin': {
        ...registry, //url: 'http://localhost:3016',
        //tpl: '{{url}}',
        remote: 'components-admin',
        defaultVersion: '1.0.6'
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
              ...registry,
              remote: 'developer-document',
              defaultVersion: process.env.DEFAULT_VERSION
            }
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
      fileManager: 'components-file-manager:Apis@getApis'
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

  const apis = Object.assign(
    {},
    getAccountApis(),
    remoteApis,
    {
      file: {
        contentWindowUrl: 'https://uc.fatalent.cn/components/@kne/iframe-resizer/0.1.3/dist/contentWindow.js',
        pdfjsUrl: 'https://uc.fatalent.cn/components/pdfjs-dist/4.4.168',
        getUrl: {
          url: `/api/v1/static/file-url/{id}`,
          paramsType: 'urlParams',
          ignoreSuccessState: true
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
    setting,
    staticUrl: baseApiUrl,
    enums: Object.assign({}),
    apis,
    themeToken: {
      colorPrimary: setting.profile?.theme || '#4183F0'
    }
  };
};
