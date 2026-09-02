import { useCallback, useMemo, useRef, useState } from 'react';
import { Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import getKneDocumentZipButtonGroupList from '@components/Shared/KneDocumentZipActions';
import { buildPathTreeApis, buildProjectNameFilterApi, buildUserListFilterApi, mapKneDocumentListFilterValue } from '@components/Shared/kneDocumentListFilters';
import useTablePaginationSearchParams from '@components/Shared/useTablePaginationSearchParams';
import styles from './list.module.scss';

const { Search } = Input;
const { Text } = Typography;

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter', 'components-admin:GroupSelect@GroupFolderFilterItem']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter, GroupFolderFilterItem] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const filterValueRef = useRef({});
    const fullTextQueryRef = useRef('');
    const reloadRef = useRef(() => {});
    const [fullTextInput, setFullTextInput] = useState('');
    const { SuperSelectFilterItem } = Filter.fields;
    const pathTreeApis = useMemo(() => ({ groupList: buildPathTreeApis(apis.experience.pathTree) }), [apis.experience.pathTree]);
    const projectNameApi = useMemo(() => buildProjectNameFilterApi(apis.experience.filterOptions), [apis.experience.filterOptions]);
    const userListApi = useMemo(() => buildUserListFilterApi(apis.admin.getUserList), [apis.admin.getUserList]);
    const paginationSearchParams = useTablePaginationSearchParams();

    const handleFilterChange = useCallback(value => {
      filterValueRef.current = value;
    }, []);

    const appendFullTextQuery = useCallback(result => {
      if (fullTextQueryRef.current) {
        result.keyword = fullTextQueryRef.current;
      }
      return result;
    }, []);

    const mapFilterValue = useCallback((value, getFilterValue) => appendFullTextQuery(mapKneDocumentListFilterValue(getFilterValue(value))), [appendFullTextQuery]);

    const handleFullTextSearch = useCallback(value => {
      const nextQuery = (value || '').trim();
      fullTextQueryRef.current = nextQuery;
      setFullTextInput(nextQuery);
      reloadRef.current(nextQuery);
    }, []);

    const handleFullTextInputChange = useCallback(
      event => {
        const nextValue = event.target.value;
        setFullTextInput(nextValue);
        if (!nextValue && fullTextQueryRef.current) {
          handleFullTextSearch('');
        }
      },
      [handleFullTextSearch]
    );

    const filter = useMemo(
      () => ({
        list: [
          {
            type: GroupFolderFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminExperience.columns.path' }),
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
              label: formatMessage({ id: 'adminExperience.columns.category' }),
              name: 'category',
              options: [
                { label: formatMessage({ id: 'adminExperience.category.business' }), value: 'business' },
                { label: formatMessage({ id: 'adminExperience.category.library' }), value: 'library' },
                { label: formatMessage({ id: 'adminExperience.category.process' }), value: 'process' }
              ]
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
              label: formatMessage({ id: 'common.status' }),
              name: 'status',
              options: [
                { label: formatMessage({ id: 'adminExperience.status.active' }), value: 'active' },
                { label: formatMessage({ id: 'adminExperience.status.closed' }), value: 'closed' }
              ]
            }
          }
        ]
      }),
      [GroupFolderFilterItem, SuperSelectFilterItem, formatMessage, pathTreeApis, projectNameApi, userListApi]
    );

    const getColumnsFn = useCallback(() => getColumns({ navigate, formatMessage }), [navigate, formatMessage]);
    const getActionListFn = useCallback(actionProps => getActionList({ formatMessage })(actionProps), [formatMessage]);

    const zipButtonGroupList = useMemo(
      () =>
        getKneDocumentZipButtonGroupList({
          type: 'experience',
          getFilterValue: () => filterValueRef.current,
          buildRequestData: value => appendFullTextQuery(mapKneDocumentListFilterValue(value)),
          onSuccess: () => reloadRef.current(),
          formatMessage
        }),
      [appendFullTextQuery, formatMessage]
    );

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-experience-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.experience.list }}
        filter={filter}
        getColumns={getColumnsFn}
        getActionList={getActionListFn}
        allowKeywordSearch={false}
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
          reloadRef.current = keyword => {
            const nextKeyword = keyword !== undefined ? keyword : fullTextQueryRef.current;
            tableOptions.ref?.current?.refresh?.({
              params: {
                currentPage: 1,
                keyword: nextKeyword
              }
            });
          };
          return (
            <>
              <section className={styles.fullTextSearch}>
                <div className={styles.fullTextSearchInner}>
                  <Text className={styles.fullTextSearchLabel}>
                    <SearchOutlined />
                    {formatMessage({ id: 'adminExperience.list.fullTextSearchLabel' })}
                  </Text>
                  <Search
                    allowClear
                    size="large"
                    enterButton={formatMessage({ id: 'common.search' })}
                    placeholder={formatMessage({ id: 'adminExperience.list.fullTextSearchPlaceholder' })}
                    value={fullTextInput}
                    className={styles.fullTextSearchInput}
                    onChange={handleFullTextInputChange}
                    onClear={() => handleFullTextSearch('')}
                    onSearch={handleFullTextSearch}
                  />
                  <Text className={styles.fullTextSearchHint}>{formatMessage({ id: 'adminExperience.list.fullTextSearchHint' })}</Text>
                </div>
              </section>
              <BizUnit.TablePageRender page={menu ? { menu } : undefined} tableOptions={tableOptions} />
            </>
          );
        }}
      </BizUnit>
    );
  })
);

export default List;
