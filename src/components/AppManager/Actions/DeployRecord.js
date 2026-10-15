import { Tag, Tooltip } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import DeployProgress from './DeployProgress';

/** 版本列表中的「部署失败」标签：点击查看该次部署的阶段与日志 */
const DeployRecord = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Modal@useModal']
})(
  withLocale(({ remoteModules, name, record }) => {
    const [usePreset, useModal] = remoteModules;
    const modal = useModal();
    const { ajax, apis, staticUrl } = usePreset();
    const { formatMessage } = useIntl();

    const open = () =>
      modal({
        title: formatMessage({ id: 'appManager.deploy.recordTitle' }, { version: record.version || '' }),
        size: 'small',
        footer: null,
        children: <DeployProgress ajax={ajax} apis={apis} staticUrl={staticUrl} name={name} progressId={record.progressId} formatMessage={formatMessage} />
      });

    return (
      <Tooltip title={record.message || null}>
        <Tag color="error" style={{ cursor: 'pointer' }} onClick={open}>
          {formatMessage({ id: 'appManager.version.deployFailed' })}
        </Tag>
      </Tooltip>
    );
  })
);

export default DeployRecord;
