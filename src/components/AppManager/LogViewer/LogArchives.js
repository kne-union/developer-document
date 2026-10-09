import { useCallback, useMemo, useRef } from 'react';
import { App, Drawer, Space, Typography } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useIsMobile } from '@kne/responsive-utils';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import createAdminListCards from '@components/Shared/createAdminListCards';
import buildAuthUrl from '../utils/buildAuthUrl';

const { Text } = Typography;

const renderAdminListCards = createAdminListCards();

const formatSize = bytes => {
  const value = Number(bytes) || 0;
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`;
};

// 服务端已按 logTimezone 输出 ISO 时间，直接截取展示，避免被浏览器时区二次换算
const formatLogTime = value => (value ? String(value).replace('T', ' ').slice(0, 19) : '-');

const LogArchives = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:TablePage', 'components-core:Table']
})(
  withLocale(({ remoteModules, data, open, onClose, onView }) => {
    const [usePreset, TablePage, Table] = remoteModules;
    const { ajax, apis, staticUrl } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();
    const isMobile = useIsMobile();
    const tableRef = useRef(null);
    const pageListRef = useRef([]);
    const { selectedRows, getRowSelection, setSelectedRowKeys, clearSelectedRows } = Table.useSelectedRow({ rowKey: 'fileName' });
    const appName = data?.name;

    // 原生导航下载由浏览器流式落盘，大文件与打包下载都不会占用页面内存
    const download = useCallback(
      (api, params, fileName) => {
        const link = document.createElement('a');
        link.href = buildAuthUrl(staticUrl, api.url, Object.assign({ name: appName }, params));
        link.download = fileName || '';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      [appName, staticUrl]
    );

    const removeFiles = useCallback(
      files => {
        modal.confirm({
          title: formatMessage({ id: 'appManager.logs.removeConfirmTitle' }),
          content: formatMessage({ id: 'appManager.logs.removeConfirm' }, { count: files.length, files: files.join(', ') }),
          okButtonProps: { danger: true },
          onOk: async () => {
            const { data: resData } = await ajax(Object.assign({}, apis.appManager.logsRemove, { data: { name: appName, files } }));
            if (resData.code !== 0) {
              return;
            }
            message.success(formatMessage({ id: 'common.deleteSuccess' }));
            clearSelectedRows();
            tableRef.current?.reload?.();
          }
        });
      },
      [ajax, apis.appManager.logsRemove, appName, clearSelectedRows, formatMessage, message, modal]
    );

    const rowSelection = useMemo(() => {
      const base = getRowSelection(pageListRef.current);
      return Object.assign({}, base, {
        onChange: keys => {
          setSelectedRowKeys(keys, pageListRef.current);
        }
      });
    }, [getRowSelection, setSelectedRowKeys]);

    const batchActions = useMemo(
      () => [
        {
          key: 'download-zip',
          label: formatMessage({ id: 'appManager.logs.downloadSelected' }),
          onClick: ({ selectedRowKeys }) => {
            const files = (selectedRowKeys || []).filter(Boolean);
            if (!files.length) {
              return;
            }
            download(apis.appManager.logsDownloadZip, { files });
          }
        },
        {
          key: 'remove',
          label: formatMessage({ id: 'appManager.logs.removeSelected' }),
          danger: true,
          onClick: ({ selectedRowKeys }) => {
            const currentNames = new Set(pageListRef.current.filter(item => item.current).map(item => item.fileName));
            const files = (selectedRowKeys || []).filter(key => key && !currentNames.has(key));
            if (!files.length) {
              message.warning(formatMessage({ id: 'appManager.logs.currentNotRemovable' }));
              return;
            }
            removeFiles(files);
          }
        }
      ],
      [apis.appManager.logsDownloadZip, download, formatMessage, message, removeFiles]
    );

    const columns = useCallback(
      () => [
        {
          name: 'fileName',
          title: formatMessage({ id: 'appManager.logs.fileName' }),
          renderType: 'main',
          getValueOf: item => item.fileName
        },
        {
          name: 'current',
          title: formatMessage({ id: 'common.status' }),
          renderType: 'tag',
          getValueOf: item => (item.current ? { type: 'success', text: formatMessage({ id: 'appManager.logs.currentFile' }) } : null)
        },
        {
          name: 'stream',
          title: formatMessage({ id: 'appManager.logs.fileStream' }),
          renderType: 'tag',
          getValueOf: item => ({
            type: item.stream === 'err' ? 'danger' : 'info',
            text: formatMessage({ id: item.stream === 'err' ? 'appManager.logs.streamErr' : 'appManager.logs.streamOut' })
          })
        },
        {
          name: 'size',
          title: formatMessage({ id: 'appManager.logs.fileSize' }),
          getValueOf: item => formatSize(item.size)
        },
        {
          name: 'mtime',
          title: formatMessage({ id: 'appManager.logs.fileMtime' }),
          getValueOf: item => formatLogTime(item.mtime)
        },
        {
          name: 'options',
          title: formatMessage({ id: 'appManager.version.actions' }),
          renderType: 'options',
          fixed: 'right',
          getValueOf: item => {
            const list = [
              {
                type: 'link',
                children: formatMessage({ id: 'appManager.logs.viewFile' }),
                onClick: () => onView && onView(item)
              },
              {
                type: 'link',
                children: formatMessage({ id: 'appManager.logs.downloadFile' }),
                onClick: () => download(apis.appManager.logsDownload, { file: item.fileName }, `${appName}-${item.fileName}`)
              }
            ];
            if (!item.current) {
              list.push({
                type: 'link',
                danger: true,
                children: formatMessage({ id: 'common.delete' }),
                onClick: () => removeFiles([item.fileName])
              });
            }
            return list;
          }
        }
      ],
      [apis.appManager.logsDownload, appName, download, formatMessage, onView, removeFiles]
    );

    return (
      <Drawer title={formatMessage({ id: 'appManager.logs.archivesTitle' })} width={isMobile ? '100%' : 820} open={open} onClose={onClose} destroyOnClose afterOpenChange={visible => !visible && clearSelectedRows()}>
        {open && appName ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text type="secondary">{formatMessage({ id: 'appManager.logs.archivesHint' })}</Text>
            <TablePage
              {...Object.assign({}, apis.appManager.logsFiles, {
                params: { name: appName }
              })}
              ref={tableRef}
              name="app-manager-log-files"
              rowKey="fileName"
              controllerOpen={false}
              pagination={{ open: false }}
              dataFormat={resData => {
                const list = resData?.pageData || [];
                pageListRef.current = list;
                return { list, total: resData?.totalCount ?? list.length };
              }}
              rowSelection={rowSelection}
              selectedRows={selectedRows}
              batchActions={batchActions}
              renderMobile={renderAdminListCards}
              renderCard={renderAdminListCards}
              buttonGroup={{
                list: [
                  {
                    children: formatMessage({ id: 'common.refresh' }),
                    onClick: () => tableRef.current?.reload?.()
                  }
                ]
              }}
              columns={columns}
            />
          </Space>
        ) : null}
      </Drawer>
    );
  })
);

export default LogArchives;
