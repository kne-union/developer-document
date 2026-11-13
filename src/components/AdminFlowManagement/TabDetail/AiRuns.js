import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { queueGoalMessageId } from '../constants';
import { ContextLoadError, ContextLoading, RemoteAiRunContextView } from './AiRunContextView';

// AI 工作记录：列表 + 弹窗看上下文，不用抽屉和多张卡片
const AiRuns = createWithRemoteLoader({
  modules: ['components-core:TablePage@Table', 'components-core:Modal@useModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId, runs = [] }) => {
    const [Table, useModal, usePreset] = remoteModules;
    const modal = useModal();
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const list = Array.isArray(runs) ? runs : [];

    const openDetail = runId => {
      // 只打开「查看上下文」弹窗：标题、分组、结构化展示与原始 JSON 次要入口都在 AiRunContextView。
      modal({
        title: formatMessage({ id: 'adminFlow.ai.viewDetail' }),
        size: 'large',
        footer: null,
        children: (
          <Fetch
            {...Object.assign({}, apis.flow.runDetail, { params: { runId } })}
            loading={<ContextLoading />}
            error={() => <ContextLoadError formatMessage={formatMessage} />}
            render={({ data }) => (data ? <RemoteAiRunContextView data={data} formatMessage={formatMessage} /> : <Empty description={formatMessage({ id: 'adminFlow.ai.noDetail' })} />)}
          />
        )
      });
    };

    const renderTable = rows => (
      <Table
        dataSource={rows}
        columns={[
          { name: 'goal', title: formatMessage({ id: 'adminFlow.queue.table.goal' }), renderType: 'main', getValueOf: item => formatMessage({ id: queueGoalMessageId(item.goal), defaultMessage: item.goal || '-' }) },
          { name: 'status', title: formatMessage({ id: 'adminFlow.ai.status' }), renderType: 'tag-short', getValueOf: item => ({ type: item.status === 'succeeded' ? 'success' : 'default', text: item.status || '-' }) },
          { name: 'model', title: formatMessage({ id: 'adminFlow.ai.model' }) },
          { name: 'startedAt', title: formatMessage({ id: 'adminFlow.ai.startedAt' }), format: 'datetime', getValueOf: item => item.startedAt || null },
          {
            name: 'options',
            title: formatMessage({ id: 'adminFlow.deliverable.table.options' }),
            renderType: 'options',
            fixed: 'right',
            getValueOf: item => [{ children: formatMessage({ id: 'adminFlow.ai.viewDetail' }), onClick: () => openDetail(item.runId || item.id) }]
          }
        ]}
      />
    );

    if (list.length) return renderTable(list);
    // 详情接口不返回 recentRuns / aiRuns，Tab 自行拉取，否则「AI 记录」恒为空
    return (
      <Fetch
        {...Object.assign({}, apis.flow.runList, { params: { flowId, perPage: 50 } })}
        render={({ data }) => {
          const fetched = Array.isArray(data) ? data : data?.pageData || [];
          return fetched.length ? renderTable(fetched) : <Empty description={formatMessage({ id: 'adminFlow.ai.noRuns' })} />;
        }}
      />
    );
  })
);

export default AiRuns;
