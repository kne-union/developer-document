import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { PRIORITY_CODES, priorityMessageId } from '../constants';

// 新建 / 编辑表单。长文本用 components-admin:Editor 的 Markdown 模式，
// 与 AdminDocument/FormInner 保持一致；展示侧用 @kne/markdown-components-render 渲染。
const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo, Editor] = remoteModules;
    const { Input, SuperSelect, DatePicker } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <FormInfo
        list={[
          <Input name="title" label={formatMessage({ id: 'adminFlow.form.title' })} rule="REQ LEN-2-200" placeholder={formatMessage({ id: 'adminFlow.form.titlePlaceholder' })} block />,
          <Editor name="description" label={formatMessage({ id: 'adminFlow.form.description' })} rows={8} block isMarkdown />,
          <SuperSelect
            name="priority"
            label={formatMessage({ id: 'adminFlow.form.priority' })}
            rule="REQ"
            single
            interceptor="object-output-value"
            options={PRIORITY_CODES.map(code => ({ label: formatMessage({ id: priorityMessageId(code) }), value: code }))}
            block
          />,
          <Input name="ownerUserId" label={formatMessage({ id: 'adminFlow.form.ownerUserId' })} placeholder={formatMessage({ id: 'adminFlow.form.ownerPlaceholder' })} block />,
          <DatePicker name="dueAt" label={formatMessage({ id: 'adminFlow.form.dueAt' })} showTime block />
          // 优先级不传时服务端默认 medium；version 由编辑弹窗显式注入，表单不再放隐藏字段
        ]}
      />
    );
  })
);

export default FormInner;
