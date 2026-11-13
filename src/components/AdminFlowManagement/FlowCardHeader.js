/**
 * 流程卡片标题区的完整构成：
 * 1. 首行只有主标题与操作组，沿第一基线对齐；标题不与状态标签挤在同一行。
 * 2. 说明（若有）紧随标题，次级字号与颜色，与标题同一信息组。
 * 3. 状态、必填、来源等辅助信息落在元信息行，间隔点分隔，只用字色区分语义，不堆 Tag / 按钮。
 * 4. 操作组靠右、统一高度；主操作由调用方给主按钮，其余进「更多」。
 * 折叠面板的 label 在 button 内，compact 时全程用 span，避免 button>div / button>h3。
 * 不绘制左侧装饰条。
 */
import styles from './style.module.scss';

const cx = (...names) => names.filter(Boolean).join(' ');

const isVisible = value => value != null && value !== false && value !== '';

/**
 * 元信息行。items: { key, children, tone? }，tone 为 success / error / warning / processing / default。
 */
export const FlowCardMeta = ({ items, className }) => {
  const list = (Array.isArray(items) ? items : []).filter(item => item && isVisible(item.children));
  if (!list.length) {
    return null;
  }
  return (
    <span className={cx(styles.flowCardMeta, className)}>
      {list.map((item, index) => (
        <span key={item.key || index} className={styles.flowCardMetaItem} data-tone={item.tone || undefined}>
          {item.children}
        </span>
      ))}
    </span>
  );
};

export const FlowCardHeader = ({ title, description, meta, actions, compact, className }) => {
  const Root = compact ? 'span' : 'header';
  const Box = compact ? 'span' : 'div';
  const TitleTag = compact ? 'span' : 'h3';
  const DescTag = compact ? 'span' : 'p';

  return (
    <Root className={cx(styles.flowCardHeader, compact ? styles.flowCardHeaderCompact : null, className)}>
      <Box className={styles.flowCardHeaderLead}>
        <Box className={styles.flowCardHeaderHeadline}>
          <TitleTag className={styles.flowCardHeaderTitle}>{title}</TitleTag>
          {actions ? (
            <Box
              className={styles.flowCardHeaderActions}
              onClick={event => {
                event.stopPropagation();
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Box>
        {description ? <DescTag className={styles.flowCardHeaderDescription}>{description}</DescTag> : null}
        {meta ? <Box className={styles.flowCardHeaderMetaSlot}>{meta}</Box> : null}
      </Box>
    </Root>
  );
};

export default FlowCardHeader;
