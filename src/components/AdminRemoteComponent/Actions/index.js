import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import Remove from './Remove';
import Deploy from './Deploy';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup']
})(
  withLocale(({ remoteModules, moreType, children, itemClassName, ...props }) => {
    const [ButtonGroup] = remoteModules;
    const { formatMessage } = useIntl();

    const actionList = [
      {
        ...props,
        buttonComponent: Save,
        children: formatMessage({ id: 'common.edit' })
      },
      {
        ...props,
        buttonComponent: Deploy,
        children: formatMessage({ id: 'adminRemoteComponent.actions.deploy' })
      },
      {
        ...props,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        confirm: true,
        message: formatMessage({ id: 'adminRemoteComponent.actions.removeConfirm' })
      }
    ];

    if (typeof children === 'function') {
      return children({
        itemClassName,
        moreType,
        list: actionList
      });
    }

    return <ButtonGroup itemClassName={itemClassName} list={actionList} moreType={moreType} />;
  })
);

export default Actions;
