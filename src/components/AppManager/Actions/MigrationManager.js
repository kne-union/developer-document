import { useState } from 'react';
import { Alert, App, Button, Drawer, Empty, Input, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Fetch from '@kne/react-fetch';

const { Text } = Typography;
const SQL_FILE_NAME_RE = /^[A-Za-z0-9_\-.]+\.sql$/;

const formatTime = value => (value ? new Date(value).toLocaleString() : '-');

export const MigrationStatus = ({ item, formatMessage }) => {
  if (item.executed == null) {
    return <Tag>{formatMessage({ id: 'common.unknown' })}</Tag>;
  }
  if (!item.executed) {
    return <Tag color="orange">{formatMessage({ id: 'appManager.migration.pending' })}</Tag>;
  }
  return (
    <Space size={4}>
      <Tag color="green">{formatMessage({ id: 'appManager.migration.executed' })}</Tag>
      <Text type="secondary">{formatTime(item.executedAt)}</Text>
    </Space>
  );
};

const MigrationManager = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-thirdparty:CodeEditor']
})(
  withLocale(({ remoteModules, data, versionId, version, onSuccess, children, ...props }) => {
    const [usePreset, CodeEditor] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();
    const [open, setOpen] = useState(false);
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const appName = data?.name;

    const request = async (api, payload) => {
      const { data: resData } = await ajax(Object.assign({}, api, { data: Object.assign({ name: appName, versionId }, payload) }));
      return resData.code === 0 ? resData : null;
    };

    const confirmAction = ({ content, danger, onOk }) => {
      modal.confirm({
        title: formatMessage({ id: 'appManager.migration.confirmTitle' }),
        content,
        okButtonProps: danger ? { danger: true } : undefined,
        onOk
      });
    };

    const openEditor = async (item, reload) => {
      if (!item) {
        setEditor({ isNew: true, file: '', content: '', executed: false, reload });
        return;
      }
      const { data: resData } = await ajax(
        Object.assign({}, apis.appManager.migrationContent, {
          params: { name: appName, versionId, file: item.name }
        })
      );
      if (resData.code !== 0) {
        return;
      }
      setEditor({ isNew: false, file: item.name, content: resData.data.content || '', executed: !!item.executed, reload });
    };

    const saveEditor = async () => {
      const file = String(editor.file || '').trim();
      if (!SQL_FILE_NAME_RE.test(file) || file.includes('..')) {
        message.error(formatMessage({ id: 'appManager.migration.fileNameInvalid' }));
        return;
      }
      if (!String(editor.content || '').trim()) {
        message.error(formatMessage({ id: 'appManager.migration.contentEmpty' }));
        return;
      }
      setSaving(true);
      try {
        const res = await request(apis.appManager.migrationSave, { file, content: editor.content });
        if (!res) {
          return;
        }
        message.success(formatMessage({ id: 'common.saveSuccess' }));
        editor.reload && editor.reload();
        onSuccess && onSuccess();
        setEditor(null);
      } finally {
        setSaving(false);
      }
    };

    const runAction = (item, action, reload) => {
      confirmAction({
        content: formatMessage({ id: `appManager.migration.${action}Confirm` }, { file: item.name }),
        onOk: async () => {
          const res = await request(apis.appManager.migrationAction, { file: item.name, action });
          if (!res) {
            return;
          }
          message.success(formatMessage({ id: `appManager.migration.${action}Success` }));
          reload();
        }
      });
    };

    const removeFile = (item, reload) => {
      confirmAction({
        danger: true,
        content: formatMessage({ id: 'appManager.migration.removeConfirm' }, { file: item.name }),
        onOk: async () => {
          const res = await request(apis.appManager.migrationRemove, { file: item.name });
          if (!res) {
            return;
          }
          message.success(formatMessage({ id: 'appManager.migration.removeSuccess' }));
          reload();
          onSuccess && onSuccess();
        }
      });
    };

    return (
      <>
        <Button {...props} onClick={() => setOpen(true)}>
          {children}
        </Button>
        <Drawer title={formatMessage({ id: 'appManager.migration.drawerTitle' }, { version: version || '' })} width={860} open={open} onClose={() => setOpen(false)} destroyOnClose>
          {open ? (
            <Fetch
              {...Object.assign({}, apis.appManager.migrationList, {
                params: { name: appName, versionId }
              })}
              render={({ data: listData, reload }) => {
                const files = listData?.pageData || [];
                const statusKnown = !listData?.dbError;
                return (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Alert type="info" showIcon message={formatMessage({ id: 'appManager.migration.sharedHint' })} />
                    {listData?.dbError ? <Alert type="error" showIcon message={formatMessage({ id: 'appManager.migration.dbError' }, { error: listData.dbError })} /> : null}
                    <Space>
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openEditor(null, reload)}>
                        {formatMessage({ id: 'appManager.migration.add' })}
                      </Button>
                      <Button size="small" icon={<ReloadOutlined />} onClick={() => reload()}>
                        {formatMessage({ id: 'common.refresh' })}
                      </Button>
                    </Space>
                    {!files.length ? (
                      <Empty description={formatMessage({ id: 'appManager.migration.empty' })} />
                    ) : (
                      <Table
                        size="small"
                        rowKey="name"
                        pagination={false}
                        dataSource={files}
                        columns={[
                          {
                            title: formatMessage({ id: 'appManager.migration.file' }),
                            dataIndex: 'name'
                          },
                          {
                            title: formatMessage({ id: 'appManager.migration.status' }),
                            key: 'status',
                            render: (_, item) => <MigrationStatus item={item} formatMessage={formatMessage} />
                          },
                          {
                            title: formatMessage({ id: 'appManager.migration.updatedAt' }),
                            dataIndex: 'updatedAt',
                            render: value => formatTime(value)
                          },
                          {
                            title: formatMessage({ id: 'appManager.version.actions' }),
                            key: 'actions',
                            render: (_, item) => (
                              <Space size={0} wrap>
                                <Button type="link" size="small" onClick={() => openEditor(item, reload)}>
                                  {formatMessage({ id: 'common.edit' })}
                                </Button>
                                {statusKnown && !item.executed ? (
                                  <>
                                    <Button type="link" size="small" onClick={() => runAction(item, 'execute', reload)}>
                                      {formatMessage({ id: 'appManager.migration.execute' })}
                                    </Button>
                                    <Button type="link" size="small" onClick={() => runAction(item, 'mark', reload)}>
                                      {formatMessage({ id: 'appManager.migration.mark' })}
                                    </Button>
                                  </>
                                ) : null}
                                {statusKnown && item.executed ? (
                                  <Button type="link" size="small" onClick={() => runAction(item, 'unmark', reload)}>
                                    {formatMessage({ id: 'appManager.migration.unmark' })}
                                  </Button>
                                ) : null}
                                <Button type="link" size="small" danger onClick={() => removeFile(item, reload)}>
                                  {formatMessage({ id: 'common.delete' })}
                                </Button>
                              </Space>
                            )
                          }
                        ]}
                      />
                    )}
                  </Space>
                );
              }}
            />
          ) : null}
        </Drawer>
        <Drawer
          title={formatMessage({ id: editor?.isNew ? 'appManager.migration.addTitle' : 'appManager.migration.editTitle' })}
          width={820}
          open={!!editor}
          onClose={() => setEditor(null)}
          destroyOnClose
          footer={
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditor(null)}>{formatMessage({ id: 'common.cancel' })}</Button>
              <Button type="primary" loading={saving} onClick={saveEditor}>
                {formatMessage({ id: 'common.save' })}
              </Button>
            </Space>
          }
        >
          {editor ? (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {editor.executed ? <Alert type="warning" showIcon message={formatMessage({ id: 'appManager.migration.editExecutedHint' })} /> : null}
              <Input
                addonBefore={formatMessage({ id: 'appManager.migration.file' })}
                value={editor.file}
                disabled={!editor.isNew}
                placeholder={formatMessage({ id: 'appManager.migration.fileNamePlaceholder' })}
                onChange={e => setEditor(prev => Object.assign({}, prev, { file: e.target.value }))}
              />
              <CodeEditor
                height={420}
                defaultLanguage="sql"
                value={editor.content}
                onChange={value => setEditor(prev => Object.assign({}, prev, { content: value == null ? '' : String(value) }))}
                options={{
                  fontSize: 13,
                  wordWrap: 'on',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </Space>
          ) : null}
        </Drawer>
      </>
    );
  })
);

export default MigrationManager;
