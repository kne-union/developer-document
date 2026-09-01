import { useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import { getActionList } from '../Actions';
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

    return (
      <GroupFolder type="document" value={selectedGroup} onChange={key => setSelectedGroup(key)}>
        <AdminEntityTablePage
          {...props}
          name="admin-document-list"
          listKey={selectedGroup || 'all'}
          getApi={apis => apis.document.list}
          buildRequestData={filterValue => {
            const result = Object.assign({}, filterValue);

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
          getFilterList={({ SuperSelectUserFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem }) => {
            return [
              [
                <SuperSelectFilterItem
                  single
                  label={formatMessage({ id: 'common.status' })}
                  name="status"
                  options={[
                    { label: formatMessage({ id: 'common.draft' }), value: 'draft' },
                    { label: formatMessage({ id: 'common.published' }), value: 'published' }
                  ]}
                />,
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
          renderTitleExtra={({ reload }) => (
            <Create type="primary" onSuccess={reload}>
              {formatMessage({ id: 'adminDocument.list.addDocument' })}
            </Create>
          )}
          getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
          getActionList={getActionList}
        />
      </GroupFolder>
    );
  })
);

export default List;
