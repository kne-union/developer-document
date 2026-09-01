import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Menu = createWithRemoteLoader({
  modules: ['components-core:Menu']
})(
  withLocale(({ remoteModules, baseUrl = '' }) => {
    const [Menu] = remoteModules;
    const { formatMessage } = useIntl();

    return (
      <Menu
        items={[
          {
            label: formatMessage({ id: 'adminDevManagement.install.menuLabel' }),
            key: 'install',
            path: `${baseUrl}/install`
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
