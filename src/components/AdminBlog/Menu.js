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
            label: formatMessage({ id: 'adminBlog.menu.list' }),
            key: 'list',
            path: `${baseUrl}/list`
          },
          {
            label: formatMessage({ id: 'adminBlog.menu.leads' }),
            key: 'leads',
            path: `${baseUrl}/leads`
          }
        ]}
      />
    );
  })
);

export default Menu;
