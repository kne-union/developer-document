import { createWithRemoteLoader } from '@kne/remote-loader';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor', 'components-admin:GroupSelect']
})(({ remoteModules }) => {
  const [FormInfo, Editor, GroupSelect] = remoteModules;
  const { Input, Switch, CheckboxGroup } = FormInfo.fields;

  return (
    <>
      <FormInfo
        list={[
          <Input name="name" label="名称" rule="REQ LEN-0-200" block />,
          <Editor name="content" label="正文" rows={8} block isMarkdown />,
          <GroupSelect name="groups" type="document" label="分组" showAdd />,
          <Switch name="isPublic" label="是否公开" />
        ]}
      />
    </>
  );
});

export default FormInner;
