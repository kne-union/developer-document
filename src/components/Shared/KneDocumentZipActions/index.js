import { useRef, useState } from 'react';
import { App, Button } from 'antd';
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

const ExportZipButton = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, type, getFilterValue, buildRequestData, children, ...props }) => {
    const [usePreset] = remoteModules;
    const { apis, staticUrl } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [exporting, setExporting] = useState(false);
    const apiGroup = type === 'worklog' ? apis.worklog : apis.experience;

    const handleExport = async () => {
      setExporting(true);
      try {
        const rawFilterValue = (typeof getFilterValue === 'function' ? getFilterValue() : {}) || {};
        const params = buildRequestData ? buildRequestData(rawFilterValue) : rawFilterValue;
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

    return (
      <Button {...props} icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
        {children}
      </Button>
    );
  })
);

const ImportZipButton = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, type, onSuccess, children, ...props }) => {
    const [usePreset] = remoteModules;
    const { apis, ajax } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [importing, setImporting] = useState(false);
    const inputRef = useRef(null);
    const apiGroup = type === 'worklog' ? apis.worklog : apis.experience;

    const importZip = async file => {
      setImporting(true);
      try {
        const query = buildQueryString({
          skipIfExists: false,
          overwrite: true
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
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              importZip(file);
            }
          }}
        />
        <Button {...props} icon={<UploadOutlined />} loading={importing} onClick={() => inputRef.current?.click()}>
          {children}
        </Button>
      </>
    );
  })
);

export const getKneDocumentZipButtonGroupList = ({ type, getFilterValue, buildRequestData, onSuccess, formatMessage }) => [
  {
    buttonComponent: ExportZipButton,
    type,
    getFilterValue,
    buildRequestData,
    children: formatMessage({ id: 'shared.kneDocumentZip.export' })
  },
  {
    buttonComponent: ImportZipButton,
    type,
    onSuccess,
    children: formatMessage({ id: 'shared.kneDocumentZip.import' })
  }
];

export default getKneDocumentZipButtonGroupList;
