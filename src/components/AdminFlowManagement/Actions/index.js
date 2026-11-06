import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';
import Transition from './Transition';
import Pause from './Pause';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { PRIORITY_CODES, priorityMessageId } from '../constants';
import { toSelectOption } from '../selectValue';

// 编辑：复用 FormInner，version 由 data 带入并回传做乐观锁
const Edit = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [useFormModal, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const priorityOptions = PRIORITY_CODES.map(code => ({ label: formatMessage({ id: priorityMessageId(code) }), value: code }));

    return (
      <Button
        {...props}
        onClick={() => {
          formModal({
            title: formatMessage({ id: 'adminFlow.form.editTitle' }),
            size: 'small',
            formProps: {
              // SuperSelect 回显要完整选项对象，不能只给后端的 priority code
              data: Object.assign({}, data, {
                priority: toSelectOption(data?.priority || 'medium', priorityOptions)
              }),
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.flow.update, {
                    data: Object.assign({}, formData, { id: data.id, version: data.version })
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'common.saveSuccess' }));
                onSuccess && onSuccess();
              }
            },
            children: <FormInner />
          });
        }}
      />
    );
  })
);

// 删除：硬删仅非 active 态可见，走 ConfirmButton 二次确认
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
            Object.assign({}, apis.flow.delete, {
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

// 柯里化 getActionList：与 AdminExperience 写法一致，List 里以函数形式传入 BizUnit
export const getActionList =
  ({ formatMessage }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };
    const isActive = data?.status === 'active';
    const isTerminal = data?.status === 'completed' || data?.status === 'archived';
    const isPreRelease = data?.stage === 'pre_release';
    const isPaused = !!data?.pausedAt;

    // 编辑在前、阶段推进在后；低频动作交给 ButtonGroup 的「更多」收起，避免一排按钮堆砌
    return [
      {
        ...actionProps,
        buttonComponent: Edit,
        children: formatMessage({ id: 'adminFlow.action.edit' }),
        hidden: isTerminal
      },
      {
        ...actionProps,
        buttonComponent: Transition,
        action: 'advance',
        type: 'primary',
        children: formatMessage({ id: 'adminFlow.action.advance' }),
        hidden: !isActive || isPreRelease
      },
      {
        ...actionProps,
        buttonComponent: Transition,
        action: 'complete',
        type: 'primary',
        children: formatMessage({ id: 'adminFlow.action.complete' }),
        hidden: !isActive || !isPreRelease
      },
      {
        ...actionProps,
        buttonComponent: Transition,
        action: 'rollback',
        children: formatMessage({ id: 'adminFlow.action.rollback' }),
        hidden: !isActive
      },
      {
        ...actionProps,
        buttonComponent: Pause,
        mode: 'pause',
        children: formatMessage({ id: 'adminFlow.action.pause' }),
        hidden: !isActive || isPaused
      },
      {
        ...actionProps,
        buttonComponent: Pause,
        mode: 'resume',
        children: formatMessage({ id: 'adminFlow.action.resume' }),
        hidden: !isActive || !isPaused
      },
      {
        ...actionProps,
        buttonComponent: Transition,
        action: 'force',
        children: formatMessage({ id: 'adminFlow.action.force' }),
        hidden: !isActive
      },
      {
        ...actionProps,
        buttonComponent: Transition,
        action: 'archive',
        children: formatMessage({ id: 'adminFlow.action.archive' }),
        hidden: isTerminal
      },
      {
        ...actionProps,
        buttonComponent: Remove,
        children: formatMessage({ id: 'adminFlow.action.delete' }),
        message: formatMessage({ id: 'adminFlow.action.deleteConfirm' }),
        confirm: true,
        hidden: isActive
      }
    ];
  };

// 详情页用：直接渲染 ButtonGroup（也可被 BizUnit 的 options 列复用）
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
