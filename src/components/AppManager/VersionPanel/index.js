import { useCallback, useRef } from 'react';
import { Tag, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import UploadVersion from '../Actions/UploadVersion';
import Deploy from '../Actions/Deploy';
import DeployRecord from '../Actions/DeployRecord';
import MigrationManager from '../Actions/MigrationManager';
import createAdminListCards from '@components/Shared/createAdminListCards';
import buildAuthUrl from '../utils/buildAuthUrl';

const renderAdminListCards = createAdminListCards();

const VersionPanel = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:TablePage']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [usePreset, TablePage] = remoteModules;
    const { apis, staticUrl } = usePreset();
    const { formatMessage } = useIntl();
    const tableRef = useRef(null);

    // 原生导航下载由浏览器流式落盘，部署包不占用页面内存
    const download = useCallback(
      item => {
        const link = document.createElement('a');
        link.href = buildAuthUrl(staticUrl, apis.appManager.versionDownload.url, { name: data.name, versionId: item.id });
        link.download = `${data.name}-${item.version}.zip`;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      [apis.appManager.versionDownload.url, data.name, staticUrl]
    );

    const handleReload = useCallback(() => {
      tableRef.current?.reload?.();
      onSuccess && onSuccess();
    }, [onSuccess]);

    const currentVersionId = data?.currentVersionId != null ? String(data.currentVersionId) : null;
    const deployment = data?.deployment || null;
    const lastDeployment = data?.lastDeployment || null;

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
          render: (_, { dataSource }) => {
            if (deployment && String(dataSource.id) === String(deployment.versionId)) {
              const step = deployment.step ? formatMessage({ id: `appManager.deploy.step.${deployment.step}` }) : '';
              const detail = deployment.detail ? formatMessage({ id: `appManager.deploy.detail.${deployment.detail}` }) : '';
              return (
                <Tooltip title={detail || null}>
                  <Tag color="processing" icon={<LoadingOutlined />}>
                    {formatMessage({ id: 'appManager.version.deploying' }, { step })}
                  </Tag>
                </Tooltip>
              );
            }
            const failed = lastDeployment?.status === 'failed' && String(dataSource.id) === String(lastDeployment.versionId) ? <DeployRecord name={data.name} record={lastDeployment} /> : null;
            if (currentVersionId && String(dataSource.id) === currentVersionId) {
              return (
                <>
                  <Tag color="success">{formatMessage({ id: 'appManager.version.current' })}</Tag>
                  {failed}
                </>
              );
            }
            return failed;
          }
        },
        {
          name: 'label',
          title: formatMessage({ id: 'appManager.upload.label' }),
          getValueOf: item => item.label || '-'
        },
        {
          name: 'hasMigration',
          title: formatMessage({ id: 'appManager.version.hasMigration' }),
          render: (_, { dataSource }) => {
            if (!dataSource.hasMigration) return formatMessage({ id: 'common.no' });
            const sqlFiles = dataSource.sqlFiles || [];
            if (!sqlFiles.length) return <Tag color="blue">{formatMessage({ id: 'common.yes' })}</Tag>;
            return (
              <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{sqlFiles.join('\n')}</div>}>
                <Tag color="blue">{formatMessage({ id: 'appManager.version.sqlCount' }, { count: sqlFiles.length })}</Tag>
              </Tooltip>
            );
          }
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
              version: item.version,
              onSuccess: handleReload,
              children: formatMessage({ id: 'appManager.actions.deploy' })
            },
            {
              type: 'link',
              buttonComponent: MigrationManager,
              data,
              versionId: item.id,
              version: item.version,
              onSuccess: handleReload,
              children: formatMessage({ id: 'appManager.migration.manage' })
            },
            {
              type: 'link',
              children: formatMessage({ id: 'appManager.version.download' }),
              onClick: () => download(item)
            }
          ]
        }
      ],
      [currentVersionId, data, deployment, lastDeployment, download, formatMessage, handleReload]
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
