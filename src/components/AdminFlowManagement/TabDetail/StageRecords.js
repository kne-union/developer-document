import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { stageMessageId, stageRecordActionId } from '../constants';

// 阶段记录：静态表格，不再用时间线卡片堆记录
const StageRecords = createWithRemoteLoader({
  modules: ['components-core:TablePage@Table', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId }) => {
    const [Table, usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.flow.stageRecords, { params: { flowId } })}
        render={({ data }) => {
          const list = Array.isArray(data) ? data : data?.pageData || [];
          if (!list.length) {
            return <Empty description={formatMessage({ id: 'adminFlow.detail.timelineEmpty' })} />;
          }
          return (
            <Table
              dataSource={list}
              columns={[
                { name: 'enteredAt', title: formatMessage({ id: 'adminFlow.records.time' }), format: 'datetime' },
                {
                  name: 'action',
                  title: formatMessage({ id: 'adminFlow.records.action' }),
                  renderType: 'tag-short',
                  getValueOf: item => ({ type: 'default', text: formatMessage({ id: stageRecordActionId(item.action), defaultMessage: item.action }) })
                },
                {
                  name: 'stage',
                  title: formatMessage({ id: 'adminFlow.records.stage' }),
                  getValueOf: item => `${formatMessage({ id: stageMessageId(item.fromStage), defaultMessage: item.fromStage || '-' })} → ${formatMessage({ id: stageMessageId(item.toStage), defaultMessage: item.toStage || '-' })}`
                },
                { name: 'actorType', title: formatMessage({ id: 'adminFlow.records.by' }), getValueOf: item => (item.actorType === 'mcp-ai' ? 'AI' : formatMessage({ id: 'adminFlow.release.actorHuman' })) },
                { name: 'remark', title: formatMessage({ id: 'adminFlow.records.note' }), renderType: 'description', getValueOf: item => item.remark || null }
              ]}
            />
          );
        }}
      />
    );
  })
);

export default StageRecords;
