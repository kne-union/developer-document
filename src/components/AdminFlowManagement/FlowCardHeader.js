/**
 * 流程详情及相关弹窗共用的卡片标题栏。
 * 层级：主标题、次摘要、克制的状态/计数，主/次操作靠右；窄屏换行，不挤标题。
 * 折叠面板的 label 落在按钮里，用 span 避免 button>div；普通卡片用 div。
 * 不绘制左侧装饰条，不在组件里堆 Space。
 */
import styles from './style.module.scss';

export const FlowCardHeader = ({ title, extra, summary, actions, compact, className }) => {
  const Root = compact ? 'span' : 'div';
  const classNames = [styles.flowCardHeader, compact ? styles.flowCardHeaderCompact : null, className].filter(Boolean).join(' ');
  return (
    <Root className={classNames}>
      <Root className={styles.flowCardHeaderMain}>
        <Root className={styles.flowCardHeaderTitleRow}>
          <Root className={styles.flowCardHeaderTitle}>{title}</Root>
          {extra ? <Root className={styles.flowCardHeaderExtra}>{extra}</Root> : null}
        </Root>
        {summary ? <Root className={styles.flowCardHeaderSummary}>{summary}</Root> : null}
      </Root>
      {actions ? (
        <Root
          className={styles.flowCardHeaderActions}
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {actions}
        </Root>
      ) : null}
    </Root>
  );
};

export default FlowCardHeader;
