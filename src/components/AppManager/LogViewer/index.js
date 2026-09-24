import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Flex, Input, Radio, Space, Switch, Tag, Typography } from 'antd';
import { ClearOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useIsMobile } from '@kne/responsive-utils';
import { getToken } from '@kne/token-storage';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import style from './style.module.scss';

const { Text } = Typography;
const { CheckableTag } = Tag;

const HISTORY_PAGE_SIZE = 100;
const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

const buildStreamUrl = (baseUrl, apiUrl, { name, stream }) => {
  const path = apiUrl || '/api/v1/app-manager/app/logs/stream';
  const url = new URL(path, window.location.origin);
  if (baseUrl) {
    try {
      const staticBase = new URL(baseUrl, window.location.origin);
      url.protocol = staticBase.protocol;
      url.host = staticBase.host;
    } catch (e) {
      // keep current origin
    }
  }
  url.searchParams.set('name', name);
  if (stream) {
    url.searchParams.set('stream', stream);
  }
  const token = getToken('X-User-Token');
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
};

const matchLogLine = (content, { query, levels, useRegex }) => {
  const text = content == null ? '' : String(content);
  if (levels?.length) {
    const upper = text.toUpperCase();
    const hit = levels.some(level => {
      if (level === 'WARN') {
        return upper.includes('WARN') || upper.includes('WARNING');
      }
      return upper.includes(level);
    });
    if (!hit) {
      return false;
    }
  }
  const q = (query || '').trim();
  if (!q) {
    return true;
  }
  if (useRegex) {
    try {
      return new RegExp(q, 'i').test(text);
    } catch (e) {
      return false;
    }
  }
  const tokens = q.match(/"[^"]+"|\S+/g) || [];
  const lower = text.toLowerCase();
  return tokens.every(token => {
    const needle = token.replace(/^"|"$/g, '').toLowerCase();
    return !needle || lower.includes(needle);
  });
};

