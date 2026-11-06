import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Collapse, Empty, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Actions from '../Actions';
import DeliverablesPanel from './DeliverablesPanel';
import StageRecords from './StageRecords';
import Tree from './Tree';
import AiRuns from './AiRuns';
import ReleaseLog from './ReleaseLog';
import { STAGE_CODES, STATUS_COLOR, PRIORITY_COLOR, stageMessageId, statusMessageId, priorityMessageId } from '../constants';
import styles from '../style.module.scss';

const { Text } = Typography;
const formatTime = value => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');

// 详情页：顶部指标 + 阶段 StateBar，下方材料 / 需求说明 / 记录全部跟随所选阶段。
// 版式刻意只有一层线（材料卡片），其余靠留白与浅底分区，避免框套框。
const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:StateBar', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [Page, StateBar, usePreset] = remoteModules;
    const { apis } = usePreset();
    const { id } = useParams();
    const { formatMessage } = useIntl();
    // null 表示跟随当前阶段；点顶部阶段后切到对应阶段查看
    const [selectedStage, setSelectedStage] = useState(null);

    // 同路由内切换任务（如从拆分树点进另一个任务）时组件不会卸载，
    // 这里重置所选阶段，避免新任务沿用上一个任务正在回看的历史阶段
    useEffect(() => {
      setSelectedStage(null);
    }, [id]);

    return (
      <Fetch
        {...Object.assign({}, apis.flow.detail, { params: { id } })}
        render={({ data, reload }) => {
          // 页头固定为模块名「流程管理」并带返回按钮；具体流程标题放到内容区第一行，
          // 这样标题栏能明确「我在哪个模块」，返回路径也不会丢
          const pageProps = {
            ...props,
            menu: menu || null,
            backUrl: baseUrl,
            title: formatMessage({ id: 'adminFlow.list.pageTitle' })
          };

          if (!data) {
            return (
              <Page {...pageProps}>
                <Empty description={formatMessage({ id: 'adminFlow.detail.notFound' })} />
              </Page>
            );
          }

          const currentStage = data.stage;
          const stage = selectedStage || currentStage;
          const isViewingCurrent = stage === currentStage;
          const stageName = formatMessage({ id: stageMessageId(stage), defaultMessage: stage });

          // 详情接口返回全阶段材料，这里按所选阶段精确统计，避免历史阶段数字串味
          const allDeliverables = data.deliverables || [];
          const stageDeliverables = allDeliverables.filter(item => item.stage === stage);
          const requiredTotal = stageDeliverables.filter(item => item.required).length;
          const doneCount = stageDeliverables.filter(item => item.required && ['accepted', 'waived'].includes(item.status)).length;
          const aiDraftCount = stageDeliverables.filter(item => item.status === 'ai_draft').length;
          const progressPercent = requiredTotal ? Math.round((doneCount / requiredTotal) * 100) : 0;

          const isPaused = !!data.pausedAt;
          const overdue = !!data.dueAt && data.status === 'active' && dayjs(data.dueAt).isBefore(dayjs(), 'day');

          const stats = [
            {
              key: 'status',
              label: formatMessage({ id: 'adminFlow.columns.status' }),
              value: (
                <span className={styles.statInline}>
                  <Tag color={STATUS_COLOR[data.status]} bordered={false} className={styles.statTag}>
                    {formatMessage({ id: statusMessageId(data.status), defaultMessage: data.status })}
                  </Tag>
                  {isPaused ? (
                    <Tag color="warning" bordered={false} className={styles.statTag}>
                      {formatMessage({ id: 'adminFlow.detail.paused' })}
                    </Tag>
                  ) : null}
                </span>
              )
            },
            {
              key: 'priority',
              label: formatMessage({ id: 'adminFlow.columns.priority' }),
              value: (
                <Tag color={PRIORITY_COLOR[data.priority]} bordered={false} className={styles.statTag}>
                  {formatMessage({ id: priorityMessageId(data.priority), defaultMessage: data.priority })}
                </Tag>
              )
            },
            {
              key: 'owner',
              label: formatMessage({ id: 'adminFlow.detail.owner' }),
              value: data.ownerUser?.nickname || data.ownerUser?.email || '-'
            },
            {
              key: 'due',
              label: formatMessage({ id: 'adminFlow.columns.dueAt' }),
              value: <span className={overdue ? styles.statOverdue : undefined}>{formatTime(data.dueAt)}</span>
            },
            {
              key: 'materials',
              label: formatMessage({ id: 'adminFlow.detail.materialsProgress' }),
              value: (
                <span className={styles.statProgress}>
                  <span className={styles.statProgressText}>
                    {doneCount}/{requiredTotal || 0}
                  </span>
                  <span className={styles.statProgressBar}>
                    <span style={{ width: `${progressPercent}%` }} />
                  </span>
                </span>
              )
            }
          ];

          // 当前阶段：进度 + 待办草稿；历史阶段：一句话说明这是存档内容，无需再喊「只读」
          const materialsSubtitle = isViewingCurrent
            ? aiDraftCount > 0
              ? `${formatMessage({ id: 'adminFlow.detail.materialsSummary' }, { total: requiredTotal, done: doneCount })} · ${formatMessage({ id: 'adminFlow.detail.aiDraftHint' }, { count: aiDraftCount })}`
              : formatMessage({ id: 'adminFlow.detail.materialsSummary' }, { total: requiredTotal, done: doneCount })
            : formatMessage({ id: 'adminFlow.detail.archiveHint' });

          return (
            <Page {...pageProps}>
              <div className={styles.detailHeader}>
                <div className={styles.headerMain}>
                  {/* 页头标题固定为模块名，具体流程标题放内容区第一行 */}
                  <h1 className={styles.flowTitle}>{data.title || data.code || '-'}</h1>
                  <div className={styles.headerStats}>
                    {stats.map(item => (
                      <div key={item.key} className={styles.statItem}>
                        <span className={styles.statLabel}>{item.label}</span>
                        <span className={styles.statValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* 流水号与更新时间降级为一行小字，不再单独占一个概览区块 */}
                  <div className={styles.headerMeta}>
                    <span className={styles.metaCode}>{data.code || '-'}</span>
                    <span className={styles.metaDot} />
                    <span>{formatMessage({ id: 'adminFlow.detail.updatedAtInline' }, { time: formatTime(data.updatedAt) })}</span>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <Actions data={data} onSuccess={reload} />
                </div>
              </div>

              {/* 顶部阶段切换：StateBar step，是全页唯一的阶段入口 */}
              <div className={styles.stageBar}>
                <StateBar
                  type="step"
                  activeKey={stage}
                  onChange={key => setSelectedStage(key)}
                  stateOption={STAGE_CODES.map((code, index) => ({
                    key: code,
                    tab: formatMessage({ id: stageMessageId(code), defaultMessage: code }),
                    ...(index === STAGE_CODES.length - 1 ? { className: 'last' } : {})
                  }))}
                />
              </div>

              <div className={styles.sectionStack}>
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>{formatMessage({ id: 'adminFlow.detail.materials' }, { stage: stageName })}</h3>
                    <span className={styles.sectionSubtitle}>{materialsSubtitle}</span>
                  </div>
                  <DeliverablesPanel flowId={id} data={data} stage={stage} reload={reload} />
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>{formatMessage({ id: 'adminFlow.detail.description' })}</h3>
                  </div>
                  {data.description ? (
                    <div className={styles.markdownBody}>
                      <MarkdownRender>{data.description}</MarkdownRender>
                    </div>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </section>

                {/* 记录类内容收进无边框折叠，展开后由内部表格自己承担线条 */}
                <Collapse
                  ghost
                  className={styles.records}
                  items={[
                    { key: 'records', label: formatMessage({ id: 'adminFlow.detail.timeline' }), children: <StageRecords flowId={id} /> },
                    { key: 'tree', label: formatMessage({ id: 'adminFlow.detail.tabTree' }), children: <Tree baseUrl={baseUrl} rootId={data.rootId || id} currentId={id} /> },
                    { key: 'ai', label: formatMessage({ id: 'adminFlow.detail.tabAiRuns' }), children: <AiRuns flowId={id} runs={data.aiRuns || data.recentRuns || []} /> },
                    { key: 'release', label: formatMessage({ id: 'adminFlow.detail.tabRelease' }), children: <ReleaseLog flowId={id} /> }
                  ]}
                />
              </div>
            </Page>
          );
        }}
      />
    );
  })
);

export default TabDetail;
