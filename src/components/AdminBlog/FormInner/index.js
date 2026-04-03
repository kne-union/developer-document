import { createWithRemoteLoader } from '@kne/remote-loader';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor']
})(({ remoteModules }) => {
  const [FormInfo, Editor] = remoteModules;
  const { Input, TextArea, Switch, DatePicker, CheckboxGroup } = FormInfo.fields;

  return (
    <>
      <FormInfo
        list={[
          <Input name="title" label="标题" rule="REQ LEN-0-200" block />,
          <Editor name="content" label="内容" rule="REQ" rows={8} block />,
          <DatePicker name="publishTime" label="发布时间" placeholder="留空则立即发布" showTime />,
          <CheckboxGroup
            name="groups"
            label="分组"
            options={[
              { value: 'tech', label: '技术' },
              { value: 'life', label: '生活' },
              { value: 'product', label: '产品' },
              { value: 'design', label: '设计' },
              { value: 'other', label: '其他' }
            ]}
          />,
          <Switch name="isPublic" label="是否公开" defaultValue={true} />
        ]}
      />
    </>
  );
});

export default FormInner;
