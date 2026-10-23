import { useEffect, useRef, useState } from 'react';
import { Alert, Spin } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { getDisplayStatus } from '../StatusTag';
import style from './style.module.scss';

const REFRESH_AHEAD_MS = 60 * 1000;

/** 后台布局顶部固定导航高度 */
const HEADER_HEIGHT = 48;

/** 走本站网关的同源路径：令牌经网关透传给子应用，不受跨域限制 */
const getAppBasePath = app => (app.pathUrl ? new URL(app.pathUrl, window.location.href).pathname : `/app/${encodeURIComponent(app.name)}`).replace(/\/$/, '');

const renderError = msg => <Alert type="warning" showIcon message={msg} />;

/** 令牌到期前重新签发，避免长时间停留后调试 401 */
const TokenRefresher = ({ expiresAt, reload }) => {
  useEffect(() => {
    const delay = new Date(expiresAt).getTime() - Date.now() - REFRESH_AHEAD_MS;
    const timer = setTimeout(reload, Math.max(delay, 0));
    return () => clearTimeout(timer);
  }, [expiresAt, reload]);
  return null;
};

/** 对比前后列表，只把新增 / 变更（引用不同）的记录保存、把消失的记录删除 */
const diffRecords = (prev, next) => {
  const prevMap = new Map(prev.map(item => [item.id, item]));
  const nextIds = new Set(next.map(item => item.id));
  return {
    saved: next.filter(item => prevMap.get(item.id) !== item),
    removed: prev.filter(item => !nextIds.has(item.id)).map(item => item.id)
  };
};

const PAGE_SIZE = 20;

const request = async (ajax, api, options) => {
  const { data: resData } = await ajax(Object.assign({}, api, options));
  if (resData.code !== 0) {
    throw new Error(resData.msg);
  }
  return resData.data;
};

const appendUnique = (list, items) => {
  const ids = new Set(list.map(item => item.id));
  return [...list, ...items.filter(item => !ids.has(item.id))];
};

/** 把本地增删同步到服务端，返回新增记录与被删记录（供计数调整） */
const createRecordSync =
  ({ name, type, ajax, apis, listRef }) =>
  next => {
    const prev = listRef.current;
    const { saved, removed } = diffRecords(prev, next);
    const prevIds = new Set(prev.map(item => item.id));
    listRef.current = next;
    saved.length && ajax(Object.assign({}, apis.appManager.openApiRecordsSave, { data: { name, type, records: saved } }));
    removed.length && ajax(Object.assign({}, apis.appManager.openApiRecordsRemove, { data: { name, type, ids: removed } }));
    return { added: saved.filter(item => !prevIds.has(item.id)), removed: prev.filter(item => removed.includes(item.id)) };
  };

/** 调用记录：服务端分页 + 搜索；新增记录都已保存，因此已加载条数即下一页的 offset */
const useHistoryRecords = ({ name, defaultValue, ajax, apis }) => {
  const [state, setState] = useState({ list: defaultValue.pageData, total: defaultValue.totalCount });
  const listRef = useRef(defaultValue.pageData);
  const keywordRef = useRef('');
  const searchSeqRef = useRef(0);
  const sync = createRecordSync({ name, type: 'history', ajax, apis, listRef });
  const fetchPage = offset => request(ajax, apis.appManager.openApiRecords, { params: { name, type: 'history', keyword: keywordRef.current || undefined, offset, limit: PAGE_SIZE } });
  return {
    history: state.list,
    historyTotal: state.total,
    historyHasMore: state.list.length < state.total,
    maxHistory: Infinity,
    onHistoryChange: next => {
      const { added, removed } = sync(next);
      setState(prev => ({ list: next, total: prev.total + added.length - removed.length }));
    },
    onHistoryLoadMore: async () => {
      const { pageData, totalCount } = await fetchPage(listRef.current.length);
      listRef.current = appendUnique(listRef.current, pageData);
      setState({ list: listRef.current, total: totalCount });
    },
    onHistorySearch: async keyword => {
      keywordRef.current = keyword;
      const seq = ++searchSeqRef.current;
      const { pageData, totalCount } = await fetchPage(0);
      if (seq === searchSeqRef.current) {
        listRef.current = pageData;
        setState({ list: pageData, total: totalCount });
      }
    },
    onHistoryClear: () => {
      listRef.current = [];
      setState({ list: [], total: 0 });
      ajax(Object.assign({}, apis.appManager.openApiRecordsRemove, { data: { name, type: 'history', all: true } }));
    }
  };
};

