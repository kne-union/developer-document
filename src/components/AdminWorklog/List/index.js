import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import KneDocumentZipActions from '@components/Shared/KneDocumentZipActions';

const List = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();

    return (
      <AdminEntityTablePage
        {...props}
        name="admin-worklog-list"
        getApi={apis => apis.worklog.list}
        buildRequestData={filterValue => {
          const result = Object.assign({}, filterValue);
          if (filterValue.writtenAt?.value?.[0] && filterValue.writtenAt?.value?.[1]) {
            result.writtenAtStart = filterValue.writtenAt.value[0];
            result.writtenAtEnd = filterValue.writtenAt.value[1];
          }
          delete result.writtenAt;
          return result;
        }}
        getFilterList={({ SuperSelectUserFilterItem, TypeDateRangePickerFilterItem }) => {
          return [
            [
              <SuperSelectUserFilterItem
                single
                label={formatMessage({ id: 'common.creator' })}
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
              <TypeDateRangePickerFilterItem label={formatMessage({ id: 'adminWorklog.columns.writtenAt' })} name="writtenAt" />
            ]
          ];
        }}
        renderTitleExtra={({ reload, filterValue }) => (
          <KneDocumentZipActions
            type="worklog"
            filterValue={filterValue}
            buildRequestData={filterValue => {
              const result = Object.assign({}, filterValue);
              if (filterValue.writtenAt?.value?.[0] && filterValue.writtenAt?.value?.[1]) {
                result.writtenAtStart = filterValue.writtenAt.value[0];
                result.writtenAtEnd = filterValue.writtenAt.value[1];
              }
              delete result.writtenAt;
              return result;
            }}
            onSuccess={reload}
          />
        )}
        getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
      />
    );
  })
);

export default List;
