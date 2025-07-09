
# IconSelect


### 概述

选择Icon图标


### 示例

#### 示例代码

- 这里填写示例标题
- 这里填写示例说明
- _IconSelect(@components/IconSelect),remoteLoader(@kne/remote-loader)

```jsx
const { default: IconSelect, IconDisplay } = _IconSelect;
const { createWithRemoteLoader } = remoteLoader;

const Display = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { formData } = FormInfo.useFormContext();
  return <IconDisplay type={formData?.icon} />;
});

const BaseExample = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { Form } = FormInfo;
  return (
    <Form>
      <Display />
      <IconSelect name="icon" label="Icon" />
    </Form>
  );
});

render(<BaseExample />);

```


### API

|属性名|说明|类型|默认值|
|  ---  | ---  | --- | --- |

