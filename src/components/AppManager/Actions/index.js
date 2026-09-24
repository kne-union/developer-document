import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import Remove from './Remove';
import { Start, Stop, Restart } from './Lifecycle';
import UploadVersion from './UploadVersion';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

export const getActionList =
  ({ formatMessage, includeLifecycle = true }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };
    const status = data?.status;
    const list = [
      {
        ...actionProps,
        buttonComponent: Save,
        children: formatMessage({ id: 'common.edit' })
      },
      {
        ...actionProps,
        buttonComponent: UploadVersion,
        children: formatMessage({ id: 'appManager.actions.uploadVersion' })
      }
    ];

    if (includeLifecycle) {
      if (status === 'stopped' || status === 'idle' || status === 'error') {
        list.push({
          ...actionProps,
          buttonComponent: Start,
          children: formatMessage({ id: 'appManager.actions.start' })
        });
      }
      if (status === 'running' || status === 'deploying') {
        list.push({
          ...actionProps,
          buttonComponent: Stop,
          children: formatMessage({ id: 'appManager.actions.stop' })
        });
        list.push({
          ...actionProps,
          buttonComponent: Restart,
          children: formatMessage({ id: 'appManager.actions.restart' })
        });
      }
    }

    list.push({
      ...actionProps,
      buttonComponent: Remove,
      children: formatMessage({ id: 'common.delete' })
    });

    return list;
  };

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup']
})(
  withLocale(props => {
    const [ButtonGroup] = props.remoteModules;
    const { formatMessage } = useIntl();
    const { moreType, children, itemClassName, includeLifecycle = true, ...rest } = props;
    const actionList = getActionList({ formatMessage, includeLifecycle })(rest);

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
export { Save, Remove, Start, Stop, Restart, UploadVersion };
export { default as Deploy } from './Deploy';
