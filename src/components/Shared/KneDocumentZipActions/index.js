import { useState } from 'react';
import { App, Button, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { getToken } from '@kne/token-storage';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const buildQueryString = params => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const KneDocumentZipActions = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, type, buildRequestData, filterValue, onSuccess }) => {
    const [usePreset] = remoteModules;
    const { apis, ajax, staticUrl } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const apiGroup = type === 'worklog' ? apis.worklog : apis.experience;

    const handleExport = async () => {
      setExporting(true);
      try {
        const params = buildRequestData ? buildRequestData(filterValue || {}) : filterValue || {};
        const baseUrl = staticUrl || '';
        const url = `${baseUrl}${apiGroup.export.url}${buildQueryString(params)}`;
        const response = await fetch(url, {
          headers: {
            'X-User-Token': getToken('X-User-Token')
          }
        });
        if (!response.ok) {
          throw new Error(formatMessage({ id: 'shared.kneDocumentZip.exportFailed' }));
        }
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${type}-export-${Date.now()}.zip`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
        message.success(formatMessage({ id: 'shared.kneDocumentZip.exportSuccess' }));
      } catch (err) {
        message.error(err.message || formatMessage({ id: 'shared.kneDocumentZip.exportFailed' }));
      } finally {
        setExporting(false);
      }
    };

    const importZip = async (file, { skipIfExists }) => {
      setImporting(true);
      try {
        const query = buildQueryString({
          skipIfExists,
          overwrite: !skipIfExists
        });
        const { data: resData } = await ajax.postForm({
          url: `${apiGroup.import.url}${query}`,
          data: { file }
        });
        if (resData.code !== 0) {
          return;
        }
        const summary = resData.data?.summary || {};
        message.success(
          formatMessage(
            { id: 'shared.kneDocumentZip.importSuccess' },
            {
              created: summary.created || 0,
              updated: summary.updated || 0,
              skipped: summary.skipped || 0,
              failed: summary.failed || 0
            }
          )
        );
        onSuccess && onSuccess();
      } finally {
        setImporting(false);
      }
    };

    return (
      <>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
          {formatMessage({ id: 'shared.kneDocumentZip.export' })}
        </Button>
        <Upload
          accept=".zip,application/zip"
          showUploadList={false}
          beforeUpload={file => {
            importZip(file, { skipIfExists: false });
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} loading={importing}>
            {formatMessage({ id: 'shared.kneDocumentZip.import' })}
          </Button>
        </Upload>
        <Upload
          accept=".zip,application/zip"
          showUploadList={false}
          beforeUpload={file => {
            importZip(file, { skipIfExists: true });
            return false;
          }}
        >
          <Button loading={importing}>{formatMessage({ id: 'shared.kneDocumentZip.importSkipDuplicate' })}</Button>
        </Upload>
      </>
    );
  })
);

export default KneDocumentZipActions;
