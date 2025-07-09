import { createWithRemoteLoader } from '@kne/remote-loader';

const Menu = createWithRemoteLoader({
  modules: ['components-core:Menu']
})(({ remoteModules, baseUrl = '' }) => {
  const [Menu] = remoteModules;

  return (
    <Menu
      items={[
        {
          label: '基本信息',
          key: 'profile',
          path: `${baseUrl}/profile`
        },
        {
          label: '关于我们',
          key: 'about',
          path: `${baseUrl}/about`
        },
        {
          label: '高级设置',
          key: 'advanced',
          path: `${baseUrl}/advanced`
        }
      ]}
    />
  );
});

export default Menu;
