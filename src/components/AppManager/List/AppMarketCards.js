import classnames from 'classnames';
import { Flex, Typography } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import StatusTag from '../StatusTag';
import style from './style.module.scss';

const { Text, Paragraph } = Typography;

const getItemExtra = (columns, item) => {
  const column = (columns || []).find(col => col.name === 'options' || col.renderType === 'options');
  const value = typeof column?.getValueOf === 'function' ? column.getValueOf(item, { place: 'end' }) : null;
  return value?.children || null;
};

const AppIcon = ({ item, Image }) => {
  if (item.icon && Image?.Avatar) {
    return <Image.Avatar id={item.icon} alt={item.label || item.name} size={72} shape="square" />;
  }
  const initial = String(item.label || item.name || '?')
    .trim()
    .charAt(0)
    .toUpperCase();
  return <div className={style['icon-fallback']}>{initial}</div>;
};

/**
 * TablePage renderCard / renderMobile：应用市场风格卡片网格
 */
const createRenderAppMarketCards =
  ({ Image, navigate, formatMessage }) =>
  ({ dataSource = [], columns, renderToolbar }) => {
    const list = Array.isArray(dataSource) ? dataSource : [];

    return (
      <div className={style['market']}>
        {typeof renderToolbar === 'function' ? renderToolbar() : null}
        {list.length === 0 ? null : (
          <div className={style['grid']}>
            {list.map(item => {
              const title = item.label || item.name;
              const goDetail = () => {
                if (!navigate || !item?.name) {
                  return;
                }
                navigate(`detail?name=${encodeURIComponent(item.name)}`);
              };

              return (
                <article key={item.name || item.id} className={classnames(style['card'], style[`status-${item.status || 'idle'}`])} onClick={goDetail}>
                  <Flex gap={16} align="flex-start" className={style['card-main']}>
                    <div className={style['icon-wrap']}>
                      <AppIcon item={item} Image={Image} />
                    </div>
                    <div className={style['card-body']}>
                      <Flex justify="space-between" align="flex-start" gap={8}>
                        <div className={style['title-block']}>
                          <Text strong className={style['title']} ellipsis>
                            {title}
                          </Text>
                          <Text type="secondary" className={style['app-name']} ellipsis>
                            {item.name}
                          </Text>
                        </div>
                        <StatusTag status={item.status} />
                      </Flex>
                      {item.description ? (
                        <Paragraph type="secondary" className={style['desc']} ellipsis={{ rows: 2 }}>
                          {item.description}
                        </Paragraph>
                      ) : null}
                      {item.port || item.domain ? (
                        <Flex gap={12} wrap="wrap" className={style['meta']}>
                          {item.port ? (
                            <Text type="secondary" className={style['meta-item']}>
                              {formatMessage({ id: 'appManager.columns.port' })} {item.port}
                            </Text>
                          ) : null}
                          {item.domain ? (
                            <Text type="secondary" className={style['meta-item']} ellipsis>
                              {item.domain}
                            </Text>
                          ) : null}
                        </Flex>
                      ) : null}
                    </div>
                  </Flex>
                  <Flex className={style['card-footer']} justify="space-between" align="center" gap={8} onClick={e => e.stopPropagation()}>
                    {item.pathUrl ? (
                      <a className={style['open-link']} href={item.pathUrl} target="_blank" rel="noreferrer">
                        <ExportOutlined /> {formatMessage({ id: 'appManager.list.openApp' })}
                      </a>
                    ) : (
                      <span />
                    )}
                    <div className={style['card-actions']}>{getItemExtra(columns, item)}</div>
                  </Flex>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

export default createRenderAppMarketCards;
