import { useCallback, useMemo, useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter', 'components-admin:GroupSelect@GroupFolder']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter, GroupFolder] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const { SuperSelectUserFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem } = Filter.fields;

    const mapFilterValue = useCallback(
      (value, getFilterValue) => {
        const filterValue = getFilterValue(value);
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
      },
      [selectedGroup]
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
              options: [
                { label: formatMessage({ id: 'common.draft' }), value: 'draft' },
                { label: formatMessage({ id: 'common.published' }), value: 'published' }
              ]
            }
          },
          {
            type: SuperSelectUserFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'common.publishUser' }),
              name: 'createdUserId',
              api: Object.assign({}, apis.admin.getUserList, {
                transformData: data =>
                  Object.assign({}, data, {
                    pageData: (data.pageData || []).map(item =>
                      Object.assign({}, item, {
                        value: item.id,
                        label: item.nickname || item.email || item.phone
                      })
                    )
                  })
              })
            }
          },
          {
            type: TypeDateRangePickerFilterItem,
            props: {
              label: formatMessage({ id: 'common.createdAt' }),
              name: 'createdAt'
            }
          }
        ]
      }),
      [SuperSelectFilterItem, SuperSelectUserFilterItem, TypeDateRangePickerFilterItem, apis, formatMessage]
    );

    return (
      <GroupFolder type="document" value={selectedGroup} onChange={key => setSelectedGroup(key)}>
        <BizUnit
          {...props}
          isNext
          name={selectedGroup ? `admin-document-list-${selectedGroup}` : 'admin-document-list'}
          page={menu ? { menu } : undefined}
          apis={{ list: apis.document.list, create: apis.document.create }}
          getFormInner={() => <FormInner />}
          filter={filter}
          getColumns={() => getColumns({ navigate, formatMessage })}
          getActionList={actionProps => getActionList({ formatMessage })(actionProps)}
          options={{
            createButtonProps: {
              children: formatMessage({ id: 'adminDocument.list.addDocument' }),
              type: 'primary'
            },
            createFormModalProps: {
              title: formatMessage({ id: 'adminDocument.create.modalTitle' })
            },
            mapFilterValue
          }}
        />
      </GroupFolder>
    );
  })
);

export default List;
