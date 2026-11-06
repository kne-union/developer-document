import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { App, Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { stageMessageId, stageRecordActionId } from '../constants';

// 操作记录：静态表格 + 表格自带的确认按钮撤销，不用气泡确认和卡片列表
const ReleaseLog = createWithRemoteLoader({
  modules: ['components-core:TablePage@Table', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId }) => {
    const [Table, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.flow.releaseList, { params: { flowId, perPage: 50 } })}
        render={({ data, reload }) => {
          const list = Array.isArray(data) ? data : data?.pageData || [];
          if (!list.length) return <Empty description={formatMessage({ id: 'adminFlow.release.empty' })} />;

          return (
            <Table
              dataSource={list}
              columns={[
                { name: 'enteredAt', title: formatMessage({ id: 'adminFlow.records.time' }), format: 'datetime', getValueOf: item => item.enteredAt || item.createdAt || null },
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
                {
                  name: 'options',
                  title: formatMessage({ id: 'adminFlow.deliverable.table.options' }),
                  renderType: 'options',
                  fixed: 'right',
                  getValueOf: item =>
                    item.undoneAt
                      ? [{ children: formatMessage({ id: 'adminFlow.release.undone' }), disabled: true }]
                      : [
                          {
                            children: formatMessage({ id: 'adminFlow.release.undo' }),
                            isDelete: true,
                            message: formatMessage({ id: 'adminFlow.release.undoConfirm' }),
                            onClick: async () => {
                              const { data: resData } = await ajax(
                                Object.assign({}, apis.flow.releaseUndo, {
                                  data: { releaseId: item.releaseId, reason: formatMessage({ id: 'adminFlow.release.undoReason' }) }
                                })
                              );
                              if (resData.code !== 0) return;
                              message.success(formatMessage({ id: 'adminFlow.release.undoSuccess' }));
                              reload();
                            }
                          }
                        ]
                }
              ]}
            />
          );
        }}
      />
    );
  })
);

export default ReleaseLog;
