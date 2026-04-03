import { createWithRemoteLoader } from '@kne/remote-loader';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useRef, useState } from 'react';

const AdminEntityTablePage = createWithRemoteLoader({
  modules: ['components-core:Layout@TablePage', 'components-core:Filter', 'components-core:Global@usePreset', 'components-core:StateBar']
})(({ remoteModules, baseUrl: propsBaseUrl, getApi, buildRequestData = filterValue => Object.assign({}, filterValue), getFilterList, renderTopArea, renderTitleExtra, getColumns, renderActions, ...pageProps }) => {
  const [TablePage, Filter, usePreset, StateBar] = remoteModules;
  const { apis, ajax } = usePreset();
  const { SearchInput, getFilterValue, fields: filterFields } = Filter;
  const ref = useRef(null);
  const [filter, setFilter] = useState([]);
  const filterValue = getFilterValue(filter);
  const navigate = useNavigate();
  const location = useLocation();

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 3).join('/');
  }, [propsBaseUrl, location.pathname]);

  const reload = () => {
    ref.current?.reload?.();
  };

  const columns = typeof getColumns === 'function' ? getColumns({ navigate, baseUrl, reload, filterValue }) : getColumns || [];
  const filterList = typeof getFilterList === 'function' ? getFilterList({ ...filterFields, SearchInput, filterValue }) : undefined;

  return (
    <TablePage
      {...Object.assign({}, getApi(apis), {
        data: buildRequestData(filterValue, { apis, ajax })
      })}
      ref={ref}
      name="list"
      pagination={{ paramsType: 'params' }}
      topArea={renderTopArea?.({
        filter,
        setFilter,
        filterValue,
        StateBar,
        reload,
        apis,
        ajax
      })}
      page={{
        ...pageProps,
        filter: filterList
          ? {
              value: filter,
              onChange: setFilter,
              list: filterList
            }
          : undefined,
        titleExtra: renderTitleExtra?.({ SearchInput, filterValue, reload, apis, ajax })
      }}
      columns={[
        ...columns,
        ...(renderActions
          ? [
              {
                name: 'options',
                title: '操作',
                type: 'options',
                fixed: 'right',
                valueOf: item => {
                  return {
                    children: renderActions({ item, reload, apis, ajax, filterValue })
                  };
                }
              }
            ]
          : [])
      ]}
    />
  );
});

export default AdminEntityTablePage;
