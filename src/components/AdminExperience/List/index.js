import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { getActionList } from '../Actions';
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
        name="admin-experience-list"
        getApi={apis => apis.experience.list}
        getFilterList={({ SuperSelectFilterItem }) => {
          return [
            [
              <SuperSelectFilterItem
                single
                label={formatMessage({ id: 'common.status' })}
                name="status"
                options={[
                  { label: formatMessage({ id: 'adminExperience.status.active' }), value: 'active' },
                  { label: formatMessage({ id: 'adminExperience.status.closed' }), value: 'closed' }
                ]}
              />
            ]
          ];
        }}
        renderTitleExtra={({ reload, filterValue }) => <KneDocumentZipActions type="experience" filterValue={filterValue} onSuccess={reload} />}
        getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
        getActionList={getActionList}
      />
    );
  })
);

export default List;