const LogViewer = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:ButtonGroup']
})(
  withLocale(({ remoteModules, data }) => {
    const [usePreset, ButtonGroup] = remoteModules;
    const { apis, ajax, staticUrl } = usePreset();
    const { formatMessage } = useIntl();
    const isMobile = useIsMobile();
    const [stream, setStream] = useState('out');
    const [live, setLive] = useState(true);
    const [connected, setConnected] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [lines, setLines] = useState([]);
    const [filterQuery, setFilterQuery] = useState('');
    const [filterLevels, setFilterLevels] = useState([]);
    const [filterRegex, setFilterRegex] = useState(false);
    const boxRef = useRef(null);
    const stickToBottomRef = useRef(true);
    const loadingHistoryRef = useRef(false);
    const hasMoreRef = useRef(true);
    const historyPageRef = useRef(0);
    const linesRef = useRef([]);
    linesRef.current = lines;
    hasMoreRef.current = hasMoreHistory;

    const streamUrl = useMemo(() => {
      if (!live || !data?.name) {
        return null;
      }
      return buildStreamUrl(staticUrl, apis.appManager.logsStream.url, { name: data.name, stream });
    }, [live, data?.name, staticUrl, apis.appManager.logsStream.url, stream]);

    useEffect(() => {
      if (!streamUrl) {
        setConnected(false);
        return undefined;
      }

      const source = new EventSource(streamUrl);
      const onLog = event => {
        try {
          const payload = JSON.parse(event.data);
          setLines(prev => {
            const next = [...prev, payload];
            return next.slice(-500);
          });
        } catch (e) {
          // ignore malformed
        }
      };

      source.addEventListener('log', onLog);
      source.onopen = () => setConnected(true);
      source.onerror = () => {
        setConnected(false);
        source.close();
      };

      return () => {
        source.removeEventListener('log', onLog);
        source.close();
        setConnected(false);
      };
    }, [streamUrl]);

    useEffect(() => {
      if (live && stickToBottomRef.current && boxRef.current) {
        boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }
    }, [lines, live]);

    useEffect(() => {
      setLines([]);
      setHasMoreHistory(true);
      hasMoreRef.current = true;
      historyPageRef.current = 0;
      stickToBottomRef.current = true;
    }, [stream, data?.name]);

    const loadOlderHistory = useCallback(
      async ({ reset = false } = {}) => {
        if (!data?.name || loadingHistoryRef.current) {
          return;
        }
        if (!reset && !hasMoreRef.current) {
          return;
        }
        loadingHistoryRef.current = true;
        setLoadingHistory(true);
        const el = boxRef.current;
        const prevHeight = el ? el.scrollHeight : 0;
        const prevTop = el ? el.scrollTop : 0;
        try {
          const current = linesRef.current;
          const oldestLine = current.reduce((min, item) => {
            if (item?.line == null) {
              return min;
            }
            return Math.min(min, Number(item.line));
          }, Infinity);
          const params = {
            name: data.name,
            stream,
            perPage: HISTORY_PAGE_SIZE
          };
          if (reset) {
            historyPageRef.current = 1;
            params.currentPage = 1;
          } else if (Number.isFinite(oldestLine) && oldestLine > 1) {
            params.beforeLine = oldestLine;
          } else {
            // 实时流可能尚未带行号：用文件总行数估算锚点，再 beforeLine 上翻
            const { data: probe } = await ajax(
              Object.assign({}, apis.appManager.logs, {
                params: { name: data.name, stream, perPage: 1, currentPage: 1 }
              })
            );
            const total = probe?.code === 0 ? Number(probe.data?.totalCount) || 0 : 0;
            if (total <= 0) {
              setHasMoreHistory(false);
              hasMoreRef.current = false;
              return;
            }
            const approxOldest = Math.max(1, total - current.length + 1);
            if (approxOldest <= 1) {
              setHasMoreHistory(false);
              hasMoreRef.current = false;
              return;
            }
            params.beforeLine = approxOldest;
          }
          const { data: resData } = await ajax(
            Object.assign({}, apis.appManager.logs, {
              params
            })
          );
          if (resData.code !== 0) {
            return;
          }
          const pageData = (resData.data?.pageData || []).slice().reverse();
          const mapped = pageData.map(item => ({
            content: item.content,
            stream,
            line: item.line
          }));
          const more = resData.data?.hasMore === true;
          setHasMoreHistory(more);
          hasMoreRef.current = more;
          if (reset) {
            setLines(mapped);
            stickToBottomRef.current = true;
            requestAnimationFrame(() => {
              if (boxRef.current) {
                boxRef.current.scrollTop = boxRef.current.scrollHeight;
              }
            });
            return;
          }
          if (!mapped.length) {
            setHasMoreHistory(false);
            hasMoreRef.current = false;
            return;
          }
          const seen = new Set(current.map(item => item.line).filter(v => v != null));
          const older = mapped.filter(item => item.line == null || !seen.has(item.line));
          if (!older.length) {
            setHasMoreHistory(false);
            hasMoreRef.current = false;
            return;
          }
          setLines(prev => [...older, ...prev]);
          requestAnimationFrame(() => {
            if (boxRef.current) {
              boxRef.current.scrollTop = boxRef.current.scrollHeight - prevHeight + prevTop;
            }
          });
        } finally {
          loadingHistoryRef.current = false;
          setLoadingHistory(false);
        }
      },
      [ajax, apis.appManager.logs, data?.name, stream]
    );

    useEffect(() => {
      if (live) {
        return undefined;
      }
      // 停止实时后：若当前为空则拉一页；否则允许上滚继续加载
      if (!linesRef.current.length) {
        loadOlderHistory({ reset: true });
      } else {
        const oldest = linesRef.current.reduce((min, item) => {
          if (item?.line == null) {
            return min;
          }
          return Math.min(min, Number(item.line));
        }, Infinity);
        const more = !Number.isFinite(oldest) || oldest > 1;
        setHasMoreHistory(more);
        hasMoreRef.current = more;
      }
      return undefined;
    }, [live, loadOlderHistory, stream, data?.name]);

    const onLogScroll = useCallback(
      e => {
        const el = e.currentTarget;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom < 48;
        if (live || loadingHistoryRef.current || !hasMoreRef.current) {
          return;
        }
        if (el.scrollTop <= 48) {
          loadOlderHistory();
        }
      },
      [live, loadOlderHistory]
    );

    const toggleLevel = level => {
      setFilterLevels(prev => (prev.includes(level) ? prev.filter(item => item !== level) : [...prev, level]));
    };

    const visibleLines = useMemo(() => {
      const opts = { query: filterQuery, levels: filterLevels, useRegex: filterRegex };
      return lines.filter(item => matchLogLine(item.content, opts));
    }, [lines, filterQuery, filterLevels, filterRegex]);

    const liveLabel = live ? formatMessage({ id: 'appManager.logs.stopLive' }) : formatMessage({ id: 'appManager.logs.startLive' });
    const clearLabel = formatMessage({ id: 'appManager.logs.clear' });

    const actionList = useMemo(
      () => [
        {
          type: live ? 'primary' : 'default',
          icon: live ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
          children: liveLabel,
          onClick: () => setLive(v => !v)
        },
        {
          icon: <ClearOutlined />,
          children: clearLabel,
          disabled: lines.length === 0,
          onClick: () => setLines([])
        }
      ],
      [clearLabel, live, liveLabel, lines.length]
    );

    const statusTag = (
      <Tag className={style['status-tag']} color={live ? (connected ? 'success' : 'processing') : 'default'}>
        {live ? (connected ? formatMessage({ id: 'appManager.logs.connected' }) : formatMessage({ id: 'appManager.logs.connecting' })) : formatMessage({ id: 'appManager.logs.disconnected' })}
      </Tag>
    );

    const streamGroup = (
      <Radio.Group
        className={style['stream-group']}
        size="small"
        value={stream}
        optionType="button"
        buttonStyle="solid"
        options={[
          { label: formatMessage({ id: 'appManager.logs.streamOut' }), value: 'out' },
          { label: formatMessage({ id: 'appManager.logs.streamErr' }), value: 'err' }
        ]}
        onChange={e => setStream(e.target.value)}
      />
    );

    const filterBar = (
      <div className={style['filter-bar']}>
        <Input allowClear size="small" className={style['filter-input']} value={filterQuery} placeholder={formatMessage({ id: 'appManager.logs.filterPlaceholder' })} onChange={e => setFilterQuery(e.target.value)} />
        <Space size={[4, 4]} wrap className={style['filter-levels']}>
          {LOG_LEVELS.map(level => (
            <CheckableTag key={level} checked={filterLevels.includes(level)} onChange={() => toggleLevel(level)}>
              {level}
            </CheckableTag>
          ))}
        </Space>
        <Flex align="center" gap={6} className={style['filter-regex']}>
          <Switch size="small" checked={filterRegex} onChange={setFilterRegex} />
          <Text type="secondary" className={style['filter-regex-label']}>
            {formatMessage({ id: 'appManager.logs.filterRegex' })}
          </Text>
        </Flex>
      </div>
    );

    return (
      <Flex vertical gap={isMobile ? 10 : 12} className={classnames(style['log-viewer'], isMobile && style['is-mobile'])}>
        {isMobile ? (
          <div className={style['mobile-chrome']}>
            <Flex className={style['mobile-chrome-top']} align="center" justify="space-between" gap={8}>
              {streamGroup}
              <Flex align="center" gap={6} className={style['mobile-chrome-meta']}>
                {statusTag}
                <Text type="secondary" className={style['line-count']}>
                  {formatMessage({ id: 'appManager.logs.lineCountFiltered' }, { shown: visibleLines.length, total: lines.length })}
                </Text>
              </Flex>
            </Flex>
            {filterBar}
            <div className={style['mobile-actions']}>
              <button type="button" className={classnames(style['mobile-action'], live && style['is-active'])} onClick={() => setLive(v => !v)}>
                <span className={style['mobile-action-icon']}>{live ? <PauseCircleOutlined /> : <PlayCircleOutlined />}</span>
                <span className={style['mobile-action-label']}>{live ? formatMessage({ id: 'appManager.logs.mobileStop' }) : formatMessage({ id: 'appManager.logs.mobileStart' })}</span>
              </button>
              <button type="button" className={style['mobile-action']} disabled={lines.length === 0} onClick={() => setLines([])}>
                <span className={style['mobile-action-icon']}>
                  <ClearOutlined />
                </span>
                <span className={style['mobile-action-label']}>{formatMessage({ id: 'appManager.logs.mobileClear' })}</span>
              </button>
            </div>
            {!live && loadingHistory ? (
              <Text type="secondary" className={style['line-count']}>
                {formatMessage({ id: 'appManager.logs.loadingOlder' })}
              </Text>
            ) : null}
            {!live && !hasMoreHistory && lines.length > 0 ? (
              <Text type="secondary" className={style['line-count']}>
                {formatMessage({ id: 'appManager.logs.noMoreHistory' })}
              </Text>
            ) : null}
          </div>
        ) : (
          <>
            <Flex className={style['toolbar']} align="center" justify="space-between" gap={16} wrap>
              <Flex className={style['toolbar-meta']} align="center" gap={8} wrap="wrap">
                {streamGroup}
                {statusTag}
                <Text type="secondary" className={style['line-count']}>
                  {formatMessage({ id: 'appManager.logs.lineCountFiltered' }, { shown: visibleLines.length, total: lines.length })}
                </Text>
                {!live && loadingHistory ? (
                  <Text type="secondary" className={style['line-count']}>
                    {formatMessage({ id: 'appManager.logs.loadingOlder' })}
                  </Text>
                ) : null}
                {!live && !hasMoreHistory && lines.length > 0 ? (
                  <Text type="secondary" className={style['line-count']}>
                    {formatMessage({ id: 'appManager.logs.noMoreHistory' })}
                  </Text>
                ) : null}
              </Flex>
              <div className={style['toolbar-actions']}>
                <ButtonGroup compact showLength={actionList.length} list={actionList} />
              </div>
            </Flex>
            {filterBar}
          </>
        )}
        <div ref={boxRef} className={style['log-box']} onScroll={onLogScroll}>
          {visibleLines.length === 0 ? (
            <Text type="secondary" className={style['log-empty']}>
              {lines.length === 0 ? formatMessage({ id: 'appManager.logs.empty' }) : formatMessage({ id: 'appManager.logs.filterEmpty' })}
            </Text>
          ) : (
            visibleLines.map((item, index) => <div key={`${item.line || index}-${index}`}>{item.content}</div>)
          )}
        </div>
      </Flex>
    );
  })
);

export default LogViewer;
