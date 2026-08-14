# AdminBlog

### 概述

博客管理模块


### 示例(全屏)

#### 示例代码

- 列表页
- 列表页
- remoteLoader(@kne/remote-loader),_AdminBlog(@components/AdminBlog)

```jsx
const { default: List } = _AdminBlog;
const { createWithRemoteLoader } = remoteLoader;
const BaseExample = createWithRemoteLoader({
  modules: ['components-core:Global@PureGlobal', 'components-core:Global@usePreset', 'components-core:Layout']
})(({ remoteModules }) => {
  const [PureGlobal, usePreset, Layout] = remoteModules;
  const { ajax } = usePreset();
  return (
    <PureGlobal
      preset={{
        ajax,
        apis: {
          testApi: {
            getList: {
              loader: () => {
                return {
                  pageData: [
                    {
                      id: 1,
                      name: '测试数据',
                      description: '测试测试测试测试测试测试测试',
                      createdTime: new Date()
                    }
                  ],
                  totalCount: 1
                };
              }
            },
            add: {
              loader: () => {
                return null;
              }
            },
            save: {
              loader: () => {
                return null;
              }
            },
            remove: {
              loader: () => {
                return null;
              }
            }
          }
        }
      }}
    >
      <Layout navigation={{ isFixed: false }}>
        <List />
      </Layout>
    </PureGlobal>
  );
});

render(<BaseExample />);

```

- 表单页
- 表单页
- remoteLoader(@kne/remote-loader),_AdminBlog(@components/AdminBlog)

```jsx
const { FormInner } = _AdminBlog;
const { createWithRemoteLoader } = remoteLoader;
const BaseExample = createWithRemoteLoader({
  modules: ['components-core:FormInfo@Form']
})(({ remoteModules }) => {
  const [Form] = remoteModules;
  return (
    <Form>
      <FormInner />
    </Form>
  );
});

render(<BaseExample />);

```

- 详情页
- 详情页
- remoteLoader(@kne/remote-loader),_AdminBlog(@components/AdminBlog)

```jsx
const { Detail } = _AdminBlog;
const { createWithRemoteLoader } = remoteLoader;
const BaseExample = createWithRemoteLoader({
  modules: ['components-core:Global@PureGlobal', 'components-core:Layout']
})(({ remoteModules }) => {
  const [PureGlobal, Layout] = remoteModules;
  return (
    <PureGlobal
      preset={{
        apis: {
          testApi: {
            getDetail: {
              loader: () => {
                return {
                  id: '1212121212',
                  name: '测试测试测试',
                  description: '描述描述描述描述描述描述描述描述'
                };
              }
            }
          }
        }
      }}
    >
      <Layout navigation={{ isFixed: false }}>
        <Detail optionFixed={false} />
      </Layout>
    </PureGlobal>
  );
});

render(<BaseExample />);

```

- tab详情页
- tab详情页
- remoteLoader(@kne/remote-loader),_AdminBlog(@components/AdminBlog)

```jsx
const { TabDetail } = _AdminBlog;
const { createWithRemoteLoader } = remoteLoader;
const BaseExample = createWithRemoteLoader({
  modules: ['components-core:Global@PureGlobal', 'components-core:Layout']
})(({ remoteModules }) => {
  const [PureGlobal, Layout] = remoteModules;
  return (
    <PureGlobal
      preset={{
        apis: {
          testApi: {
            getDetail: {
              loader: () => {
                return {
                  id: '1212121212',
                  name: '测试测试测试',
                  description: '描述描述描述描述描述描述描述描述'
                };
              }
            }
          }
        }
      }}
    >
      <Layout navigation={{ isFixed: false }}>
        <TabDetail optionFixed={false} />
      </Layout>
    </PureGlobal>
  );
});

render(<BaseExample />);

```

### API

|属性名|说明|类型|默认值|
|  ---  | ---  | --- | --- |
