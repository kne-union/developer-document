import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { exclusionReasonMessageId, queueGoalMessageId, stageMessageId } from '../constants';

// AI 待办：两个静态表格。说明放 InfoPage 的 subtitle，不再用卡片和进度条装饰。
const Queue = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:InfoPage', 'components-core:TablePage@Table', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [Page, InfoPage, Table, usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();

    return (
      <Page {...props} menu={menu || null} title={formatMessage({ id: 'adminFlow.queue.title' })}>
        <Fetch
          {...Object.assign({}, apis.flow.queuePeek, { params: { limit: 30 } })}
          render={({ data }) => {
            const candidates = Array.isArray(data) ? data : data?.pageData || [];
            const excluded = Array.isArray(data?.excluded) ? data.excluded : [];

            return (
              <InfoPage>
                <InfoPage.Part title={formatMessage({ id: 'adminFlow.queue.candidates' })} subtitle={formatMessage({ id: 'adminFlow.queue.hint' })}>
                  {!candidates.length ? (
                    <Empty description={formatMessage({ id: 'adminFlow.queue.empty' })} />
                  ) : (
                    <Table
                      dataSource={candidates}
                      columns={[
                        { name: 'title', title: formatMessage({ id: 'adminFlow.queue.table.task' }), renderType: 'main' },
                        {
                          name: 'stage',
                          title: formatMessage({ id: 'adminFlow.queue.table.stage' }),
                          renderType: 'tag-short',
                          getValueOf: item => ({ type: 'default', text: formatMessage({ id: stageMessageId(item.stage), defaultMessage: item.stage }) })
                        },
                        {
                          name: 'goal',
                          title: formatMessage({ id: 'adminFlow.queue.table.goal' }),
                          getValueOf: item => formatMessage({ id: queueGoalMessageId(item.goal), defaultMessage: item.goal })
                        },
                        { name: 'priorityScore', title: formatMessage({ id: 'adminFlow.queue.table.score' }) },
                        {
                          name: 'priorityReasons',
                          title: formatMessage({ id: 'adminFlow.queue.priorityReasons' }),
                          renderType: 'description',
                          getValueOf: item => (item.priorityReasons || []).join('、') || null
                        }
                      ]}
                    />
                  )}
                </InfoPage.Part>

                <InfoPage.Part title={formatMessage({ id: 'adminFlow.queue.excluded' })} subtitle={formatMessage({ id: 'adminFlow.queue.excludedHint' })}>
                  {!excluded.length ? (
                    <Empty description={formatMessage({ id: 'adminFlow.queue.excludedEmpty' })} />
                  ) : (
                    <Table
                      dataSource={excluded}
                      columns={[
                        { name: 'title', title: formatMessage({ id: 'adminFlow.queue.table.task' }), renderType: 'main' },
                        {
                          name: 'reason',
                          title: formatMessage({ id: 'adminFlow.queue.table.reason' }),
                          renderType: 'tag-short',
                          getValueOf: item => ({ type: item.reason === 'awaiting_human' ? 'processing' : 'warning', text: formatMessage({ id: exclusionReasonMessageId(item.reason), defaultMessage: item.reason }) })
                        },
                        { name: 'pauseReason', title: formatMessage({ id: 'adminFlow.records.note' }), renderType: 'description', getValueOf: item => item.pauseReason || item.resumeHint || null }
                      ]}
                    />
                  )}
                </InfoPage.Part>
              </InfoPage>
            );
          }}
        />
      </Page>
    );
  })
);

export default Queue;
