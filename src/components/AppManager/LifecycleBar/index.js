import { useCallback, useState } from 'react';
import classnames from 'classnames';
import { App, Button, Flex, Typography } from 'antd';
import { CaretRightOutlined, PauseOutlined, ReloadOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import style from './style.module.scss';

const { Text } = Typography;

const LifecycleBar = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, className }) => {
    const [usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [pending, setPending] = useState(null);

    const status = data?.status || 'idle';
    const canStart = status === 'stopped' || status === 'idle' || status === 'error';
    const canStop = status === 'running' || status === 'deploying';
    const canRestart = canStop;
    const busy = pending != null;

    const runAction = useCallback(
      async (actionKey, successId) => {
        if (!data?.name || busy) {
          return;
        }
        setPending(actionKey);
        try {
          const { data: resData } = await ajax(
            Object.assign({}, apis.appManager[actionKey], {
              data: { name: data.name }
            })
          );
          if (resData.code !== 0) {
            return;
          }
          message.success(formatMessage({ id: successId }));
          onSuccess && onSuccess();
        } finally {
          setPending(null);
        }
      },
      [ajax, apis.appManager, busy, data?.name, formatMessage, message, onSuccess]
    );

    if (!data?.name) {
      return null;
    }

    const statusLabel = formatMessage({ id: `appManager.status.${status}`, defaultMessage: status });

    return (
      <div className={classnames(style['lifecycle-panel'], style[`tone-${status}`], className)} role="group" aria-label={formatMessage({ id: 'appManager.lifecycle.groupLabel' })}>
        <Flex className={style['lifecycle-inner']} align="center" justify="space-between" gap={16} wrap="wrap">
          <Flex align="center" gap={10} className={style['lifecycle-status']}>
            <span className={style['status-orb']} aria-hidden />
            <div className={style['status-copy']}>
              <Text className={style['status-label']}>{statusLabel}</Text>
              <Text className={style['status-hint']}>{formatMessage({ id: 'appManager.lifecycle.groupLabel' })}</Text>
            </div>
          </Flex>

          <Flex align="center" gap={8} wrap="wrap" className={style['lifecycle-actions']}>
            {canStart ? (
              <Button type="primary" className={style['btn']} icon={<CaretRightOutlined />} loading={pending === 'start'} disabled={busy && pending !== 'start'} onClick={() => runAction('start', 'appManager.actions.startSuccess')}>
                {formatMessage({ id: 'appManager.actions.run' })}
              </Button>
            ) : null}
            {canStop ? (
              <Button
                type="default"
                className={classnames(style['btn'], style['btn-pause'])}
                icon={<PauseOutlined />}
                loading={pending === 'stop'}
                disabled={busy && pending !== 'stop'}
                onClick={() => runAction('stop', 'appManager.actions.stopSuccess')}
              >
                {formatMessage({ id: 'appManager.actions.pause' })}
              </Button>
            ) : null}
            <Button
              type="default"
              className={classnames(style['btn'], style['btn-restart'])}
              icon={<ReloadOutlined />}
              loading={pending === 'restart'}
              disabled={!canRestart || (busy && pending !== 'restart')}
              title={!canRestart ? formatMessage({ id: 'appManager.lifecycle.restartDisabled' }) : undefined}
              onClick={() => runAction('restart', 'appManager.actions.restartSuccess')}
            >
              {formatMessage({ id: 'appManager.actions.restart' })}
            </Button>
          </Flex>
        </Flex>
      </div>
    );
  })
);

export default LifecycleBar;
