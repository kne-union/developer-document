import { createWithRemoteLoader } from '@kne/remote-loader';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { Input, TextArea, Switch, Select } = FormInfo.fields;

  const TYPE_OPTIONS = [
    { label: '前端组件', value: 'frontend' },
    { label: 'NodeJS', value: 'nodejs' },
    { label: '工程化', value: 'engineering' },
    { label: '小程序', value: 'miniprogram' },
    { label: 'Prompts', value: 'prompts' },
    { label: '其他', value: 'other' }
  ];

  return (
    <>
      <Input name="packageName" label="Package Name" rule="REQ LEN-0-200" placeholder="例如: @kne/button" block />
      <Input name="name" label="显示名称" rule="LEN-0-100" placeholder="组件显示名称" block />
      <Select name="type" label="组件类型" options={TYPE_OPTIONS} defaultValue="other" />
      <Input name="registry" label="Registry" rule="LEN-0-500" placeholder="npm registry 地址" block />
      <TextArea name="description" label="描述" rule="LEN-0-1000" placeholder="组件描述信息" block />
      <Switch name="isPublic" label="是否公开" defaultValue={true} />
    </>
  );
});

export default FormInner;
