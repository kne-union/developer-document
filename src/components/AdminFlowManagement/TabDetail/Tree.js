import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useNavigate } from 'react-router-dom';
import { Empty, Typography } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { STATUS_COLOR, stageMessageId, statusMessageId } from '../constants';
import styles from '../style.module.scss';

const { Text } = Typography;

// 拆出来的任务：交给 TableView 的 treeList 模式按 parentId 组装成树，
// 展开/收起、缩进、层级线都由组件负责，不再手工拼缩进空格。
// AI 给出草案之前不提供手工拆分入口。
const Tree = createWithRemoteLoader({
  modules: ['components-core:TablePage@TableView', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, rootId, currentId }) => {
    const [TableView, usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();

    return (
      <Fetch
        {...Object.assign({}, apis.flow.tree, { params: { rootId } })}
        render={({ data }) => {
          const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
          if (!nodes.length) {
            return <Empty description={formatMessage({ id: 'adminFlow.tree.empty' })} />;
          }
          const aggregate = nodes.find(node => node.isAggregate);
          const readiness = typeof aggregate?.convergeReadiness === 'number' ? aggregate.convergeReadiness : null;
          const upstream = aggregate?.upstreamNodeIds?.length || 0;

          return (
            <div className={styles.sectionStack}>
              {aggregate && readiness !== null ? <Text type="secondary">{formatMessage({ id: 'adminFlow.tree.convergeReadiness' }, { done: Math.round(readiness * upstream), total: upstream })}</Text> : null}
              <TableView
                dataSource={nodes}
                // 后端给的是扁平 nodes（含 parentId），treeList 让组件自己组树
                dataType="treeList"
                parentKey="parentId"
                rowKey="id"
                defaultExpandedKeys
                indentSize={18}
                columns={[
                  {
                    name: 'title',
                    title: formatMessage({ id: 'adminFlow.queue.table.task' }),
                    renderType: 'main',
                    // 当前节点：主色浅底 + 「当前」徽标，光标保持默认箭头、不响应点击；
                    // 其余节点是可点的链接样式。render 会接管单元格内容，
                    // 所以这里不再配 hover / onClick（那是列级开关，做不到按行区分）
                    // 长标题一律单行省略（悬停 title 看全称），避免选中块的底色被撑成两行色带
                    render: (value, { dataSource }) => {
                      const isCurrent = String(dataSource?.id) === String(currentId);
                      const title = dataSource?.title || '-';
                      if (isCurrent) {
                        return (
                          <span className={styles.treeNodeCurrent} title={title}>
                            <span className={styles.treeNodeTitle}>{title}</span>
                            <span className={styles.treeNodeBadge}>{formatMessage({ id: 'adminFlow.tree.current' })}</span>
                          </span>
                        );
                      }
                      return (
                        <span
                          className={styles.treeNodeLink}
                          title={title}
                          onClick={() => {
                            if (!dataSource?.id) return;
                            navigate(`${String(baseUrl).replace(/\/$/, '')}/detail/${dataSource.id}`);
                          }}
                        >
                          {title}
                        </span>
                      );
                    }
                  },
                  {
                    name: 'stage',
                    title: formatMessage({ id: 'adminFlow.tree.stage' }),
                    renderType: 'tag-short',
                    width: 120,
                    getValueOf: item => ({ type: 'default', text: formatMessage({ id: stageMessageId(item.stage), defaultMessage: item.stage }) })
                  },
                  {
                    name: 'status',
                    title: formatMessage({ id: 'adminFlow.columns.status' }),
                    renderType: 'status',
                    width: 120,
                    getValueOf: item => ({ type: STATUS_COLOR[item.status] || 'default', text: formatMessage({ id: statusMessageId(item.status), defaultMessage: item.status }) })
                  },
                  {
                    name: 'childrenProgress',
                    title: formatMessage({ id: 'adminFlow.tree.childrenProgress' }),
                    renderType: 'description',
                    width: 110,
                    getValueOf: item => (item.childrenProgress ? `${item.childrenProgress.completed}/${item.childrenProgress.total}` : null)
                  }
                ]}
              />
              <Text type="secondary">{formatMessage({ id: 'adminFlow.tree.decomposeHint' })}</Text>
            </div>
          );
        }}
      />
    );
  })
);

export default Tree;
