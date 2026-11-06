import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';
import { toSelectOption } from '../selectValue';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TYPE_CODES = ['rule', 'skill'];
const CATEGORY_CODES = ['business', 'library', 'process'];
const STATUS_CODES = ['active', 'closed'];

const buildOptions = (formatMessage, codes, scope) => codes.map(code => ({ label: formatMessage({ id: `adminSkill.${scope}.${code}`, defaultMessage: code }), value: code }));

// 编辑：复用 FormInner；type / name 禁用，SuperSelect 回显需带完整选项对象
const Edit = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [useFormModal, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    const typeOptions = buildOptions(formatMessage, TYPE_CODES, 'type');
    const categoryOptions = buildOptions(formatMessage, CATEGORY_CODES, 'category');
    const statusOptions = buildOptions(formatMessage, STATUS_CODES, 'status');

    return (
      <Button
        {...props}
        onClick={() => {
          formModal({
            title: formatMessage({ id: 'adminSkill.form.editTitle' }),
            size: 'small',
            formProps: {
              data: Object.assign({}, data, {
                type: toSelectOption(data?.type, typeOptions),
                category: toSelectOption(data?.category, categoryOptions),
                status: toSelectOption(data?.status, statusOptions)
              }),
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.skill.update, {
                    data: Object.assign({}, formData, { id: data.id })
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'common.saveSuccess' }));
                onSuccess && onSuccess();
              }
            },
            children: <FormInner isEdit />
          });
        }}
      />
    );
  })
);

// 关闭 / 启用：同一交互，apiKey 决定调哪个接口
const StatusAction = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, apiKey, successMessage, ...props }) => {
    const [ConfirmButton, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();

    return (
      <ConfirmButton
        {...props}
        onClick={async () => {
          const { data: resData } = await ajax(
            Object.assign({}, apis.skill[apiKey], {
              data: { id: data.id }
            })
          );
          if (resData.code !== 0) {
            return;
          }
          message.success(successMessage);
          onSuccess && onSuccess();
        }}
      />
    );
  })
);

// 删除：二次确认
const Remove = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [ConfirmButton, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <ConfirmButton
        {...props}
        onClick={async () => {
          const { data: resData } = await ajax(
            Object.assign({}, apis.skill.delete, {
              data: { id: data.id }
            })
          );
          if (resData.code !== 0) {
            return;
          }
          message.success(formatMessage({ id: 'common.deleteSuccess' }));
          onSuccess && onSuccess();
        }}
      />
    );
  })
);

// 柯里化 getActionList：List 里以函数形式传给 BizUnit
export const getActionList =
  ({ formatMessage }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };

    return [
      {
        ...actionProps,
        buttonComponent: Edit,
        children: formatMessage({ id: 'adminSkill.action.edit' })
      },
      {
        ...actionProps,
        buttonComponent: StatusAction,
        apiKey: 'close',
        children: formatMessage({ id: 'adminSkill.action.close' }),
        message: formatMessage({ id: 'adminSkill.action.closeConfirm' }),
        successMessage: formatMessage({ id: 'adminSkill.action.closeSuccess' }),
        hidden: data?.status === 'closed'
      },
      {
        ...actionProps,
        buttonComponent: StatusAction,
        apiKey: 'reopen',
        children: formatMessage({ id: 'adminSkill.action.reopen' }),
        message: formatMessage({ id: 'adminSkill.action.reopenConfirm' }),
        successMessage: formatMessage({ id: 'adminSkill.action.reopenSuccess' }),
        hidden: data?.status === 'active'
      },
      {
        ...actionProps,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        message: formatMessage({ id: 'adminSkill.action.deleteConfirm' }),
        confirm: true
      }
    ];
  };

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup']
})(
  withLocale(props => {
    const [ButtonGroup] = props.remoteModules;
    const { formatMessage } = useIntl();
    const { children, itemClassName, moreType, ...rest } = props;
    const actionList = getActionList({ formatMessage })(rest);

    if (typeof children === 'function') {
      return children({ itemClassName, moreType, list: actionList });
    }

    return <ButtonGroup itemClassName={itemClassName} list={actionList} moreType={moreType || 'link'} showLength={2} />;
  })
);

export default Actions;
