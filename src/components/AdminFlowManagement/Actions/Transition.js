import { createWithRemoteLoader } from '@kne/remote-loader';
import { Alert, App, Button, List } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { STAGE_CODES, stageMessageId } from '../constants';
import { toSelectOption, selectValueOf, selectValuesOf } from '../selectValue';

const getStageOptions = formatMessage => STAGE_CODES.map(code => ({ label: formatMessage({ id: stageMessageId(code) }), value: code }));

// 流转弹窗内容：先展示准出预检缺项，再渲染目标阶段 / 原因 / 豁免项
const TransitionInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(
  withLocale(({ remoteModules, action, check, nextStage }) => {
    const [FormInfo] = remoteModules;
    const { SuperSelect, TextArea } = FormInfo.fields;
    const { formatMessage } = useIntl();

    const needToStage = ['advance', 'rollback', 'force'].includes(action);
    const needRemarkRequired = ['rollback', 'force', 'archive'].includes(action);
    const missing = check?.missing || [];
    const stageOptions = getStageOptions(formatMessage);

    return (
      <>
        {['advance', 'force', 'complete'].includes(action) ? (
          <Alert
            type={check && !check.canAdvance ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 12 }}
            message={formatMessage({ id: 'adminFlow.transition.missingTitle' })}
            description={missing.length ? <List size="small" dataSource={missing} renderItem={item => <List.Item>{item.name || item.templateCode}</List.Item>} /> : formatMessage({ id: 'adminFlow.transition.missingEmpty' })}
          />
        ) : null}

        <FormInfo
          list={[
            needToStage ? <SuperSelect name="toStage" label={formatMessage({ id: 'adminFlow.transition.toStage' })} rule="REQ" single interceptor="object-output-value" options={stageOptions} block /> : null,
            <TextArea
              name="remark"
              label={formatMessage({ id: 'adminFlow.transition.remark' })}
              rule={needRemarkRequired ? 'REQ LEN-2-500' : 'LEN-0-500'}
              placeholder={formatMessage({ id: 'adminFlow.transition.remarkPlaceholder' })}
              block
            />,
            // 强制推进：勾选要豁免的必交项（用多选代替勾选列表，值即 waivedCodes）
            action === 'force' ? (
              <SuperSelect
                name="waivedCodes"
                label={formatMessage({ id: 'adminFlow.transition.waivedCodes' })}
                // 多选值由 buildPayload 里的 selectValuesOf 收敛成 code 数组：
                // object-output-value 只验证过单对象，数组场景不臆造
                options={missing.map(item => ({ label: item.name || item.templateCode, value: item.templateCode }))}
                block
              />
            ) : null
          ].filter(Boolean)}
        />
      </>
    );
  })
);

const TITLE_IDS = {
  advance: 'adminFlow.transition.advanceTitle',
  rollback: 'adminFlow.transition.rollbackTitle',
  complete: 'adminFlow.transition.completeTitle',
  force: 'adminFlow.transition.forceTitle',
  archive: 'adminFlow.transition.archiveTitle'
};

// 推进 / 回退 / 完成 / 作废 / 强制推进：打开弹窗前先调准出预检
const Transition = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, action, ...props }) => {
    const [useFormModal, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    // 相邻下一阶段，作为推进 / 强制推进的默认目标
    const stageIndex = STAGE_CODES.indexOf(data?.stage);
    const nextStage = STAGE_CODES[Math.min(stageIndex + 1, STAGE_CODES.length - 1)] || STAGE_CODES[0];
    const stageOptions = getStageOptions(formatMessage);

    const buildPayload = formData => {
      const remark = formData.remark || '';
      if (action === 'archive') {
        // 作废走独立接口：{ id, version, reason, cascade }
        return { id: data.id, version: data.version, reason: remark, cascade: false };
      }
      return {
        id: data.id,
        version: data.version,
        toStage: action === 'complete' ? data.stage : selectValueOf(formData.toStage) || nextStage,
        action,
        remark,
        waivedCodes: action === 'force' ? selectValuesOf(formData.waivedCodes) : []
      };
    };

    return (
      <Button
        {...props}
        onClick={async () => {
          // 流转弹窗先调准出预检，把缺项展示在弹窗里
          let check = null;
          if (['advance', 'force', 'complete'].includes(action)) {
            try {
              const { data: resData } = await ajax(
                Object.assign({}, apis.flow.deliverableCheck, {
                  params: { flowId: data.id, fromStage: data.stage, action }
                })
              );
              check = resData?.code === 0 ? resData.data : null;
            } catch (e) {
              check = null;
            }
          }

          formModal({
            title: formatMessage({ id: TITLE_IDS[action] || 'adminFlow.transition.advanceTitle' }),
            size: 'small',
            okText: formatMessage({ id: 'adminFlow.transition.confirmText' }),
            formProps: {
              // 默认目标阶段也要给完整选项对象，否则 SuperSelect 不回显
              data: { toStage: toSelectOption(nextStage, stageOptions) },
              onSubmit: async formData => {
                // 有缺项时禁用普通「推进」，只允许「强制推进」
                if (action === 'advance' && check && !check.canAdvance) {
                  message.warning(formatMessage({ id: 'adminFlow.transition.disabledHint' }));
                  return false;
                }
                const apiConfig = action === 'archive' ? apis.flow.archive : apis.flow.transition;
                const { data: resData } = await ajax(Object.assign({}, apiConfig, { data: buildPayload(formData) }));
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'adminFlow.transition.success' }));
                onSuccess && onSuccess();
              }
            },
            children: <TransitionInner action={action} check={check} nextStage={nextStage} />
          });
        }}
      />
    );
  })
);

export default Transition;