/** 用例：只预取各接口数量，打开接口时按接口分页加载 */
const useCaseRecords = ({ name, defaultCounts, ajax, apis }) => {
  const [state, setState] = useState({ list: [], counts: defaultCounts });
  const listRef = useRef([]);
  const sync = createRecordSync({ name, type: 'case', ajax, apis, listRef });
  return {
    cases: state.list,
    caseCounts: state.counts,
    onCasesChange: next => {
      const { added, removed } = sync(next);
      setState(prev => {
        const counts = Object.assign({}, prev.counts);
        added.forEach(item => (counts[item.operationKey] = (counts[item.operationKey] || 0) + 1));
        removed.forEach(item => (counts[item.operationKey] = Math.max((counts[item.operationKey] || 0) - 1, 0)));
        return { list: next, counts };
      });
    },
    onCasesLoadMore: async operationKey => {
      const offset = listRef.current.filter(item => item.operationKey === operationKey).length;
      const { pageData, totalCount } = await request(ajax, apis.appManager.openApiRecords, {
        params: { name, type: 'case', operationKey, offset, limit: PAGE_SIZE }
      });
      listRef.current = appendUnique(listRef.current, pageData);
      setState(prev => ({ list: listRef.current, counts: Object.assign({}, prev.counts, { [operationKey]: totalCount }) }));
    }
  };
};

/** 调用记录与用例按应用存到服务端，所有管理员共享 */
const AppRecords = ({ name, records, ajax, apis, children }) => {
  const historyProps = useHistoryRecords({ name, defaultValue: records.history, ajax, apis });
  const caseProps = useCaseRecords({ name, defaultCounts: records.caseCounts, ajax, apis });
  return children(Object.assign({}, historyProps, caseProps));
};

const RunningOpenApi = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-thirdparty:PostCat@OpenApiView']
})(({ remoteModules, data }) => {
  const [usePreset, OpenApiView] = remoteModules;
  const { ajax, apis } = usePreset();

  return (
    <Fetch
      {...Object.assign({}, apis.appManager.openApi, { params: { name: data.name } })}
      loading={<Spin className={style['loading']} />}
      error={renderError}
      render={({ data: doc }) => (
        <Fetch
          loader={async () => {
            const [history, caseCounts] = await Promise.all([
              request(ajax, apis.appManager.openApiRecords, { params: { name: data.name, type: 'history', limit: PAGE_SIZE } }),
              request(ajax, apis.appManager.openApiRecordsCount, { params: { name: data.name, type: 'case' } })
            ]);
            return { history, caseCounts };
          }}
          loading={<Spin className={style['loading']} />}
          error={renderError}
          render={({ data: records }) => (
            <AppRecords name={data.name} records={records} ajax={ajax} apis={apis}>
              {recordProps => (
                <Fetch
                  {...Object.assign({}, apis.appManager.openApiToken, { data: { name: data.name } })}
                  loading={<Spin className={style['loading']} />}
                  error={renderError}
                  render={({ data: { token, expiresAt }, reload }) => (
                    <>
                      <TokenRefresher expiresAt={expiresAt} reload={reload} />
                      <OpenApiView
                        {...recordProps}
                        className={style['open-api']}
                        data={doc}
                        apiActionsOpen={false}
                        stickyTop={HEADER_HEIGHT + 16}
                        envs={[
                          {
                            id: 'app',
                            name: data.label || data.name,
                            baseUrl: getAppBasePath(data),
                            headers: { Authorization: `Bearer ${token}` }
                          }
                        ]}
                      />
                    </>
                  )}
                />
              )}
            </AppRecords>
          )}
        />
      )}
    />
  );
});

/** 未正常运行（含部署/恢复中 DB status 仍为 running）时不请求文档与记录接口，直接提示当前状态 */
const OpenApiPanel = withLocale(({ data }) => {
  const { formatMessage } = useIntl();
  const displayStatus = getDisplayStatus({ status: data.status, deployment: data.deployment });
  if (displayStatus !== 'running') {
    const statusLabel = formatMessage({ id: `appManager.status.${displayStatus}`, defaultMessage: displayStatus });
    return <Alert className={style['alert']} type="warning" showIcon message={formatMessage({ id: data.currentVersionId || data.deployment ? 'appManager.openApi.notRunning' : 'appManager.openApi.notDeployed' }, { status: statusLabel })} />;
  }
  return <RunningOpenApi data={data} />;
});

export default OpenApiPanel;
