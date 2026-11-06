import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Menu = createWithRemoteLoader({
  modules: ['components-core:Menu']
})(
  withLocale(({ remoteModules, baseUrl = '' }) => {
    const [Menu] = remoteModules;
    const { formatMessage } = useIntl();

    // 菜单默认按 pathname 精确相等匹配，进了子路由（如 /flow/detail/:id）左侧就没有选中项。
    // 这里改成「相等，或以该路径加斜杠开头」，详情页也能保持所属菜单高亮。
    const matchPath = (path, location) => {
      const pathname = String(location.pathname || '').replace(/[#,?].*/, '');
      const target = String(path || '').replace(/\/+$/, '');
      return pathname === target || pathname.startsWith(`${target}/`);
    };

    return (
      <Menu
        pathMatch={matchPath}
        items={[
          {
            label: formatMessage({ id: 'adminDevManagement.install.menuLabel' }),
            key: 'install',
            path: `${baseUrl}/install`
          },
          {
            label: formatMessage({ id: 'app.adminNav.skill' }),
            key: 'skill',
            path: `${baseUrl}/skill`
          },
          {
            label: formatMessage({ id: 'app.adminNav.experience' }),
            key: 'experience',
            path: `${baseUrl}/experience`
          },
          {
            label: formatMessage({ id: 'app.adminNav.worklog' }),
            key: 'worklog',
            path: `${baseUrl}/worklog`
          },
          {
            label: formatMessage({ id: 'app.adminNav.flow' }),
            key: 'flow',
            path: `${baseUrl}/flow`
          },
          {
            label: formatMessage({ id: 'app.adminNav.searchAnalytics' }),
            key: 'search-analytics',
            path: `${baseUrl}/search-analytics`
          }
        ]}
      />
    );
  })
);

export default Menu;
