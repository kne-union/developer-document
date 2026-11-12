import { useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { App, Empty, Input, Modal, Tag, Typography } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { stageMessageId, stageRecordActionId } from '../constants';
import styles from '../style.module.scss';

const formatRef = item => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const type = item.type || 'ref';
  const ref = item.ref || item.url || item.id || '';
  return ref ? `${type}:${ref}` : type;
};

// 放行台账：AI 自主放行的每一次动作都可查，人工控制点只有「撤回」与「打回」。
// 打回会附带意见，AI 未处理前服务端会拒绝同一流程的下一次放行。
// 表格只展示扫一眼需要的字段；证据、说明、快照放到详情里，避免把操作台挤成一堆 JSON。
const ReleaseLog = createWithRemoteLoader({
  modules: ['components-core:TablePage@Table', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId }) => {
    const [Table, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [rejecting, setRejecting] = useState(null);
    const [inspecting, setInspecting] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const modeMessageId = mode => (mode === 'human_confirmed' ? 'adminFlow.release.modeHuman' : mode === 'admin' ? 'adminFlow.release.modeAdmin' : 'adminFlow.release.modeAi');

    const feedbackCell = item => {
      if (item.feedbackStatus === 'open') {
        return (
          <div className={styles.feedbackCell}>
            <Tag color="warning" bordered={false} className={styles.statTag}>
              {formatMessage({ id: 'adminFlow.release.feedbackOpen' })}
            </Tag>
            {item.feedback ? <div className={styles.feedbackText}>{item.feedback}</div> : null}
          </div>
        );
      }
      if (item.feedbackStatus === 'acknowledged') {
        return (
          <div className={styles.feedbackCell}>
            <Tag color="success" bordered={false} className={styles.statTag}>
              {formatMessage({ id: 'adminFlow.release.feedbackAck' })}
            </Tag>
            {item.feedback ? <div className={styles.feedbackText}>{item.feedback}</div> : null}
            {item.ackNote ? <div className={styles.feedbackAck}>{formatMessage({ id: 'adminFlow.release.ackNoteLabel' }, { note: item.ackNote })}</div> : null}
          </div>
        );
      }
      return item.feedback || '-';
    };

    return (
      <Fetch
        {...Object.assign({}, apis.flow.releaseList, { params: { flowId, perPage: 50 } })}
        error={() => <Empty description={formatMessage({ id: 'adminFlow.release.loadError' })} />}
        render={({ data, reload }) => {
          const list = Array.isArray(data) ? data : data?.pageData || [];

          const closeReject = () => {
            setRejecting(null);
            setReason('');
          };

          const submitReject = async () => {
            if (!reason.trim()) {
              message.error(formatMessage({ id: 'adminFlow.release.rejectReasonRequired' }));
              return;
            }
            setSaving(true);
            try {
              const { data: resData } = await ajax(
                Object.assign({}, apis.flow.releaseReject, {
                  data: { releaseId: rejecting.releaseId, reason: reason.trim() }
                })
              );
              if (resData?.code !== undefined && resData.code !== 0) {
                throw new Error(resData.msg || resData.message || `code ${resData.code}`);
              }
              message.success(formatMessage({ id: 'adminFlow.release.rejectSuccess' }));
              closeReject();
              reload();
            } catch (e) {
              message.error(e?.message || String(e));
            } finally {
              setSaving(false);
            }
          };

          return (
            <>
              {list.length ? (
                <div className={styles.tableWrap}>
                  <Table
                    dataSource={list}
                    rowKey={item => item.releaseId || item.id}
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
                      {
                        name: 'mode',
                        title: formatMessage({ id: 'adminFlow.release.source' }),
                        renderType: 'tag-short',
                        getValueOf: item => ({ type: item.mode === 'ai_autonomous' ? 'default' : 'success', text: formatMessage({ id: modeMessageId(item.mode) }) })
                      },
                      {
                        name: 'feedback',
                        title: formatMessage({ id: 'adminFlow.release.feedbackColumn' }),
                        getValueOf: item => feedbackCell(item)
                      },
                      { name: 'actorType', title: formatMessage({ id: 'adminFlow.records.by' }), getValueOf: item => (item.actorType === 'mcp-ai' ? 'AI' : formatMessage({ id: 'adminFlow.release.actorHuman' })) },
                      {
                        name: 'options',
                        title: formatMessage({ id: 'adminFlow.deliverable.table.options' }),
                        renderType: 'options',
                        fixed: 'right',
                        getValueOf: item => {
                          const view = { children: formatMessage({ id: 'adminFlow.release.viewDetail' }), onClick: () => setInspecting(item) };
                          if (item.undoneAt) {
                            return [view, { children: formatMessage({ id: 'adminFlow.release.undone' }), disabled: true }];
                          }
                          return [
                            view,
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
                                if (resData?.code !== undefined && resData.code !== 0) return;
                                message.success(formatMessage({ id: 'adminFlow.release.undoSuccess' }));
                                reload();
                              }
                            },
                            {
                              children: formatMessage({ id: 'adminFlow.release.reject' }),
                              onClick: () => {
                                setReason('');
                                setRejecting(item);
                              }
                            }
                          ];
                        }
                      }
                    ]}
                  />
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminFlow.release.empty' })} />
              )}

              <Modal open={Boolean(rejecting)} title={formatMessage({ id: 'adminFlow.release.rejectTitle' })} okText={formatMessage({ id: 'adminFlow.release.reject' })} confirmLoading={saving} onOk={submitReject} onCancel={closeReject}>
                <Typography.Paragraph type="secondary">{formatMessage({ id: 'adminFlow.release.rejectConfirm' })}</Typography.Paragraph>
                <Typography.Paragraph>{formatMessage({ id: 'adminFlow.release.rejectReasonLabel' })}</Typography.Paragraph>
                <Input.TextArea rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder={formatMessage({ id: 'adminFlow.release.rejectReasonPlaceholder' })} />
              </Modal>

              <Modal open={Boolean(inspecting)} title={formatMessage({ id: 'adminFlow.release.detailTitle' })} footer={null} onCancel={() => setInspecting(null)} width={640} destroyOnClose>
                {inspecting ? (
                  <div className={styles.releaseDetail}>
                    <dl>
                      <div>
                        <dt>{formatMessage({ id: 'adminFlow.release.releaseId' })}</dt>
                        <dd className={styles.metaCode}>{inspecting.releaseId || '-'}</dd>
                      </div>
                      {inspecting.note ? (
                        <div>
                          <dt>{formatMessage({ id: 'adminFlow.release.note' })}</dt>
                          <dd>{inspecting.note}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{formatMessage({ id: 'adminFlow.release.evidenceRefs' })}</dt>
                        <dd>
                          {Array.isArray(inspecting.evidenceRefs) && inspecting.evidenceRefs.length ? (
                            <ul className={styles.evidenceList}>
                              {inspecting.evidenceRefs.map((item, index) => (
                                <li key={`${formatRef(item)}-${index}`}>{formatRef(item)}</li>
                              ))}
                            </ul>
                          ) : (
                            formatMessage({ id: 'adminFlow.release.evidenceEmpty' })
                          )}
                        </dd>
                      </div>
                      {inspecting.feedback ? (
                        <div>
                          <dt>{formatMessage({ id: 'adminFlow.release.feedbackColumn' })}</dt>
                          <dd>{inspecting.feedback}</dd>
                        </div>
                      ) : null}
                      {inspecting.ackNote ? (
                        <div>
                          <dt>{formatMessage({ id: 'adminFlow.release.ackNote' })}</dt>
                          <dd>{inspecting.ackNote}</dd>
                        </div>
                      ) : null}
                      {inspecting.undoReason ? (
                        <div>
                          <dt>{formatMessage({ id: 'adminFlow.release.undo' })}</dt>
                          <dd>{inspecting.undoReason}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{formatMessage({ id: 'adminFlow.release.before' })}</dt>
                        <dd>
                          <pre className={styles.jsonBlock}>{JSON.stringify(inspecting.before || {}, null, 2)}</pre>
                        </dd>
                      </div>
                      <div>
                        <dt>{formatMessage({ id: 'adminFlow.release.after' })}</dt>
                        <dd>
                          <pre className={styles.jsonBlock}>{JSON.stringify(inspecting.after || {}, null, 2)}</pre>
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </Modal>
            </>
          );
        }}
      />
    );
  })
);

export default ReleaseLog;
