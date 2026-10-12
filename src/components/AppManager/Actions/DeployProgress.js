import { useEffect, useRef, useState } from 'react';
import { Alert, Space, Steps, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import buildAuthUrl from '../utils/buildAuthUrl';

const { Text } = Typography;

const STEPS = ['package', 'env', 'migrate', 'start', 'ready'];

const STEP_STATUS = { running: 'process', done: 'finish', skipped: 'finish', error: 'error' };

const createProgressId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const isFinal = event => event.status === 'error' || (event.step === 'ready' && event.status === 'done');

const DeployProgress = ({ ajax, apis, staticUrl, payload, formatMessage, onDeployed, onFinish }) => {
  const [events, setEvents] = useState({});
  const [result, setResult] = useState(null);
  const startedRef = useRef(false);
  const progressIdRef = useRef(null);
  if (!progressIdRef.current) {
    progressIdRef.current = createProgressId();
  }
  const callbacksRef = useRef({ onDeployed, onFinish });
  callbacksRef.current = { onDeployed, onFinish };

  useEffect(() => {
    const progressId = progressIdRef.current;
    const source = new EventSource(buildAuthUrl(staticUrl, apis.appManager.deployStream.url, { name: payload.name, progressId }));
    let finished = false;

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
      }
      setResult(next);
      callbacksRef.current.onFinish && callbacksRef.current.onFinish(next);
    };

    const handle = event => {
      setEvents(prev => Object.assign({}, prev, { [event.step]: event }));
      if (isFinal(event)) {
        finish(event.status === 'error' ? { ok: false, message: event.message } : { ok: true });
      }
    };

    const deploy = async () => {
      if (startedRef.current) {
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
      try {
        (JSON.parse(event.data).events || []).forEach(handle);
      } catch (e) {
        // ignore malformed
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
    source.onerror = () => {
      if (!startedRef.current) {
        deploy();
      }
    };
    return () => {
      finished = true;
      source.close();
    };
  }, [ajax, apis, staticUrl, payload]);

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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Steps direction="vertical" size="small" items={items} />
      {result ? (
        <Alert type={result.ok ? 'success' : 'error'} showIcon message={formatMessage({ id: result.ok ? 'appManager.deploy.done' : 'appManager.deploy.failed' })} description={result.ok ? null : result.message} />
      ) : (
        <Text type="secondary">{formatMessage({ id: 'appManager.deploy.background' })}</Text>
      )}
    </Space>
  );
};

export default DeployProgress;
