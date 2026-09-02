import { useCallback, useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import { NPM_PACKAGE_TYPE_OPTIONS } from '@components/Shared/catalogMeta';

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const { SuperSelectFilterItem } = Filter.fields;

    const localizedTypeOptions = useMemo(
      () =>
        NPM_PACKAGE_TYPE_OPTIONS.map(item => ({
          ...item,
          label: formatMessage({ id: `shared.catalogMeta.${item.value}` })
        })),
      [formatMessage]
    );

    const filter = useMemo(
      () => ({
        list: [
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'common.type' }),
              name: 'type',
              options: localizedTypeOptions
            }
          }
        ]
      }),
      [SuperSelectFilterItem, localizedTypeOptions, formatMessage]
    );

    const getColumnsFn = useCallback(() => getColumns({ navigate, formatMessage }), [navigate, formatMessage]);
    const getActionListFn = useCallback(actionProps => getActionList({ formatMessage })(actionProps), [formatMessage]);

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-npm-package-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.npmPackage.list, create: apis.npmPackage.create }}
        getFormInner={() => <FormInner />}
        filter={filter}
        getColumns={getColumnsFn}
        getActionList={getActionListFn}
        options={{
          createButtonProps: {
            children: formatMessage({ id: 'adminNpmPackage.list.addComponent' }),
            type: 'primary'
          },
          createFormModalProps: {
            title: formatMessage({ id: 'adminNpmPackage.create.modalTitle' }),
            size: 'small'
          }
        }}
      />
    );
  })
);

export default List;
