import { useState } from 'react';
import { Alert, App, Button, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import style from './style.module.scss';

const { Text } = Typography;

const BOOLEAN_KEYS = ['autorestart', 'merge_logs'];
const NUMBER_KEYS = ['instances', 'max_restarts', 'kill_timeout'];
const PM2_KEYS = ['exec_mode', 'instances', 'autorestart', 'max_memory_restart', 'max_restarts', 'min_uptime', 'kill_timeout', 'merge_logs'];

const isEmpty = value => value === undefined || value === null || value === '';

/** 实例数只在集群模式下有意义：单进程模式多实例会争用同一端口 */
const isCluster = (execMode, defaults = {}) => (isEmpty(execMode) ? defaults.exec_mode : execMode) === 'cluster';

const Pm2Fields = ({ FormInfo, initialExecMode, pm2Defaults, placeholder, t }) => {
  const { Input, InputNumber, Select } = FormInfo.fields;
  const [execMode, setExecMode] = useState(initialExecMode);
  const switchOptions = [
    { label: t('on'), value: 'on' },
    { label: t('off'), value: 'off' }
  ];
  return (
    <FormInfo
      column={1}
      list={[
        <Select
          name="exec_mode"
          label={t('field.exec_mode')}
          allowClear
          placeholder={placeholder('exec_mode')}
          onChange={setExecMode}
          options={[
            { label: t('execMode.fork'), value: 'fork' },
            { label: t('execMode.cluster'), value: 'cluster' }
          ]}
        />,
        isCluster(execMode, pm2Defaults) && <InputNumber name="instances" label={t('field.instances')} min={1} max={32} placeholder={placeholder('instances')} />,
        <Select name="autorestart" label={t('field.autorestart')} allowClear placeholder={placeholder('autorestart')} options={switchOptions} />,
        <Input name="max_memory_restart" label={t('field.max_memory_restart')} placeholder={placeholder('max_memory_restart')} />,
        <InputNumber name="max_restarts" label={t('field.max_restarts')} min={0} max={1000} placeholder={placeholder('max_restarts')} />,
        <Input name="min_uptime" label={t('field.min_uptime')} placeholder={placeholder('min_uptime')} />,
        <InputNumber name="kill_timeout" label={t('field.kill_timeout')} min={0} max={600000} placeholder={placeholder('kill_timeout')} />,
        <Select name="merge_logs" label={t('field.merge_logs')} allowClear placeholder={placeholder('merge_logs')} options={switchOptions} />
      ].filter(Boolean)}
    />
  );
};

/** 表单值 → pm2Config：留空的项不提交，进程启动时用应用中心默认值 */
const toPm2Config = formData => {
  const config = {};
  PM2_KEYS.forEach(key => {
    const value = formData[key];
    if (isEmpty(value)) {
      return;
    }
    if (BOOLEAN_KEYS.includes(key)) {
      config[key] = value === 'on';
    } else if (NUMBER_KEYS.includes(key)) {
      config[key] = Number(value);
    } else {
      config[key] = typeof value === 'string' ? value.trim() : value;
    }
  });
  return config;
};

/** 表单回填：未设置的项用默认值填充 */
const toFormData = (pm2Config = {}, pm2Defaults = {}) => {
  const data = {};
  PM2_KEYS.forEach(key => {
    const value = isEmpty(pm2Config[key]) ? pm2Defaults[key] : pm2Config[key];
    if (isEmpty(value)) {
      return;
    }
    data[key] = BOOLEAN_KEYS.includes(key) ? (value ? 'on' : 'off') : value;
  });
  return data;
};

const Settings = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:FormInfo']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [usePreset, FormInfo] = remoteModules;
    const { ajax, apis } = usePreset();
    const formModal = FormInfo.useFormModal();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const pm2Config = data.pm2Config || {};
    const pm2Defaults = data.pm2Defaults || {};
    const t = id => formatMessage({ id: `appManager.settings.${id}` });

    const displayValue = (key, value) => {
      if (BOOLEAN_KEYS.includes(key)) {
        return value ? t('on') : t('off');
      }
      if (key === 'exec_mode') {
        return t(`execMode.${value}`);
      }
      if (key === 'kill_timeout') {
        return `${value} ms`;
      }
      return String(value);
    };

    const formatValue = key => {
      const value = pm2Config[key];
      if (!isEmpty(value)) {
        return displayValue(key, value);
      }
      if (isEmpty(pm2Defaults[key])) {
        return <Text type="secondary">{t('default')}</Text>;
      }
      return (
        <>
          {displayValue(key, pm2Defaults[key])} <Text type="secondary">（{t('default')}）</Text>
        </>
      );
    };

    const placeholder = key => (isEmpty(pm2Defaults[key]) ? t('default') : formatMessage({ id: 'appManager.settings.defaultValue' }, { value: displayValue(key, pm2Defaults[key]) }));

    const openEditModal = () => {
      formModal({
        title: t('edit'),
        size: 'small',
        formProps: {
          data: toFormData(pm2Config, pm2Defaults),
          onSubmit: async formData => {
            const nextConfig = toPm2Config(formData);
            if (!isCluster(nextConfig.exec_mode, pm2Defaults)) {
              delete nextConfig.instances;
            }
            Object.keys(nextConfig).forEach(key => {
              if (nextConfig[key] === pm2Defaults[key]) {
                delete nextConfig[key];
              }
            });
            if (nextConfig.max_memory_restart && !/^\d+[KMG]$/i.test(nextConfig.max_memory_restart)) {
              message.error(t('maxMemoryRestartInvalid'));
              return false;
            }
            if (nextConfig.min_uptime && !/^\d+(ms|s|m|h)?$/.test(nextConfig.min_uptime)) {
              message.error(t('minUptimeInvalid'));
              return false;
            }
            const { data: resData } = await ajax(Object.assign({}, apis.appManager.save, { data: { name: data.name, pm2Config: nextConfig } }));
            if (resData.code !== 0) {
              return false;
            }
            message.success(t('saveSuccess'));
            onSuccess && onSuccess();
          }
        },
        children: <Pm2Fields FormInfo={FormInfo} initialExecMode={isEmpty(pm2Config.exec_mode) ? pm2Defaults.exec_mode : pm2Config.exec_mode} pm2Defaults={pm2Defaults} placeholder={placeholder} t={t} />
      });
    };

    return (
      <div className={style['overview']}>
        <Alert showIcon type="info" message={t('hint')} />
        <section className={style['detail-card']}>
          <div className={style['detail-card-header']}>
            <div className={style['detail-card-title']}>{t('sectionPm2')}</div>
            <Button size="small" icon={<EditOutlined />} onClick={openEditModal}>
              {formatMessage({ id: 'common.edit' })}
            </Button>
          </div>
          <div className={style['field-list']}>
            {PM2_KEYS.filter(key => key !== 'instances' || isCluster(pm2Config.exec_mode, pm2Defaults)).map(key => (
              <div key={key} className={style['field-row']}>
                <Text type="secondary" className={style['field-label']}>
                  {t(`field.${key}`)}
                </Text>
                <div className={style['field-value']}>{formatValue(key)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  })
);

export default Settings;
