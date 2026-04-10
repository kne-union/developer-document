import { createWithRemoteLoader } from '@kne/remote-loader';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor', 'components-admin:GroupSelect']
})(({ remoteModules }) => {
  const [FormInfo, Editor, GroupSelect] = remoteModules;
  const { Input, Switch, DatePicker } = FormInfo.fields;

  return (
    <>
      <FormInfo
        list={[
          <Input name="title" label="标题" rule="REQ LEN-0-200" block />,
          <Editor name="content" label="内容" rule="REQ" rows={8} block />,
          <DatePicker name="publishTime" label="发布时间" placeholder="留空则立即发布" showTime />,
          <GroupSelect name="groups" type="blog" label="分组" showAdd />,
          <Switch name="isPublic" label="是否公开" />
        ]}
      />
    </>
  );
});

export default FormInner;
