import { useCallback, useEffect, useRef } from 'react';
import { App } from 'antd';
import { UploadOutlined, SnippetsOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import createAdminListCards from '@components/Shared/createAdminListCards';

const SECRET_MASK = '********';
const renderAdminListCards = createAdminListCards();

const toRows = (env, secretEnvKeys) => {
  const secretSet = new Set(secretEnvKeys || []);
  return Object.entries(env || {}).map(([key, value]) => ({
    key,
    value: value == null ? '' : String(value),
    secret: secretSet.has(key)
  }));
};

/** 解析 .env 文本为 { KEY: value }；忽略空行与 # 注释，支持 export 前缀与引号包裹 */
const parseEnvText = text => {
  const env = {};
  String(text || '')
    .split(/\r?\n/)
    .forEach(line => {
      let raw = line.trim();
      if (!raw || raw.startsWith('#')) {
        return;
      }
      if (raw.toLowerCase().startsWith('export ')) {
        raw = raw.slice(7).trim();
      }
      const eq = raw.indexOf('=');
      if (eq <= 0) {
        return;
      }
      const key = raw.slice(0, eq).trim();
      if (!key || /\s/.test(key)) {
        return;
      }
      let value = raw.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"') && value.length >= 2) || (value.startsWith("'") && value.endsWith("'") && value.length >= 2)) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
  return env;
};

const resolveKeyword = requestData => {
  const raw = requestData?.keyword;
  if (raw == null) {
    return '';
  }
  if (typeof raw === 'object') {
    return String(raw.value ?? raw.label ?? '')
      .trim()
      .toLowerCase();
  }
  return String(raw).trim().toLowerCase();
};

const EnvEditor = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:TablePage', 'components-core:FormInfo']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [usePreset, TablePage, FormInfo] = remoteModules;
    const { ajax, apis } = usePreset();
    const { useFormModal, TableList } = FormInfo;
    const { Input, Switch } = FormInfo.fields;
    const formModal = useFormModal();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();
    const fileInputRef = useRef(null);
    const tableRef = useRef(null);
    const dataRef = useRef(data);
    dataRef.current = data;

    const saveEnv = async (env, nextSecretKeys) => {
      const payload = { name: dataRef.current.name, env };
      if (nextSecretKeys !== undefined) {
        payload.secretEnvKeys = nextSecretKeys;
      }
      const { data: resData } = await ajax(
        Object.assign({}, apis.appManager.saveEnv, {
          data: payload
        })
      );
      return resData;
    };

    const handleSuccess = useCallback(() => {
      onSuccess && onSuccess();
    }, [onSuccess]);

    useEffect(() => {
      tableRef.current?.reload?.();
    }, [data?.env, data?.secretEnvKeys]);

    const confirmImportEnv = (env, sourceLabel) => {
      const keys = Object.keys(env);
      if (!keys.length) {
        message.error(formatMessage({ id: 'appManager.env.uploadEmpty' }));
        return;
      }
      modal.confirm({
        title: formatMessage({ id: 'appManager.env.uploadConfirmTitle' }),
        content: formatMessage({ id: 'appManager.env.uploadConfirmContent' }, { count: keys.length, fileName: sourceLabel }),
        onOk: async () => {
          const resData = await saveEnv(env);
          if (resData.code !== 0) {
            return Promise.reject();
          }
          message.success(formatMessage({ id: 'appManager.env.uploadSuccess' }, { count: keys.length }));
          handleSuccess();
        }
      });
    };

    const handleUploadEnvFile = async event => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      let text;
      try {
        text = await file.text();
      } catch (e) {
        message.error(formatMessage({ id: 'appManager.env.uploadReadFailed' }));
        return;
      }
      confirmImportEnv(parseEnvText(text), file.name);
    };

    const handlePasteFromClipboard = async () => {
      let text;
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        message.error(formatMessage({ id: 'appManager.env.pasteFailed' }));
        return;
      }
      if (!String(text || '').trim()) {
        message.error(formatMessage({ id: 'appManager.env.pasteEmpty' }));
        return;
      }
      const env = parseEnvText(text);
      const keys = Object.keys(env);
      if (!keys.length) {
        message.error(formatMessage({ id: 'appManager.env.uploadEmpty' }));
        return;
      }
      // 剪贴板：先预览编辑，提交后再二次 confirm 才真正写入
      formModal({
        title: formatMessage({ id: 'appManager.env.paste' }),
        size: 'small',
        formProps: {
          data: {
            args: keys.map(key => ({
              key,
              value: env[key],
              secret: (dataRef.current?.secretEnvKeys || []).includes(key)
            }))
          },
          onSubmit: async formData => {
            const nextEnv = {};
            const nextSecrets = new Set(dataRef.current?.secretEnvKeys || []);
            for (const row of formData.args || []) {
              const key = (row.key || '').trim();
              if (!key) {
                message.error(formatMessage({ id: 'appManager.env.keyRequired' }));
                return false;
              }
              nextEnv[key] = row.value == null ? '' : String(row.value);
              if (row.secret) {
                nextSecrets.add(key);
              } else {
                nextSecrets.delete(key);
              }
            }
            if (!Object.keys(nextEnv).length) {
              message.error(formatMessage({ id: 'appManager.env.keyRequired' }));
              return false;
            }
            // 二次确认后再写入
            return new Promise(resolve => {
              modal.confirm({
                title: formatMessage({ id: 'appManager.env.uploadConfirmTitle' }),
                content: formatMessage({ id: 'appManager.env.pasteConfirmContent' }, { count: Object.keys(nextEnv).length }),
                onOk: async () => {
                  const resData = await saveEnv(nextEnv, [...nextSecrets]);
                  if (resData.code !== 0) {
                    resolve(false);
                    return Promise.reject();
                  }
                  message.success(formatMessage({ id: 'appManager.env.uploadSuccess' }, { count: Object.keys(nextEnv).length }));
                  handleSuccess();
                  resolve(true);
                },
                onCancel: () => resolve(false)
              });
            });
          }
        },
        children: (
          <TableList
            title={formatMessage({ id: 'appManager.tabs.env' })}
            name="args"
            minLength={1}
            column={1}
            list={[
              <Input name="key" label={formatMessage({ id: 'appManager.env.key' })} rule="REQ LEN-1-100" />,
              <Input name="value" label={formatMessage({ id: 'appManager.env.value' })} rule="LEN-0-2000" />,
              <Switch name="secret" label={formatMessage({ id: 'appManager.env.secret' })} />
            ]}
          />
        )
      });
    };

    const openAddModal = () => {
      formModal({
        title: formatMessage({ id: 'appManager.env.add' }),
        size: 'small',
        children: (
          <TableList
            title={formatMessage({ id: 'appManager.tabs.env' })}
            name="args"
            minLength={1}
            column={1}
            list={[
              <Input name="key" label={formatMessage({ id: 'appManager.env.key' })} rule="REQ LEN-1-100" />,
              <Input name="value" label={formatMessage({ id: 'appManager.env.value' })} rule="LEN-0-2000" />,
              <Switch name="secret" label={formatMessage({ id: 'appManager.env.secret' })} />
            ]}
          />
        ),
        formProps: {
          onSubmit: async formData => {
            const env = {};
            const nextSecrets = new Set(dataRef.current?.secretEnvKeys || []);
            for (const row of formData.args || []) {
              const key = (row.key || '').trim();
              if (!key) {
                message.error(formatMessage({ id: 'appManager.env.keyRequired' }));
                return false;
              }
              env[key] = row.value == null ? '' : String(row.value);
              if (row.secret) {
                nextSecrets.add(key);
              }
            }
            if (!Object.keys(env).length) {
              message.error(formatMessage({ id: 'appManager.env.keyRequired' }));
              return false;
            }
            const resData = await saveEnv(env, [...nextSecrets]);
            if (resData.code !== 0) {
              return false;
            }
            message.success(formatMessage({ id: 'common.saveSuccess' }));
            handleSuccess();
          }
        }
      });
    };

    const columns = useCallback(
      () => [
        {
          name: 'key',
          title: formatMessage({ id: 'appManager.env.key' }),
          renderType: 'main'
        },
        {
          name: 'secret',
          title: formatMessage({ id: 'appManager.env.type' }),
          width: 100,
          renderType: 'tag',
          getValueOf: item => (item.secret ? { type: 'warning', text: formatMessage({ id: 'appManager.env.typeSecret' }) } : { type: 'default', text: formatMessage({ id: 'appManager.env.typeNormal' }) })
        },
        {
          name: 'value',
          title: formatMessage({ id: 'appManager.env.value' }),
          renderType: 'description',
          getValueOf: item => (item.secret && item.value ? SECRET_MASK : item.value || '')
        },
        {
          name: 'options',
          renderType: 'options',
          title: formatMessage({ id: 'appManager.version.actions' }),
          fixed: 'right',
          getValueOf: item => {
            const secretEnvKeys = dataRef.current?.secretEnvKeys || [];
            const list = [];
            if (!item.secret) {
              list.push({
                children: formatMessage({ id: 'appManager.env.markSecret' }),
                confirm: true,
                message: formatMessage({ id: 'appManager.env.markSecretConfirm' }, { key: item.key }),
                onClick: async () => {
                  const nextSecrets = [...new Set([...secretEnvKeys, item.key])];
                  const resData = await saveEnv({}, nextSecrets);
                  if (resData.code !== 0) {
                    return;
                  }
                  message.success(formatMessage({ id: 'appManager.env.markSecretSuccess' }));
                  handleSuccess();
                }
              });
            }
            list.push({
              children: formatMessage({ id: 'common.delete' }),
              confirm: true,
              onClick: async () => {
                const nextSecrets = secretEnvKeys.filter(key => key !== item.key);
                const resData = await saveEnv({ [item.key]: null }, nextSecrets);
                if (resData.code !== 0) {
                  return;
                }
                message.success(formatMessage({ id: 'common.deleteSuccess' }));
                handleSuccess();
              }
            });
            return list;
          }
        }
      ],
      [formatMessage, handleSuccess, message]
    );

    return (
      <>
        <input ref={fileInputRef} type="file" accept=".env,text/plain" style={{ display: 'none' }} onChange={handleUploadEnvFile} />
        <TablePage
          ref={tableRef}
          name="app-manager-env"
          rowKey="key"
          controllerOpen={false}
          pagination={{ open: false }}
          renderMobile={renderAdminListCards}
          renderCard={renderAdminListCards}
          search={{
            name: 'keyword',
            label: formatMessage({ id: 'common.keyword' }),
            placeholder: formatMessage({ id: 'appManager.env.searchPlaceholder' })
          }}
          buttonGroup={{
            list: [
              {
                type: 'primary',
                children: formatMessage({ id: 'appManager.env.add' }),
                onClick: openAddModal
              },
              {
                children: formatMessage({ id: 'appManager.env.paste' }),
                icon: <SnippetsOutlined />,
                onClick: handlePasteFromClipboard
              },
              {
                children: formatMessage({ id: 'appManager.env.upload' }),
                icon: <UploadOutlined />,
                onClick: () => {
                  fileInputRef.current && fileInputRef.current.click();
                }
              }
            ]
          }}
          loader={async ({ data: requestData } = {}) => {
            const current = dataRef.current || {};
            let list = toRows(current.env, current.secretEnvKeys || []);
            const keyword = resolveKeyword(requestData);
            if (keyword) {
              list = list.filter(
                row =>
                  row.key.toLowerCase().includes(keyword) ||
                  String(row.value || '')
                    .toLowerCase()
                    .includes(keyword)
              );
            }
            return {
              pageData: list,
              totalCount: list.length
            };
          }}
          columns={columns}
        />
      </>
    );
  })
);

export default EnvEditor;
