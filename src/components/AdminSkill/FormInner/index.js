import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TYPE_CODES = ['rule', 'skill'];
const CATEGORY_CODES = ['business', 'library', 'process'];
const STATUS_CODES = ['active', 'closed'];

// 新建 / 编辑表单。type + name 是唯一键，编辑态禁用；正文用 Markdown 模式编辑器。
// alwaysApply / globs / keywords 属 MCP 维护的元数据，表单不开放，详情页只读展示。
const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor']
})(
  withLocale(({ remoteModules, isEdit }) => {
    const [FormInfo, Editor] = remoteModules;
    const { Input, TextArea, SuperSelect } = FormInfo.fields;
    const { formatMessage } = useIntl();

    const typeOptions = TYPE_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.type.${code}`, defaultMessage: code }), value: code }));
    const categoryOptions = CATEGORY_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.category.${code}`, defaultMessage: code }), value: code }));
    const statusOptions = STATUS_CODES.map(code => ({ label: formatMessage({ id: `adminSkill.status.${code}`, defaultMessage: code }), value: code }));

    return (
      <FormInfo
        list={[
          <SuperSelect name="type" label={formatMessage({ id: 'adminSkill.form.type' })} rule="REQ" single disabled={isEdit} interceptor="object-output-value" options={typeOptions} block />,
          <Input name="name" label={formatMessage({ id: 'adminSkill.form.name' })} rule="REQ LEN-1-120" disabled={isEdit} placeholder={formatMessage({ id: 'adminSkill.form.namePlaceholder' })} block />,
          <Input name="title" label={formatMessage({ id: 'adminSkill.form.title' })} block />,
          <TextArea name="description" label={formatMessage({ id: 'adminSkill.form.description' })} rows={3} block />,
          <SuperSelect name="category" label={formatMessage({ id: 'adminSkill.form.category' })} single interceptor="object-output-value" options={categoryOptions} block />,
          <SuperSelect name="status" label={formatMessage({ id: 'adminSkill.form.status' })} single interceptor="object-output-value" options={statusOptions} block />,
          <Editor name="content" label={formatMessage({ id: 'adminSkill.form.content' })} rows={14} block isMarkdown />
        ]}
      />
    );
  })
);

export default FormInner;
