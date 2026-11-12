import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { queueGoalMessageId } from '../constants';
import styles from '../style.module.scss';

// AI 工作记录：列表 + 弹窗看上下文，不用抽屉和多张卡片
const AiRuns = createWithRemoteLoader({
  modules: ['components-core:TablePage@Table', 'components-core:Modal@useModal', 'components-core:InfoPage', 'components-core:InfoPage@Content', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId, runs = [] }) => {
    const [Table, useModal, InfoPage, Content, usePreset] = remoteModules;
    const modal = useModal();
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const list = Array.isArray(runs) ? runs : [];

    const openDetail = runId => {
      modal({
        title: formatMessage({ id: 'adminFlow.ai.runDetail' }),
        size: 'small',
        children: (
          <Fetch
            {...Object.assign({}, apis.flow.runDetail, { params: { runId } })}
            render={({ data }) => {
              if (!data) return <Empty description={formatMessage({ id: 'adminFlow.ai.noDetail' })} />;
              const events = Array.isArray(data.events) ? data.events : [];
              return (
                <InfoPage>
                  <InfoPage.Part>
                    <Content
                      list={[
                        { label: formatMessage({ id: 'adminFlow.ai.status' }), content: data.status || '-' },
                        { label: formatMessage({ id: 'adminFlow.ai.model' }), content: data.model || '-' },
                        { label: formatMessage({ id: 'adminFlow.ai.startedAt' }), content: data.startedAt || '-' },
                        { label: formatMessage({ id: 'adminFlow.ai.finishedAt' }), content: data.finishedAt || '-' },
                        { label: formatMessage({ id: 'adminFlow.ai.contextSnapshot' }), content: <pre className={styles.jsonBlock}>{JSON.stringify(data.contextSnapshot || {}, null, 2)}</pre>, block: true },
                        { label: formatMessage({ id: 'adminFlow.ai.outputs' }), content: <pre className={styles.jsonBlock}>{JSON.stringify(data.outputs || {}, null, 2)}</pre>, block: true }
                      ]}
                    />
                  </InfoPage.Part>
                  <InfoPage.Part title={formatMessage({ id: 'adminFlow.ai.events' })}>
                    {events.length ? (
                      <Table
                        dataSource={events}
                        columns={[
                          { name: 'at', title: formatMessage({ id: 'adminFlow.ai.table.time' }) },
                          { name: 'tool', title: formatMessage({ id: 'adminFlow.ai.table.tool' }) },
                          { name: 'action', title: formatMessage({ id: 'adminFlow.ai.eventAction' }) },
                          { name: 'result', title: formatMessage({ id: 'adminFlow.ai.table.result' }) }
                        ]}
                      />
                    ) : (
                      <Empty description={formatMessage({ id: 'adminFlow.ai.emptySection' })} />
                    )}
                  </InfoPage.Part>
                </InfoPage>
              );
            }}
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
