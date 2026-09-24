import { useCallback, useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@kne/responsive-utils';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import createRenderAppMarketCards from './AppMarketCards';
import style from './style.module.scss';

const STATUS_OPTIONS = ['idle', 'deploying', 'running', 'stopped', 'error'];

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter', 'components-core:Image']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter, Image] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { SuperSelectFilterItem } = Filter.fields;

    const statusOptions = useMemo(
      () =>
        STATUS_OPTIONS.map(value => ({
          value,
          label: formatMessage({ id: `appManager.status.${value}` })
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
              label: formatMessage({ id: 'common.status' }),
              name: 'status',
              options: statusOptions
            }
          }
        ]
      }),
      [SuperSelectFilterItem, statusOptions, formatMessage]
    );

    const getColumnsFn = useCallback(() => getColumns({ navigate, formatMessage, Image }), [navigate, formatMessage, Image]);
    const getActionListFn = useCallback(actionProps => getActionList({ formatMessage })(actionProps), [formatMessage]);

    const renderAppMarketCards = useMemo(() => createRenderAppMarketCards({ Image, navigate, formatMessage }), [Image, navigate, formatMessage]);

    return (
      <div className={style['list-page']}>
        <BizUnit
          {...props}
          isNext
          name="admin-app-manager-list"
          page={menu ? { menu } : undefined}
          apis={{ list: apis.appManager.list, create: apis.appManager.create }}
          getFormInner={() => <FormInner />}
          filter={filter}
          getColumns={getColumnsFn}
          getActionList={getActionListFn}
          options={{
            showLength: isMobile ? 0 : 2,
            createButtonProps: {
              children: formatMessage({ id: 'appManager.list.create' }),
              type: 'primary'
            },
            createFormModalProps: {
              title: formatMessage({ id: 'appManager.create.modalTitle' }),
              size: 'small'
            },
            tableProps: {
              renderCard: renderAppMarketCards,
              renderMobile: renderAppMarketCards,
              pagination: {
                paramsType: 'params'
              }
            }
          }}
        />
      </div>
    );
  })
);

export default List;
