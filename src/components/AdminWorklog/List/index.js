import { useCallback, useMemo, useRef } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import getColumns from './getColumns';
import getKneDocumentZipButtonGroupList from '@components/Shared/KneDocumentZipActions';
import { buildPathTreeApis, buildProjectNameFilterApi, buildUserListFilterApi, mapKneDocumentListFilterValue } from '@components/Shared/kneDocumentListFilters';
import useTablePaginationSearchParams from '@components/Shared/useTablePaginationSearchParams';

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter', 'components-admin:GroupSelect@GroupFolderFilterItem']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter, GroupFolderFilterItem] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const filterValueRef = useRef({});
    const reloadRef = useRef(() => {});
    const { SuperSelectFilterItem, TypeDateRangePickerFilterItem } = Filter.fields;
    const pathTreeApis = useMemo(() => ({ groupList: buildPathTreeApis(apis.worklog.pathTree) }), [apis.worklog.pathTree]);
    const projectNameApi = useMemo(() => buildProjectNameFilterApi(apis.worklog.filterOptions), [apis.worklog.filterOptions]);
    const userListApi = useMemo(() => buildUserListFilterApi(apis.admin.getUserList), [apis.admin.getUserList]);
    const paginationSearchParams = useTablePaginationSearchParams();

    const handleFilterChange = useCallback(value => {
      filterValueRef.current = value;
    }, []);

    const mapFilterValue = useCallback(
      (value, getFilterValue) =>
        mapKneDocumentListFilterValue(getFilterValue(value), {
          dateField: 'writtenAt',
          dateStartKey: 'writtenAtStart',
          dateEndKey: 'writtenAtEnd'
        }),
      []
    );

    const filter = useMemo(
      () => ({
        list: [
          {
            type: GroupFolderFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminWorklog.columns.path' }),
              name: 'pathPrefix',
              overlayWidth: '480px',
              permissions: [],
              apis: pathTreeApis
            }
          },
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminWorklog.columns.project' }),
              name: 'projectName',
              api: projectNameApi
            }
          },
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'common.creator' }),
              name: 'createdUserId',
              api: userListApi
            }
          },
          {
            type: TypeDateRangePickerFilterItem,
            props: {
              label: formatMessage({ id: 'adminWorklog.columns.writtenAt' }),
              name: 'writtenAt'
            }
          }
        ]
      }),
      [GroupFolderFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem, formatMessage, pathTreeApis, projectNameApi, userListApi]
    );

    const getColumnsFn = useCallback(() => getColumns({ navigate, formatMessage }), [navigate, formatMessage]);

    const zipButtonGroupList = useMemo(
      () =>
        getKneDocumentZipButtonGroupList({
          type: 'worklog',
          getFilterValue: () => filterValueRef.current,
          buildRequestData: value =>
            mapKneDocumentListFilterValue(value, {
              dateField: 'writtenAt',
              dateStartKey: 'writtenAtStart',
              dateEndKey: 'writtenAtEnd'
            }),
          onSuccess: () => reloadRef.current(),
          formatMessage
        }),
      [formatMessage]
    );

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-worklog-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.worklog.list }}
        filter={filter}
        getColumns={getColumnsFn}
        onFilterChange={handleFilterChange}
        options={{
          mapFilterValue,
          tableProps: {
            pagination: {
              paramsType: 'params',
              searchParams: paginationSearchParams.searchParams,
              setSearchParams: paginationSearchParams.setSearchParams
            },
            buttonGroup: {
              list: zipButtonGroupList
            }
          }
        }}
      >
        {({ tableOptions }) => {
          reloadRef.current = () =>
            tableOptions.ref?.current?.refresh?.({
              params: { currentPage: 1 }
            });
          return <BizUnit.TablePageRender page={menu ? { menu } : undefined} tableOptions={tableOptions} />;
        }}
      </BizUnit>
    );
  })
);

export default List;
