import { createWithRemoteLoader } from '@kne/remote-loader';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { Input, TextArea, Switch, Select } = FormInfo.fields;

  return (
    <>
      <FormInfo
        list={[
          <Input name="remote" label="组件名称" rule="REQ LEN-0-100" placeholder="例如: @kne/button" block />,
          <Input name="name" label="显示名称" rule="LEN-0-100" placeholder="组件的中文名称" block />,
          <Select name="group" label="组件分类" options={REMOTE_COMPONENT_GROUP_OPTIONS} defaultValue="common" />,
          <Input name="packageName" label="NPM包名" rule="LEN-0-200" placeholder="npm package name" block />,
          <Input name="registry" label="NPM Registry" rule="LEN-0-200" placeholder="npm registry 地址" block />,
          <Input name="url" label="入口文件地址" rule="LEN-0-500" placeholder="远程组件入口地址" block />,
          <TextArea name="description" label="组件描述" rule="LEN-0-500" rows={3} block />,
          <Input name="tpl" label="加载地址模版" placeholder="{{url}}/components/@kne-components/{{remote}}/{{version}}/build" block />,
          <Input name="defaultVersion" label="默认版本" placeholder="例如: 1.0.0" />,
          <Switch name="isPublic" label="是否公开" defaultValue={true} />
        ]}
      />
    </>
  );
});

export default FormInner;
