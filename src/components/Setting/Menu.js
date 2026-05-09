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
            label: formatMessage({ id: 'setting.menu.profile' }),
            key: 'profile',
            path: `${baseUrl}/profile`
          },
          {
            label: formatMessage({ id: 'setting.menu.about' }),
            key: 'about',
            path: `${baseUrl}/about`
          },
          {
            label: formatMessage({ id: 'setting.menu.advanced' }),
            key: 'advanced',
            path: `${baseUrl}/advanced`
          }
        ]}
      />
    );
  })
);

export default Menu;
