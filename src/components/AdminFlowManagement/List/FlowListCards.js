/**
 * 流程列表专用 renderCard / renderMobile。
 * 契约与 BizUnit/TablePage 一致：displayDataSource、columns、renderToolbar、
 * options 列通过 getValueOf(item, { place: 'end' }) 取操作（权限与隐藏已在 getActionList 处理）。
 * 只覆盖流程管理列表，不改全站 createAdminListCards。
 */
import { isValidElement } from 'react';
import { Link } from 'react-router-dom';
import { Checkbox, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import RemoteLoader from '@kne/remote-loader';
import { collectCardActions, detailPath, listFromTableProps, mapFlowListItem } from './flowListCard';
import styles from './style.module.scss';

const formatDue = dueAt => {
  if (!dueAt) return '';
  const date = dayjs(dueAt);
  return date.isValid() ? date.format('YYYY-MM-DD') : '';
};

const enumText = (formatMessage, meta) => {
  if (!meta || meta.empty) return '';
  return formatMessage({ id: meta.messageId, values: meta.values || {} });
};

const renderActions = (columns, item) => {
  const collected = collectCardActions(columns, item);
  if (!collected.present) return null;
  const value = collected.value;
  if (isValidElement(value)) return value;
  if (value && value.children) return value.children;
  if (Array.isArray(value) && value.length) {
    return <RemoteLoader module="components-core:ButtonGroup" moreType="link" list={value} />;
  }
  if (value && Array.isArray(value.list)) {
    return <RemoteLoader module="components-core:ButtonGroup" moreType="link" {...value} />;
  }
  return null;
};

const Selection = ({ getSelectionProps, item }) => {
  const selection = getSelectionProps(item);
  if (!selection) return null;
  return (
    <div
      className={styles.flowListSelection}
      onClick={event => {
        event.stopPropagation();
      }}
    >
      <Checkbox checked={selection.checked} indeterminate={selection.indeterminate} disabled={selection.disabled} onChange={selection.onChange} />
    </div>
  );
};

const FlowListCard = ({ item, columns, formatMessage, baseUrl, variant, getSelectionProps, selected }) => {
  const mapped = mapFlowListItem(item);
  const title = mapped.title || mapped.code || '-';
  const href = detailPath(baseUrl, mapped.id);
  const actions = renderActions(columns, item);
  const dueText = formatDue(mapped.dueAt);
  const rootClass = [variant === 'mobile' ? styles.flowListMobile : styles.flowListCard, selected ? styles.flowListCardSelected : null].filter(Boolean).join(' ');

  return (
    <article className={rootClass} data-variant={variant}>
      <div className={styles.flowListHead}>
        {getSelectionProps ? <Selection getSelectionProps={getSelectionProps} item={item} /> : null}
        <div className={styles.flowListHeadMain}>
          <h3 className={styles.flowListTitle}>
            {href ? (
              <Link to={href} className={styles.flowListTitleLink} title={title}>
                {title}
              </Link>
            ) : (
              <span title={title}>{title}</span>
            )}
          </h3>
          {mapped.code ? (
            <Typography.Text className={styles.flowListCode} copyable={{ text: mapped.code }} ellipsis={{ tooltip: mapped.code }}>
              {mapped.code}
            </Typography.Text>
          ) : null}
        </div>
        <div className={styles.flowListFlags}>
          {mapped.status.empty ? null : (
            <Tag bordered={false} color={mapped.statusColor}>
              {enumText(formatMessage, mapped.status)}
            </Tag>
          )}
          {mapped.stage.empty ? null : <span className={styles.flowListStage}>{enumText(formatMessage, mapped.stage)}</span>}
        </div>
      </div>
      <dl className={styles.flowListMeta}>
        {mapped.priority.empty ? null : (
          <div className={styles.flowListMetaItem}>
            <dt>{formatMessage({ id: 'adminFlow.columns.priority' })}</dt>
            <dd>
              <Tag bordered={false} color={mapped.priorityColor}>
                {enumText(formatMessage, mapped.priority)}
              </Tag>
            </dd>
          </div>
        )}
        {mapped.owner ? (
          <div className={styles.flowListMetaItem}>
            <dt>{formatMessage({ id: 'adminFlow.columns.owner' })}</dt>
            <dd title={mapped.owner}>{mapped.owner}</dd>
          </div>
        ) : null}
        {dueText ? (
          <div className={styles.flowListMetaItem}>
            <dt>{formatMessage({ id: 'adminFlow.columns.dueAt' })}</dt>
            <dd>{dueText}</dd>
          </div>
        ) : null}
        {typeof mapped.stayMinutes === 'number' ? (
          <div className={styles.flowListMetaItem}>
            <dt>{formatMessage({ id: 'adminFlow.list.stay' })}</dt>
            <dd>{formatMessage({ id: 'adminFlow.detail.stayMinutes' }, { minutes: mapped.stayMinutes })}</dd>
          </div>
        ) : null}
      </dl>
      {actions ? (
        <div
          className={styles.flowListActions}
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
};

/**
 * @param {object} options
 * @param {function} options.formatMessage
 * @param {string} options.baseUrl
 * @param {'card'|'mobile'} options.variant
 */
export const createFlowListCards = ({ formatMessage, baseUrl, variant }) => {
  const mode = variant === 'mobile' ? 'mobile' : 'card';
  return ({ dataSource, displayDataSource, columns, renderToolbar, rowSelection, getSelectionProps, getRowKey }) => {
    const list = listFromTableProps({ dataSource, displayDataSource });
    const showSelection = !!(rowSelection && typeof getSelectionProps === 'function');
    return (
      <div className={mode === 'mobile' ? styles.flowListShellMobile : styles.flowListShell} data-variant={mode}>
        {typeof renderToolbar === 'function' ? renderToolbar() : null}
        {list.length ? (
          <div className={mode === 'mobile' ? styles.flowListStack : styles.flowListGrid}>
            {list.map((item, index) => {
              const rowKey = typeof getRowKey === 'function' ? getRowKey(item) : item && item.id != null ? item.id : index;
              const selection = showSelection ? getSelectionProps(item) : null;
              return (
                <FlowListCard
                  key={rowKey}
                  item={item}
                  columns={columns}
                  formatMessage={formatMessage}
                  baseUrl={baseUrl}
                  variant={mode}
                  getSelectionProps={showSelection ? getSelectionProps : null}
                  selected={!!(selection && selection.checked)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };
};

export default createFlowListCards;
