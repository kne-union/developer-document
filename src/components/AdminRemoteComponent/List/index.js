import { useCallback, useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const { SuperSelectFilterItem } = Filter.fields;

    const localizedGroupOptions = useMemo(
      () =>
        REMOTE_COMPONENT_GROUP_OPTIONS.map(item => ({
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
              label: formatMessage({ id: 'adminRemoteComponent.list.categoryFilterLabel' }),
              name: 'group',
              options: localizedGroupOptions
            }
          }
        ]
      }),
      [SuperSelectFilterItem, formatMessage, localizedGroupOptions]
    );

    const getColumnsFn = useCallback(() => getColumns({ navigate, formatMessage }), [navigate, formatMessage]);
    const getActionListFn = useCallback(actionProps => getActionList({ formatMessage })(actionProps), [formatMessage]);

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-remote-component-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.remoteComponent.list, create: apis.remoteComponent.create }}
        getFormInner={() => <FormInner />}
        filter={filter}
        getColumns={getColumnsFn}
        getActionList={getActionListFn}
        options={{
          createButtonProps: {
            children: formatMessage({ id: 'adminRemoteComponent.list.addComponent' }),
            type: 'primary'
          },
          createFormModalProps: {
            title: formatMessage({ id: 'adminRemoteComponent.create.modalTitle' }),
            size: 'small'
          }
        }}
      />
    );
  })
);

export default List;
