import { useCallback, useMemo, useState } from 'react';
import { App } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';

const mapBlogFilterValue = filterValue => {
  const result = Object.assign({}, filterValue);

  if (filterValue.publishTime?.value?.[0] && filterValue.publishTime?.value?.[1]) {
    result.publishTimeStart = filterValue.publishTime.value[0];
    result.publishTimeEnd = filterValue.publishTime.value[1];
  }
  delete result.publishTime;

  if (filterValue.groups) {
    const code = filterValue.groups.value || filterValue.groups;
    if (code) {
      result.group = code;
    }
  }
  delete result.groups;

  return result;
};

const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter] = remoteModules;
    const { apis, ajax } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();
    const { SuperSelectUserFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem } = Filter.fields;

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
            type: SuperSelectFilterItem,
            props: {
              label: formatMessage({ id: 'adminBlog.list.tagLabel' }),
              name: 'groups',
              single: true,
              api: Object.assign({}, apis.group.list, { params: { type: 'blog' } }),
              getSearchProps: ({ searchText }) => ({ filter: { keyword: searchText } }),
              interceptor: {
                input: value => value && { code: value.value, name: value.label },
                output: value => value && { value: value.code, label: value.name }
              },
              pagination: { paramsType: 'params' },
              valueKey: 'code',
              labelKey: 'name'
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
              label: formatMessage({ id: 'adminBlog.list.publishTime' }),
              name: 'publishTime'
            }
          }
        ]
      }),
      [SuperSelectFilterItem, SuperSelectUserFilterItem, TypeDateRangePickerFilterItem, apis, formatMessage]
    );

    const handleTriggerSearch = useCallback(async () => {
      setLoading(true);
      try {
        const { data: resData } = await ajax(apis.blog.triggerSearch);
        if (resData.code === 0) {
          message.success(formatMessage({ id: 'adminBlog.list.searchTaskCreated' }));
        } else {
          message.error(resData.message || formatMessage({ id: 'adminBlog.list.createTaskFailed' }));
        }
      } catch (error) {
        message.error(formatMessage({ id: 'adminBlog.list.createTaskFailed' }));
      } finally {
        setLoading(false);
      }
    }, [ajax, apis.blog.triggerSearch, formatMessage, message]);

    const options = useMemo(
      () => ({
        createButtonProps: {
          children: formatMessage({ id: 'adminBlog.list.addBlog' }),
          type: 'primary'
        },
        createFormModalProps: {
          title: formatMessage({ id: 'adminBlog.create.modalTitle' }),
          size: 'small'
        },
        mapFilterValue: (value, getFilterValue) => mapBlogFilterValue(getFilterValue(value)),
        tableProps: {
          pagination: { paramsType: 'params' },
          buttonGroup: {
            list: [
              {
                children: formatMessage({ id: 'adminBlog.list.manualFetch' }),
                icon: <SyncOutlined spin={loading} />,
                loading,
                onClick: handleTriggerSearch
              }
            ]
          }
        }
      }),
      [formatMessage, handleTriggerSearch, loading]
    );

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-blog-list"
        page={menu ? { menu } : undefined}
        apis={{ list: apis.blog.list, create: apis.blog.create }}
        getFormInner={() => <FormInner />}
        filter={filter}
        getColumns={() => getColumns({ navigate, formatMessage })}
        getActionList={actionProps => getActionList({ formatMessage })(actionProps)}
        options={options}
      />
    );
  })
);

export default List;
