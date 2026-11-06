import { useCallback, useMemo, useRef, useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import createAdminListCards from '@components/Shared/createAdminListCards';
import { STAGE_CODES, STATUS_CODES, PRIORITY_CODES, stageMessageId, statusMessageId, priorityMessageId } from '../constants';
import { pickSelectFilterValue } from '../selectValue';
import styles from '../style.module.scss';

// 阶段切换器取值：'all' 表示不按阶段过滤
const ALL_STAGES_KEY = 'all';

const renderAdminListCards = createAdminListCards();

// 列表：BizUnit 作为容器，筛选走 Filter；阶段改为顶部 StateBar(type="step") 切换，不再占用筛选行。
// 侧栏 menu 必须经 BizUnit 的 page 传给内部的 Layout@TablePage，外层另包 Page 会被覆盖。
const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter', 'components-core:StateBar']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter, StateBar] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const { SuperSelectUserFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem } = Filter.fields;
    // 阶段切换是列表的主维度：默认「全部」，切阶段时直接重查列表
    const [activeStage, setActiveStage] = useState(ALL_STAGES_KEY);
    const tableViewRef = useRef(null);

    const filter = useMemo(
      () => ({
        list: [
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminFlow.list.filterStatus' }),
              name: 'status',
              options: STATUS_CODES.map(code => ({ label: formatMessage({ id: statusMessageId(code) }), value: code }))
            }
          },
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminFlow.list.filterPriority' }),
              name: 'priority',
              options: PRIORITY_CODES.map(code => ({ label: formatMessage({ id: priorityMessageId(code) }), value: code }))
            }
          },
          {
            type: SuperSelectUserFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminFlow.list.filterOwner' }),
              name: 'ownerUserId',
              api: Object.assign({}, apis.admin.getUserList, {
                transformData: data =>
                  Object.assign({}, data, {
                    pageData: (data.pageData || []).map(item =>
                      Object.assign({}, item, {
                        value: item.id,
                        label: item.nickname || item.email || item.phone
                      })
                    )
                  })
              })
            }
          },
          {
            type: TypeDateRangePickerFilterItem,
            props: {
              label: formatMessage({ id: 'adminFlow.list.filterDueRange' }),
              name: 'dueRange'
            }
          }
        ]
      }),
      [SuperSelectFilterItem, SuperSelectUserFilterItem, TypeDateRangePickerFilterItem, apis, formatMessage]
    );

    const options = useMemo(
      () => ({
        createButtonProps: {
          children: formatMessage({ id: 'adminFlow.list.add' }),
          type: 'primary'
        },
        createFormModalProps: {
          title: formatMessage({ id: 'adminFlow.form.createTitle' }),
          size: 'small'
        },
        keywordFilterName: 'keyword',
        keywordFilterLabel: formatMessage({ id: 'adminFlow.list.keywordPlaceholder' }),
        // 日期区间拆成服务端字段 dueStart / dueEnd
        mapFilterValue: (value, getFilterValue) => {
          const params = getFilterValue(value);
          const result = Object.assign({}, params);
          // SuperSelect 筛选值是选项对象，提交前提取成后端要的 code
          ['status', 'priority', 'ownerUserId'].forEach(key => {
            const raw = result[key];
            // 这几个筛选项都是 single，组件偶尔会给出单元素数组
            const picked = pickSelectFilterValue(Array.isArray(raw) ? raw[0] : raw);
            if (picked === undefined) delete result[key];
            else result[key] = picked;
          });
          if (params.dueRange?.value?.[0] && params.dueRange?.value?.[1]) {
            result.dueStart = params.dueRange.value[0];
            result.dueEnd = params.dueRange.value[1];
          }
          delete result.dueRange;
          return result;
        },
        tableProps: {
          // 列表按树展示：后端 list 返回的每行都带 parentId，交给 dataType="treeList" 组树。
          // 必须走 TableView：树形的层级缩进与子行底色（is-tree-child）是 @kne/table-view 内置的，
          // 用 Table 渲染时子行不会变色，缩进也吃不到 indentSize
          renderType: 'TableView',
          dataType: 'treeList',
          parentKey: 'parentId',
          rowKey: 'id',
          defaultExpandedKeys: true,
          indentSize: 18,
          // 树形必须先拿到父子同一批数据：分页会把父子拆到两页，树就散架了。
          // 用大页一次取全量，一页装下时分页器自动隐藏；等量级上来再换按根节点懒加载
          pagination: { paramsType: 'params', pageSize: 200, showSizeChanger: false, hideOnSinglePage: true },
          renderMobile: renderAdminListCards,
          renderCard: renderAdminListCards
        }
      }),
      [formatMessage]
    );

    const page = useMemo(
      () => ({
        title: formatMessage({ id: 'adminFlow.list.pageTitle' }),
        menu: menu || null
      }),
      [formatMessage, menu]
    );

    // 顶部阶段栏：全部 + 五个阶段，替代原先筛选行里的「阶段」下拉
    const stageOptions = useMemo(() => [{ tab: formatMessage({ id: 'adminFlow.list.stageAll' }), key: ALL_STAGES_KEY }, ...STAGE_CODES.map(code => ({ tab: formatMessage({ id: stageMessageId(code) }), key: code }))], [formatMessage]);

    // 切阶段走列表 refresh：stage 作为请求参数直传，不塞进筛选值，
    // 这样筛选行里的状态/优先级/负责人等条件不会被重置。
    const handleStageChange = useCallback(key => {
      setActiveStage(key);
      tableViewRef.current?.current?.refresh?.({
        params: { currentPage: 1, stage: key === ALL_STAGES_KEY ? null : key }
      });
    }, []);

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-flow-list"
        page={page}
        apis={{ list: apis.flow.list, create: apis.flow.create }}
        allowKeywordSearch
        getFormInner={() => <FormInner />}
        filter={filter}
        getColumns={() => getColumns({ navigate, formatMessage, baseUrl })}
        // 规范要求：getActionList 必须传函数，勿预调用后把返回值传进去
        getActionList={actionProps => getActionList({ formatMessage })(actionProps)}
        options={options}
      >
        {({ tableOptions }) => {
          // 拿到内部表格实例，切阶段时用它带新参数重查
          tableViewRef.current = tableOptions.ref;
          return (
            <>
              <div className={styles.listStageBar}>
                <StateBar type="step" activeKey={activeStage} onChange={handleStageChange} stateOption={stageOptions} />
              </div>
              <BizUnit.TablePageRender page={page} tableOptions={tableOptions} />
            </>
          );
        }}
      </BizUnit>
    );
  })
);

export default List;
