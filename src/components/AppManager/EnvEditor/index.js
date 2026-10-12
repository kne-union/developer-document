import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App } from 'antd';
import { UploadOutlined, SnippetsOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import createAdminListCards from '@components/Shared/createAdminListCards';

const SECRET_MASK = '********';
const renderAdminListCards = createAdminListCards();

/** 声明的变量在前（schema 顺序），其后为已配置但未声明的变量；均不含应用中心注入的变量 */
const toRows = declaration => [
  ...(declaration?.declared || []).map(item => Object.assign({}, item, { source: 'declared', value: item.value == null ? '' : String(item.value) })),
  ...(declaration?.others || []).map(item => Object.assign({}, item, { source: 'other', configured: true, value: item.value == null ? '' : String(item.value) }))
];

const formatDefault = value => (value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value));

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
    const [declaration, setDeclaration] = useState(null);

    const saveEnv = useCallback(
      async (env, nextSecretKeys) => {
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
      },
      [ajax, apis.appManager.saveEnv]
    );

    const handleSuccess = useCallback(() => {
      onSuccess && onSuccess();
    }, [onSuccess]);

    useEffect(() => {
      tableRef.current?.reload?.();
    }, [data?.env, data?.secretEnvKeys, data?.currentVersionId]);

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
            const submittedKeys = (formData.args || []).map(row => (row.key || '').trim());
            const existingKeys = Object.keys(dataRef.current?.env || {});
            const duplicated = [...new Set(submittedKeys.filter((key, index) => existingKeys.includes(key) || submittedKeys.indexOf(key) !== index))];
            if (duplicated.length) {
              message.error(formatMessage({ id: 'appManager.env.keyExists' }, { keys: duplicated.join(', ') }));
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

    const openEditModal = useCallback(
      item => {
        formModal({
          title: formatMessage({ id: 'appManager.env.edit' }),
          size: 'small',
          formProps: {
            data: { key: item.key, value: item.value, secret: item.secret },
            onSubmit: async formData => {
              const secretEnvKeys = dataRef.current?.secretEnvKeys || [];
              const nextSecrets = formData.secret ? [...new Set([...secretEnvKeys, item.key])] : secretEnvKeys;
              const value = formData.value == null ? '' : String(formData.value);
              // 密钥值保持掩码即未改动，不提交该值，服务端沿用原值
              const env = item.secret && value === SECRET_MASK ? {} : { [item.key]: value };
              const resData = await saveEnv(env, nextSecrets);
              if (resData.code !== 0) {
                return false;
              }
              message.success(formatMessage({ id: 'common.saveSuccess' }));
              handleSuccess();
            }
          },
          children: (
            <>
              <Input name="key" label={formatMessage({ id: 'appManager.env.key' })} disabled block />
              <Input name="value" label={formatMessage({ id: 'appManager.env.value' })} rule="LEN-0-2000" block />
              <Switch name="secret" label={formatMessage({ id: 'appManager.env.secret' })} disabled={item.secret} />
            </>
          )
        });
      },
      [formModal, formatMessage, handleSuccess, message, saveEnv]
    );

    const columns = useCallback(
      () => [
        {
          name: 'key',
          title: formatMessage({ id: 'appManager.env.key' }),
          renderType: 'main'
        },
        {
          name: 'source',
          title: formatMessage({ id: 'appManager.env.source' }),
          width: 110,
          renderType: 'tag',
          getValueOf: item => {
            if (item.source === 'other') {
              return { type: 'default', text: formatMessage({ id: 'appManager.env.sourceOther' }) };
            }
            return item.required ? { type: 'warning', text: formatMessage({ id: 'appManager.env.sourceRequired' }) } : { type: 'info', text: formatMessage({ id: 'appManager.env.sourceDeclared' }) };
          }
        },
        {
          name: 'status',
          title: formatMessage({ id: 'appManager.env.status' }),
          width: 140,
          renderType: 'tag',
          getValueOf: item => {
            if (item.error) {
              return { type: 'danger', text: item.error };
            }
            if (item.configured) {
              return { type: 'success', text: formatMessage({ id: 'appManager.env.statusConfigured' }) };
            }
            if (item.default != null) {
              return { type: 'default', text: formatMessage({ id: 'appManager.env.statusDefault' }) };
            }
            return { type: 'default', text: formatMessage({ id: 'appManager.env.statusEmpty' }) };
          }
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
          getValueOf: item => {
            if (item.configured) {
              return item.secret && item.value ? SECRET_MASK : item.value || '';
            }
            return item.default != null ? formatMessage({ id: 'appManager.env.defaultValue' }, { value: formatDefault(item.default) }) : '';
          }
        },
        {
          name: 'description',
          title: formatMessage({ id: 'appManager.env.description' }),
          renderType: 'description',
          getValueOf: item => item.description || ''
        },
        {
          name: 'options',
          renderType: 'options',
          title: formatMessage({ id: 'appManager.version.actions' }),
          fixed: 'right',
          getValueOf: item => {
            const secretEnvKeys = dataRef.current?.secretEnvKeys || [];
            const list = [
              {
                children: formatMessage({ id: 'common.edit' }),
                onClick: () => openEditModal(item)
              }
            ];
            if (!item.configured) {
              return list;
            }
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
      [formatMessage, handleSuccess, message, openEditModal, saveEnv]
    );

    const renderSummary = () => {
      if (!declaration) {
        return null;
      }
      const alertProps = { showIcon: true, style: { marginBottom: 16 } };
      if (!declaration.versionId) {
        return <Alert {...alertProps} type="info" message={formatMessage({ id: 'appManager.env.noVersion' })} />;
      }
      if (!declaration.hasSchema) {
        return <Alert {...alertProps} type="warning" message={formatMessage({ id: 'appManager.env.noSchema' }, { version: declaration.version })} />;
      }
      if (!declaration.valid) {
        const count = (declaration.declared || []).filter(item => item.error).length;
        return <Alert {...alertProps} type="error" message={formatMessage({ id: 'appManager.env.invalid' }, { version: declaration.version, count })} />;
      }
      return <Alert {...alertProps} type="success" message={formatMessage({ id: 'appManager.env.valid' }, { version: declaration.version })} />;
    };

    return (
      <>
        <input ref={fileInputRef} type="file" accept=".env,text/plain" style={{ display: 'none' }} onChange={handleUploadEnvFile} />
        {renderSummary()}
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
            const { data: resData } = await ajax(Object.assign({}, apis.appManager.envSchema, { params: { name: dataRef.current?.name } }));
            const nextDeclaration = resData.code === 0 ? resData.data : null;
            setDeclaration(nextDeclaration);
            let list = toRows(nextDeclaration);
            const keyword = resolveKeyword(requestData);
            if (keyword) {
              list = list.filter(row =>
                [row.key, row.value, row.description].some(text =>
                  String(text || '')
                    .toLowerCase()
                    .includes(keyword)
                )
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
