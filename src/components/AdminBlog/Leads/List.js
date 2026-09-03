import { useCallback, useMemo } from 'react';
import { App } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import useTablePaginationSearchParams from '@components/Shared/useTablePaginationSearchParams';
import { getActionList } from './Actions';
import getColumns from './getColumns';

const mapLeadFilterValue = (filterValue, getFilterValue) => {
  const resolved = typeof getFilterValue === 'function' ? getFilterValue(filterValue) : filterValue;
  const result = Object.assign({}, resolved || {});
  if (result.status?.value) {
    result.status = result.status.value;
  } else if (result.status && typeof result.status === 'object' && result.status.value === undefined) {
    // SuperSelect 单选偶发直接给 { label, value } 已在上一支处理；兜底清空非法对象
    delete result.status;
  }
  if (!result.status) {
    result.status = 'pending';
  }
  return result;
};

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter']
})(
  withLocale(({ remoteModules, menu }) => {
    const [BizUnit, usePreset, Filter] = remoteModules;
    const { apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const { SuperSelectFilterItem } = Filter.fields;
    const pendingLabel = formatMessage({ id: 'adminBlog.leads.statusPending' });
    const paginationSearchParams = useTablePaginationSearchParams();

    const filter = useMemo(
      () => ({
        // TablePage/TableToolbar 的 filterValue 必须是数组形态，不能用 { status: {...} } 对象
        value: [{ name: 'status', value: { value: 'pending', label: pendingLabel }, label: pendingLabel }],
        list: [
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'common.status' }),
              name: 'status',
              options: [
                { label: pendingLabel, value: 'pending' },
                { label: formatMessage({ id: 'adminBlog.leads.statusCompleted' }), value: 'completed' }
              ]
            }
          }
        ]
      }),
      [SuperSelectFilterItem, formatMessage, pendingLabel]
    );

    const options = useMemo(
      () => ({
        mapFilterValue: mapLeadFilterValue,
        tableProps: {
          pagination: {
            paramsType: 'params',
            searchParams: paginationSearchParams.searchParams,
            setSearchParams: paginationSearchParams.setSearchParams
          }
        }
      }),
      [paginationSearchParams.searchParams, paginationSearchParams.setSearchParams]
    );

    const onTitleClick = useCallback(
      data => {
        if (!data?.sourceUrl) {
          message.warning(formatMessage({ id: 'adminBlog.leads.noSourceUrl' }));
          return;
        }
        window.open(data.sourceUrl, '_blank', 'noopener,noreferrer');
      },
      [formatMessage, message]
    );

    return (
      <BizUnit
        isNext
        name="admin-blog-lead-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.blogLead.list }}
        filter={filter}
        getColumns={() => getColumns({ formatMessage, onTitleClick })}
        getActionList={actionProps => getActionList({ formatMessage })(actionProps)}
        options={options}
      />
    );
  })
);

export default List;
