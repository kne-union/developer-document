import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RightOutlined } from '@ant-design/icons';
import { Alert, Button, Collapse, Empty, Spin, Tag } from 'antd';
import dayjs from 'dayjs';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Actions from '../Actions';
import DeliverablesPanel from './DeliverablesPanel';
import StageRecords from './StageRecords';
import Tree from './Tree';
import AiRuns from './AiRuns';
import ReleaseLog from './ReleaseLog';
import { RemoteMarkdownWithAttachments } from './FileAttachmentPreview';
import { FlowCardHeader } from '../FlowCardHeader';
import { recordsDefaultActiveKey } from '../recordsCollapse';
import { STAGE_CODES, STATUS_COLOR, PRIORITY_COLOR, stageMessageId, statusMessageId, priorityMessageId } from '../constants';
import styles from '../style.module.scss';

const formatTime = value => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');
const ownerName = data => data?.ownerUser?.nickname || data?.ownerUser?.email || data?.ownerUserId || '-';

const scrollToRecords = () => {
  const node = document.getElementById('flow-records');
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 详情页：顶部先交代状态与待办（打回 / 暂停 / 超期），再是标题、指标与关键操作，
// 阶段条是全页唯一阶段入口；材料跟随所选阶段，记录区默认折叠，有待处理打回时自动展开台账。
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

    const pageProps = {
      ...props,
      menu: menu || null,
      backUrl: baseUrl,
      title: formatMessage({ id: 'adminFlow.list.pageTitle' })
    };

    return (
      <Fetch
        {...Object.assign({}, apis.flow.detail, { params: { id } })}
        loading={
          <Page {...pageProps}>
            <div className={styles.pageState}>
              <Spin />
            </div>
          </Page>
        }
        error={() => (
          <Page {...pageProps}>
            <Empty description={formatMessage({ id: 'adminFlow.detail.loadError' })} />
          </Page>
        )}
        render={({ data, reload }) => {
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
          const currentStageName = formatMessage({ id: stageMessageId(currentStage), defaultMessage: currentStage });

          // 详情接口返回全阶段材料，这里按所选阶段精确统计，避免历史阶段数字串味
          const allDeliverables = data.deliverables || [];
          const stageDeliverables = allDeliverables.filter(item => item.stage === stage);
          const requiredTotal = stageDeliverables.filter(item => item.required).length;
          const doneCount = stageDeliverables.filter(item => item.required && ['accepted', 'waived'].includes(item.status)).length;
          const aiDraftCount = stageDeliverables.filter(item => item.status === 'ai_draft').length;
          const progressPercent = requiredTotal ? Math.round((doneCount / requiredTotal) * 100) : 0;

          const isPaused = !!data.pausedAt;
          const overdue = !!data.dueAt && data.status === 'active' && dayjs(data.dueAt).isBefore(dayjs(), 'day');
          const openFeedback = Array.isArray(data.openFeedback) ? data.openFeedback : [];

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
              value: ownerName(data)
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
                  <span className={styles.statProgressBar} aria-hidden="true">
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

          const pauseDescription = data.pauseReason
            ? formatMessage({ id: 'adminFlow.detail.pausedReason' }, { reason: data.pauseReason })
            : formatMessage({ id: data.pausedByType === 'mcp-ai' ? 'adminFlow.detail.pausedByAi' : 'adminFlow.detail.pausedByHuman' });

          const recordHeader = (id, extra) => <FlowCardHeader compact title={formatMessage({ id })} extra={extra} />;

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
                  {/* 流水号、阶段停留与更新时间降级为一行小字，不再单独占一个概览区块 */}
                  <div className={styles.headerMeta}>
                    <span className={styles.metaCode}>{data.code || '-'}</span>
                    {data.status === 'active' && typeof data.stayMinutes === 'number' ? (
                      <>
                        <span className={styles.metaDot} />
                        <span>{formatMessage({ id: 'adminFlow.detail.stayMinutes' }, { minutes: data.stayMinutes })}</span>
                      </>
                    ) : null}
                    <span className={styles.metaDot} />
                    <span>{formatMessage({ id: 'adminFlow.detail.updatedAtInline' }, { time: formatTime(data.updatedAt) })}</span>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <Actions data={data} onSuccess={reload} />
                </div>
              </div>

              {(openFeedback.length || isPaused || overdue) && (
                <div className={styles.bannerStack}>
                  {openFeedback.length ? (
                    <Alert
                      type="error"
                      showIcon
                      className={styles.banner}
                      message={formatMessage({ id: 'adminFlow.detail.feedbackPendingTitle' }, { count: openFeedback.length })}
                      description={
                        <div className={styles.bannerBody}>
                          <p>{openFeedback[0].feedback}</p>
                          <p className={styles.bannerHint}>{formatMessage({ id: 'adminFlow.detail.feedbackPendingHint' })}</p>
                        </div>
                      }
                      action={
                        <Button size="small" onClick={scrollToRecords}>
                          {formatMessage({ id: 'adminFlow.detail.viewRelease' })}
                        </Button>
                      }
                    />
                  ) : null}
                  {isPaused ? <Alert type="warning" showIcon className={styles.banner} message={formatMessage({ id: 'adminFlow.detail.paused' })} description={pauseDescription} /> : null}
                  {overdue ? (
                    <Alert
                      type="warning"
                      showIcon
                      className={styles.banner}
                      message={formatMessage({ id: 'adminFlow.detail.overdueTitle' })}
                      description={formatMessage({ id: 'adminFlow.detail.overdueHint' }, { time: formatTime(data.dueAt) })}
                    />
                  ) : null}
                </div>
              )}

              {/* 顶部阶段切换：StateBar step，是全页唯一的阶段入口；当前阶段在标签里标出，避免回看历史时分不清「现在走到哪」 */}
              <div className={styles.stageBar}>
                <StateBar
                  type="step"
                  activeKey={stage}
                  onChange={key => setSelectedStage(key)}
                  stateOption={STAGE_CODES.map((code, index) => {
                    const name = formatMessage({ id: stageMessageId(code), defaultMessage: code });
                    return {
                      key: code,
                      tab: code === currentStage ? formatMessage({ id: 'adminFlow.detail.stageTabCurrent' }, { stage: name }) : name,
                      ...(index === STAGE_CODES.length - 1 ? { className: 'last' } : {})
                    };
                  })}
                />
              </div>

              {!isViewingCurrent ? (
                <Alert
                  type="info"
                  showIcon
                  className={styles.banner}
                  message={formatMessage({ id: 'adminFlow.detail.viewingArchiveTitle' }, { stage: stageName })}
                  description={formatMessage({ id: 'adminFlow.detail.viewingArchiveHint' }, { current: currentStageName })}
                />
              ) : null}

              <div className={styles.sectionStack}>
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>{formatMessage({ id: 'adminFlow.detail.materials' }, { stage: stageName })}</h2>
                    <span className={styles.sectionSubtitle}>{materialsSubtitle}</span>
                  </div>
                  <DeliverablesPanel flowId={id} data={data} stage={stage} reload={reload} />
                </section>

                <section className={styles.section}>
                  <article className={styles.descriptionCard}>
                    <FlowCardHeader title={formatMessage({ id: 'adminFlow.detail.description' })} />
                    {data.description ? (
                      <div className={styles.descriptionBody}>
                        <RemoteMarkdownWithAttachments text={data.description} formatMessage={formatMessage} />
                      </div>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} className={styles.sectionEmpty} description={formatMessage({ id: 'adminFlow.detail.descriptionEmpty' })} />
                    )}
                  </article>
                </section>

                {/* 记录类内容收进折叠：有待处理打回时默认打开操作记录。展开行为见 recordsDefaultActiveKey。 */}
                <div id="flow-records" className={styles.recordsSection}>
                  <Collapse
                    ghost
                    key={`${id}-${openFeedback.length ? 'feedback' : 'plain'}`}
                    className={styles.records}
                    defaultActiveKey={recordsDefaultActiveKey(openFeedback)}
                    expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} className={styles.recordsExpandIcon} aria-hidden />}
                    items={[
                      { key: 'records', label: recordHeader('adminFlow.detail.timeline'), children: <StageRecords flowId={id} /> },
                      { key: 'tree', label: recordHeader('adminFlow.detail.tabTree'), children: <Tree baseUrl={baseUrl} rootId={data.rootId || id} currentId={id} /> },
                      { key: 'ai', label: recordHeader('adminFlow.detail.tabAiRuns'), children: <AiRuns flowId={id} runs={data.aiRuns || data.recentRuns || []} /> },
                      {
                        key: 'release',
                        label: recordHeader('adminFlow.detail.tabRelease', openFeedback.length ? <span className={styles.recordBadge}>{formatMessage({ id: 'adminFlow.detail.feedbackBadge' }, { count: openFeedback.length })}</span> : null),
                        children: <ReleaseLog flowId={id} />
                      }
                    ]}
                  />
                </div>
              </div>
            </Page>
          );
        }}
      />
    );
  })
);

export default TabDetail;
