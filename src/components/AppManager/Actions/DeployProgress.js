import { useEffect, useRef, useState } from 'react';
import { Alert, Collapse, Space, Steps, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import buildAuthUrl from '../utils/buildAuthUrl';

const { Text } = Typography;

const STEPS = ['package', 'env', 'migrate', 'start', 'ready'];

const STEP_STATUS = { running: 'process', done: 'finish', skipped: 'finish', error: 'error' };

const MAX_LOG_LINES = 2000;

const createProgressId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const isFinal = event => event.status === 'error' || (event.step === 'ready' && event.status !== 'running');

const splitLog = text => (text ? text.split('\n').filter(Boolean) : []);

const DeployLog = ({ lines, formatMessage, defaultOpen }) => {
  const preRef = useRef(null);
  const [activeKey, setActiveKey] = useState(defaultOpen ? ['log'] : []);

  useEffect(() => {
    if (defaultOpen) {
      setActiveKey(['log']);
    }
  }, [defaultOpen]);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [lines, activeKey]);

  return (
    <Collapse
      size="small"
      activeKey={activeKey}
      onChange={setActiveKey}
      items={[
        {
          key: 'log',
          label: formatMessage({ id: 'appManager.deploy.log' }, { count: lines.length }),
          children: (
            <pre ref={preRef} style={{ margin: 0, maxHeight: 320, overflow: 'auto', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {lines.length ? lines.join('\n') : formatMessage({ id: 'appManager.deploy.logEmpty' })}
            </pre>
          )
        }
      ]}
    />
  );
};

/**
 * 不传 progressId：新建进度标识，先订阅 SSE 再发起部署（payload 为部署参数）。
 * 传 progressId：只订阅该次部署（进行中或已结束），不发起新部署。
 */
const DeployProgress = ({ ajax, apis, staticUrl, name, payload, progressId: watchProgressId, formatMessage, onStarted, onDeployed, onFinish }) => {
  const [events, setEvents] = useState({});
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const startedRef = useRef(false);
  const progressIdRef = useRef(watchProgressId || null);
  if (!progressIdRef.current) {
    progressIdRef.current = createProgressId();
  }
  const appName = name || payload?.name;
  const callbacksRef = useRef({ onStarted, onDeployed, onFinish, formatMessage });
  callbacksRef.current = { onStarted, onDeployed, onFinish, formatMessage };

  useEffect(() => {
    const progressId = progressIdRef.current;
    const watching = !!watchProgressId;
    const source = new EventSource(buildAuthUrl(staticUrl, apis.appManager.deployStream.url, { name: appName, progressId }));
    let finished = false;
    let startNotified = watching;

    const appendLogs = lines => setLogs(prev => prev.concat(lines).slice(-MAX_LOG_LINES));

    // SSE 只回放最近日志，失败后取完整日志
    const loadFullLog = async () => {
      try {
        const { data: resData } = await ajax(Object.assign({}, apis.appManager.deployDetail, { params: { name: appName, progressId } }));
        if (resData.code === 0) {
          setLogs(splitLog(resData.data.log).slice(-MAX_LOG_LINES));
        }
      } catch (e) {
        // keep streamed lines
      }
    };

    const finish = next => {
      if (finished) {
        return;
      }
      finished = true;
      source.close();
      if (!next.ok) {
        setEvents(prev => {
          const step = STEPS.find(name => prev[name]?.status === 'running') || STEPS.find(name => !prev[name]);
          return step ? Object.assign({}, prev, { [step]: { step, status: 'error', message: next.message } }) : prev;
        });
        loadFullLog();
      }
      setResult(next);
      callbacksRef.current.onFinish && callbacksRef.current.onFinish(next);
    };

    const handle = event => {
      setEvents(prev => Object.assign({}, prev, { [event.step]: event }));
      if (isFinal(event)) {
        finish(event.status === 'error' ? { ok: false, message: event.message } : { ok: true });
        return;
      }
      // 部署请求要到结束才返回，首个进度事件时服务端已登记本次部署，此时通知外部刷新状态
      if (!startNotified) {
        startNotified = true;
        callbacksRef.current.onStarted && callbacksRef.current.onStarted();
      }
    };

    const deploy = async () => {
      if (watching || startedRef.current) {
        return;
      }
      startedRef.current = true;
      try {
        const { data: resData } = await ajax(Object.assign({}, apis.appManager.deploy, { data: Object.assign({}, payload, { progressId }) }));
        if (resData.code !== 0) {
          finish({ ok: false, message: resData.msg });
          return;
        }
        callbacksRef.current.onDeployed && callbacksRef.current.onDeployed(resData.data);
      } catch (e) {
        finish({ ok: false, message: e.message });
      }
    };

    source.addEventListener('snapshot', event => {
      let snapshot = null;
      try {
        snapshot = JSON.parse(event.data);
      } catch (e) {
        // ignore malformed
      }
      if (snapshot?.deploy?.log) {
        setLogs(splitLog(snapshot.deploy.log));
      }
      (snapshot?.events || []).forEach(handle);
      if (watching && !finished && !snapshot?.deploy && !(snapshot?.events || []).length) {
        finish({ ok: false, message: callbacksRef.current.formatMessage({ id: 'appManager.deploy.notFound' }) });
        return;
      }
      deploy();
    });
    source.addEventListener('progress', event => {
      try {
        handle(JSON.parse(event.data));
      } catch (e) {
        // ignore malformed
      }
    });
    source.addEventListener('log', event => {
      try {
        appendLogs([JSON.parse(event.data).line]);
      } catch (e) {
        // ignore malformed
      }
    });
    source.onerror = () => {
      if (!startedRef.current) {
        deploy();
      }
    };
    return () => {
      finished = true;
      source.close();
    };
  }, [ajax, apis, staticUrl, appName, payload, watchProgressId]);

  const items = STEPS.map(step => {
    const event = events[step];
    const status = event ? STEP_STATUS[event.status] : 'wait';
    let description = null;
    if (event?.status === 'skipped') {
      description = formatMessage({ id: 'appManager.deploy.skipped' });
    } else if (event?.status === 'error') {
      description = event.message;
    } else if (event?.status === 'running' && event.detail) {
      description = formatMessage({ id: `appManager.deploy.detail.${event.detail}` });
    }
    return {
      title: formatMessage({ id: `appManager.deploy.step.${step}` }),
      status,
      description,
      icon: event?.status === 'running' ? <LoadingOutlined /> : undefined
    };
  });

  const failed = result && !result.ok;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Steps direction="vertical" size="small" items={items} />
      {result ? (
        <Alert type={result.ok ? 'success' : 'error'} showIcon message={formatMessage({ id: result.ok ? 'appManager.deploy.done' : 'appManager.deploy.failed' })} description={result.ok ? null : result.message} />
      ) : (
        <Text type="secondary">{formatMessage({ id: 'appManager.deploy.background' })}</Text>
      )}
      <DeployLog lines={logs} formatMessage={formatMessage} defaultOpen={!!failed} />
    </Space>
  );
};

export default DeployProgress;
