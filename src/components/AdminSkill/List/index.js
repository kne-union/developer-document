import { useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import FormInner from '../FormInner';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import createAdminListCards from '@components/Shared/createAdminListCards';
import { pickSelectFilterValue } from '../selectValue';

const renderAdminListCards = createAdminListCards();

const TYPE_CODES = ['rule', 'skill'];
const CATEGORY_CODES = ['business', 'library', 'process'];
const STATUS_CODES = ['active', 'closed'];

// 列表：BizUnit 作为容器，筛选走 Filter；技能/规则统一一张表，用 type 区分。
const List = createWithRemoteLoader({
  modules: ['components-admin:BizUnit', 'components-core:Global@usePreset', 'components-core:Filter']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [BizUnit, usePreset, Filter] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const { SuperSelectFilterItem } = Filter.fields;

    const filter = useMemo(
      () => ({
        list: [
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminSkill.columns.type' }),
              name: 'type',
              options: TYPE_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.type.${code}`, defaultMessage: code }), value: code }))
            }
          },
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'adminSkill.columns.category' }),
              name: 'category',
              options: CATEGORY_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.category.${code}`, defaultMessage: code }), value: code }))
            }
          },
          {
            type: SuperSelectFilterItem,
            props: {
              single: true,
              label: formatMessage({ id: 'common.status' }),
              name: 'status',
              options: STATUS_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.status.${code}`, defaultMessage: code }), value: code }))
            }
          }
        ]
      }),
      [SuperSelectFilterItem, formatMessage]
    );

    const options = useMemo(
      () => ({
        createButtonProps: {
          children: formatMessage({ id: 'adminSkill.list.add' }),
          type: 'primary'
        },
        createFormModalProps: {
          title: formatMessage({ id: 'adminSkill.form.createTitle' }),
          size: 'small'
        },
        keywordFilterName: 'keyword',
        keywordFilterLabel: formatMessage({ id: 'adminSkill.list.keywordPlaceholder' }),
        // SuperSelect 筛选值是选项对象，提交前提取成后端要的 code
        mapFilterValue: (value, getFilterValue) => {
          const params = getFilterValue(value);
          const result = Object.assign({}, params);
          ['type', 'category', 'status'].forEach(key => {
            const raw = result[key];
            const picked = pickSelectFilterValue(Array.isArray(raw) ? raw[0] : raw);
            if (picked === undefined) {
              delete result[key];
            } else {
              result[key] = picked;
            }
          });
          return result;
        },
        tableProps: {
          renderMobile: renderAdminListCards,
          renderCard: renderAdminListCards
        }
      }),
      [formatMessage]
    );

    const page = useMemo(
      () => ({
        title: formatMessage({ id: 'adminSkill.list.pageTitle' }),
        menu: menu || null
      }),
      [formatMessage, menu]
    );

    return (
      <BizUnit
        {...props}
        isNext
        name="admin-skill-list"
        page={page}
        apis={{ list: apis.skill.list, create: apis.skill.create }}
        allowKeywordSearch
        getFormInner={() => <FormInner />}
        filter={filter}
        getColumns={() => getColumns({ navigate, formatMessage, baseUrl })}
        getActionList={actionProps => getActionList({ formatMessage })(actionProps)}
        options={options}
      >
        {({ tableOptions }) => <BizUnit.TablePageRender page={page} tableOptions={tableOptions} />}
      </BizUnit>
    );
  })
);

export default List;
