import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import Remove from './Remove';
import Deploy from './Deploy';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

export const getActionList =
  ({ formatMessage }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };
    return [
      {
        ...actionProps,
        buttonComponent: Save,
        children: formatMessage({ id: 'common.edit' })
      },
      {
        ...actionProps,
        buttonComponent: Deploy,
        children: formatMessage({ id: 'adminRemoteComponent.actions.deploy' })
      },
      {
        ...actionProps,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        confirm: true,
        message: formatMessage({ id: 'adminRemoteComponent.actions.removeConfirm' })
      }
    ];
  };

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup']
})(
  withLocale(props => {
    const [ButtonGroup] = props.remoteModules;
    const { formatMessage } = useIntl();
    const { moreType, children, itemClassName, ...rest } = props;
    const actionList = getActionList({ formatMessage })(rest);

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
