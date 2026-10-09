import { useRef, useState } from 'react';
import { Alert, App, Button, Drawer, Input, Space, Tag, Typography } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import createAdminListCards from '@components/Shared/createAdminListCards';

const { Text } = Typography;
const renderAdminListCards = createAdminListCards();
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
  modules: ['components-core:Global@usePreset', 'components-thirdparty:CodeEditor', 'components-core:TablePage']
})(
  withLocale(({ remoteModules, data, versionId, version, onSuccess, children, ...props }) => {
    const [usePreset, CodeEditor, TablePage] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();
    const [open, setOpen] = useState(false);
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const tableRef = useRef(null);
    const appName = data?.name;

    const reload = () => tableRef.current?.reload?.();

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

    const openEditor = async item => {
      if (!item) {
        setEditor({ isNew: true, file: '', content: '', executed: false });
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
      setEditor({ isNew: false, file: item.name, content: resData.data.content || '', executed: !!item.executed });
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
        reload();
        onSuccess && onSuccess();
        setEditor(null);
      } finally {
        setSaving(false);
      }
    };

    const runAction = (item, action) => {
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

    const removeFile = item => {
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
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert type="info" showIcon message={formatMessage({ id: 'appManager.migration.sharedHint' })} />
              <TablePage
                {...Object.assign({}, apis.appManager.migrationList, {
                  params: { name: appName, versionId }
                })}
                ref={tableRef}
                name="app-manager-migrations"
                rowKey="name"
                controllerOpen={false}
                pagination={{ open: false }}
                renderMobile={renderAdminListCards}
                renderCard={renderAdminListCards}
                summary={({ data: listData }) => (listData?.dbError ? <Alert type="error" showIcon message={formatMessage({ id: 'appManager.migration.dbError' }, { error: listData.dbError })} /> : null)}
                buttonGroup={{
                  list: [
                    {
                      type: 'primary',
                      children: formatMessage({ id: 'appManager.migration.add' }),
                      onClick: () => openEditor(null)
                    },
                    {
                      children: formatMessage({ id: 'common.refresh' }),
                      onClick: reload
                    }
                  ]
                }}
                columns={listData => [
                  {
                    name: 'name',
                    title: formatMessage({ id: 'appManager.migration.file' }),
                    renderType: 'main',
                    getValueOf: item => item.name
                  },
                  {
                    name: 'status',
                    title: formatMessage({ id: 'appManager.migration.status' }),
                    render: (_, { dataSource }) => <MigrationStatus item={dataSource} formatMessage={formatMessage} />
                  },
                  {
                    name: 'updatedAt',
                    title: formatMessage({ id: 'appManager.migration.updatedAt' }),
                    getValueOf: item => formatTime(item.updatedAt)
                  },
                  {
                    name: 'options',
                    title: formatMessage({ id: 'appManager.version.actions' }),
                    renderType: 'options',
                    fixed: 'right',
                    getValueOf: item => {
                      const statusKnown = !listData?.dbError;
                      const list = [
                        {
                          type: 'link',
                          children: formatMessage({ id: 'common.edit' }),
                          onClick: () => openEditor(item)
                        }
                      ];
                      if (statusKnown && !item.executed) {
                        list.push(
                          {
                            type: 'link',
                            children: formatMessage({ id: 'appManager.migration.execute' }),
                            onClick: () => runAction(item, 'execute')
                          },
                          {
                            type: 'link',
                            children: formatMessage({ id: 'appManager.migration.mark' }),
                            onClick: () => runAction(item, 'mark')
                          }
                        );
                      }
                      if (statusKnown && item.executed) {
                        list.push({
                          type: 'link',
                          children: formatMessage({ id: 'appManager.migration.unmark' }),
                          onClick: () => runAction(item, 'unmark')
                        });
                      }
                      list.push({
                        type: 'link',
                        danger: true,
                        children: formatMessage({ id: 'common.delete' }),
                        onClick: () => removeFile(item)
                      });
                      return list;
                    }
                  }
                ]}
              />
            </Space>
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
