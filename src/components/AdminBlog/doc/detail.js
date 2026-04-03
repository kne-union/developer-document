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
