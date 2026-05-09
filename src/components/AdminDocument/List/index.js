import { useState, useMemo } from 'react';
import { Space } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';

const List = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-admin:GroupSelect@GroupFolder']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [usePreset, GroupFolder] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [selectedGroup, setSelectedGroup] = useState(null);

    const statusOptions = useMemo(
      () => [
        { tab: formatMessage({ id: 'common.all' }), key: 'all' },
        { tab: formatMessage({ id: 'common.draft' }), key: 'draft' },
        { tab: formatMessage({ id: 'common.published' }), key: 'published' }
      ],
      [formatMessage]
    );

    const statusMap = useMemo(() => new Map(statusOptions.map(item => [item.key, item])), [statusOptions]);

    const createStatusFilter = ({ value, label }) => {
      return { name: 'status', value: { label, value } };
    };

    return (
      <GroupFolder type="document" value={selectedGroup} onChange={key => setSelectedGroup(key)}>
        <AdminEntityTablePage
          {...props}
          getApi={apis => apis.document.list}
          buildRequestData={filterValue => {
            const result = Object.assign({}, filterValue, {
              status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
            });

            if (filterValue.createdAt?.value?.[0] && filterValue.createdAt?.value?.[1]) {
              result.createdAtStart = filterValue.createdAt.value[0];
              result.createdAtEnd = filterValue.createdAt.value[1];
            }
            delete result.createdAt;

            if (selectedGroup) {
              result.group = selectedGroup;
            }

            return result;
          }}
          getFilterList={({ SuperSelectUserFilterItem, TypeDateRangePickerFilterItem }) => {
            return [
              [
                <SuperSelectUserFilterItem
                  single
                  label={formatMessage({ id: 'common.publishUser' })}
                  name="createdUserId"
                  api={Object.assign({}, apis.admin.getUserList, {
                    transformData: data => {
                      return Object.assign({}, data, {
                        pageData: (data.pageData || []).map(item =>
                          Object.assign({}, item, {
                            value: item.id,
                            label: item.nickname || item.email || item.phone
                          })
                        )
                      });
                    }
                  })}
                />,
                <TypeDateRangePickerFilterItem label={formatMessage({ id: 'common.createdAt' })} name="createdAt" />
              ]
            ];
          }}
          renderTopArea={({ filterValue, setFilter, StateBar }) => {
            return (
              <StateBar
                type="radio"
                size="small"
                activeKey={filterValue.status || 'all'}
                onChange={value => {
                  const currentState = statusMap.get(value);
                  setFilter(filter => {
                    const nextFilter = filter.slice(0);
                    const currentIndex = filter.findIndex(item => item.name === 'status');

                    if (currentState.key === 'all') {
                      if (currentIndex > -1) {
                        nextFilter.splice(currentIndex, 1);
                      }
                    } else if (currentIndex === -1) {
                      nextFilter.push(createStatusFilter({ value: currentState.key, label: currentState.tab }));
                    } else {
                      nextFilter.splice(currentIndex, 1, createStatusFilter({ value: currentState.key, label: currentState.tab }));
                    }

                    return nextFilter;
                  });
                }}
                stateOption={statusOptions}
              />
            );
          }}
          renderTitleExtra={({ SearchInput, reload }) => {
            return (
              <Space align="center">
                <SearchInput name="keyword" label={formatMessage({ id: 'common.keyword' })} />
                <Create type="primary" onSuccess={reload}>
                  {formatMessage({ id: 'adminDocument.list.addDocument' })}
                </Create>
              </Space>
            );
          }}
          getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
          renderActions={({ item, reload }) => <Actions data={item} onSuccess={reload} />}
        />
      </GroupFolder>
    );
  })
);

export default List;
