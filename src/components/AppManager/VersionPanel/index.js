import { useCallback, useRef } from 'react';
import { Tag } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import UploadVersion from '../Actions/UploadVersion';
import Deploy from '../Actions/Deploy';
import createAdminListCards from '@components/Shared/createAdminListCards';

const renderAdminListCards = createAdminListCards();

const VersionPanel = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:TablePage']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [usePreset, TablePage] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const tableRef = useRef(null);

    const handleReload = useCallback(() => {
      tableRef.current?.reload?.();
      onSuccess && onSuccess();
    }, [onSuccess]);

    const currentVersionId = data?.currentVersionId != null ? String(data.currentVersionId) : null;

    const columns = useCallback(
      () => [
        {
          name: 'version',
          title: formatMessage({ id: 'appManager.upload.version' }),
          renderType: 'main',
          getValueOf: item => item.version
        },
        {
          name: 'current',
          title: formatMessage({ id: 'common.status' }),
          renderType: 'tag',
          getValueOf: item => (currentVersionId && String(item.id) === currentVersionId ? { type: 'success', text: formatMessage({ id: 'appManager.version.current' }) } : null)
        },
        {
          name: 'label',
          title: formatMessage({ id: 'appManager.upload.label' }),
          getValueOf: item => item.label || '-'
        },
        {
          name: 'hasMigration',
          title: formatMessage({ id: 'appManager.version.hasMigration' }),
          render: (_, { dataSource }) => (dataSource.hasMigration ? <Tag color="blue">{(dataSource.sqlFiles || []).join(', ') || formatMessage({ id: 'common.yes' })}</Tag> : formatMessage({ id: 'common.no' }))
        },
        {
          name: 'createdAt',
          title: formatMessage({ id: 'common.createdAt' }),
          getValueOf: item => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-')
        },
        {
          name: 'options',
          title: formatMessage({ id: 'appManager.version.actions' }),
          renderType: 'options',
          fixed: 'right',
          getValueOf: item => [
            {
              type: 'link',
              buttonComponent: Deploy,
              data,
              versionId: item.id,
              onSuccess: handleReload,
              children: formatMessage({ id: 'appManager.actions.deploy' })
            }
          ]
        }
      ],
      [currentVersionId, data, formatMessage, handleReload]
    );

    return (
      <TablePage
        {...Object.assign({}, apis.appManager.versionList, {
          params: { name: data.name }
        })}
        ref={tableRef}
        name="app-manager-versions"
        pagination={{
          paramsType: 'params',
          pageSize: 20
        }}
        renderMobile={renderAdminListCards}
        renderCard={renderAdminListCards}
        buttonGroup={{
          list: [
            {
              type: 'primary',
              buttonComponent: UploadVersion,
              data,
              onSuccess: handleReload,
              children: formatMessage({ id: 'appManager.actions.uploadVersion' })
            }
          ]
        }}
        columns={columns}
      />
    );
  })
);

export default VersionPanel;
