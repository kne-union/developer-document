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
