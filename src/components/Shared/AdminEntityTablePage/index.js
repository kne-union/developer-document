import React, { useCallback, useMemo, useRef } from 'react';
import { ConfigProvider } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useLocation, useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import convertLegacyColumns from './convertLegacyColumns';

const flattenFilterElements = filterGroups => {
  if (!filterGroups) {
    return [];
  }
  const rows = Array.isArray(filterGroups[0]) ? filterGroups[0] : filterGroups;
  return rows
    .filter(item => React.isValidElement(item))
    .map(item => ({
      type: item.type,
      props: item.props
    }));
};

const getFilterFields = Filter => {
  if (Filter.fields) {
    return Filter.fields;
  }
  const { SearchInput, getFilterValue, fields, ...rest } = Filter;
  return fields || rest;
};

const TitleExtraButton = ({ size, className, children }) => (
  <ConfigProvider componentSize={size}>
    <span className={className} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {children}
    </span>
  </ConfigProvider>
);

const AdminEntityTablePage = createWithRemoteLoader({
  modules: ['components-core:Layout@TablePage', 'components-core:Filter', 'components-core:Global@usePreset', 'components-core:Layout@Page']
})(
  withLocale(
    ({
      remoteModules,
      baseUrl: propsBaseUrl,
      getApi,
      buildRequestData = filterValue => Object.assign({}, filterValue),
      getFilterList,
      renderTitleExtra,
      getColumns,
      getActionList,
      pageTitle,
      name = 'admin-entity-list',
      keywordFilterName = 'keyword',
      keywordFilterLabel,
      allowKeywordSearch = true,
      listKey,
      menu,
      ...pageProps
    }) => {
      const [TablePage, Filter, usePreset, Page] = remoteModules;
      const filterFields = getFilterFields(Filter);
      const { apis, ajax } = usePreset();
      const { formatMessage } = useIntl();
      const navigate = useNavigate();
      const location = useLocation();
      const filterValueRef = useRef({});
      const tableRef = useRef(null);

      const baseUrl = useMemo(() => {
        if (propsBaseUrl) {
          return propsBaseUrl;
        }
        const pathParts = location.pathname.split('/').filter(Boolean);
        return `/${pathParts.slice(0, 3).join('/')}`;
      }, [propsBaseUrl, location.pathname]);

      const reload = useCallback(() => {
        tableRef.current?.reload?.();
      }, []);

      const mapFilterValue = useCallback(
        (value, getFilterValue) => {
          const filterValue = Object.assign({}, getFilterValue(value));
          const result = buildRequestData(filterValue, { apis, ajax });
          filterValueRef.current = filterValue;
          return result;
        },
        [apis, ajax, buildRequestData]
      );

      const filterList = useMemo(() => {
        if (!getFilterList) {
          return [];
        }
        return flattenFilterElements(
          getFilterList({
            ...filterFields,
            SearchInput: Filter.SearchInput,
            filterValue: filterValueRef.current
          })
        );
      }, [Filter.SearchInput, filterFields, getFilterList]);

      const columns = useMemo(() => {
        const baseColumns = convertLegacyColumns(typeof getColumns === 'function' ? getColumns({ navigate, baseUrl, reload, filterValue: filterValueRef.current, formatMessage }) : getColumns || []);

        if (!getActionList) {
          return baseColumns;
        }

        const resolveActionList = getActionList({ formatMessage });

        return [
          ...baseColumns,
          {
            name: 'options',
            title: formatMessage({ id: 'shared.adminEntityTable.actionColumnTitle' }),
            renderType: 'options',
            fixed: 'right',
            width: 48,
            min: 40,
            max: 160,
            getValueOf: item => resolveActionList({ data: item, onSuccess: reload })
          }
        ];
      }, [baseUrl, formatMessage, getActionList, getColumns, navigate, reload]);

      const titleExtra = renderTitleExtra?.({
        reload,
        apis,
        ajax,
        filterValue: filterValueRef.current
      });

      const listApi = getApi(apis);
      if (!listApi) {
        return null;
      }

      const userButtonGroup = pageProps.tableProps?.buttonGroup;
      const userButtonList = Array.isArray(userButtonGroup?.list) ? userButtonGroup.list : [];
      const titleExtraList = titleExtra
        ? [
            {
              buttonComponent: TitleExtraButton,
              children: titleExtra
            }
          ]
        : [];
      const buttonGroupList = [...titleExtraList, ...userButtonList];

      const filterConfig = useMemo(
        () => ({
          list: filterList,
          mapFilterValue: (value, getFilterValue) => mapFilterValue(value, getFilterValue || Filter.getFilterValue)
        }),
        [Filter.getFilterValue, filterList, mapFilterValue]
      );

      const tablePage = (
        <TablePage
          key={[name, listKey].filter(v => v !== undefined && v !== null).join('-')}
          ref={tableRef}
          isNext
          name={name}
          {...pageProps.tableProps}
          {...listApi}
          dataFormat={data => ({
            list: data.pageData,
            total: data.totalCount ?? data.total,
            data
          })}
          columns={columns}
          pagination={{
            paramsType: 'params',
            open: true,
            showSizeChanger: true,
            showQuickJumper: true,
            ...pageProps.tableProps?.pagination
          }}
          filter={filterConfig}
          search={
            allowKeywordSearch
              ? {
                  name: keywordFilterName,
                  label: keywordFilterLabel || formatMessage({ id: 'common.keyword' })
                }
              : undefined
          }
          buttonGroup={
            buttonGroupList.length
              ? Object.assign({}, userButtonGroup, {
                  list: buttonGroupList
                })
              : userButtonGroup
          }
        />
      );

      if (menu || pageTitle) {
        return (
          <Page name={name} menu={menu} title={pageTitle}>
            {tablePage}
          </Page>
        );
      }

      return tablePage;
    }
  )
);

export default AdminEntityTablePage;
