import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import SetStatus from './SetStatus';
import Remove from './Remove';
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
        buttonComponent: SetStatus,
        status: 'published',
        children: formatMessage({ id: 'adminBlog.actions.publish' }),
        message: formatMessage({ id: 'adminBlog.actions.publishConfirm' }),
        isDelete: false,
        hidden: data?.status === 'published'
      },
      {
        ...actionProps,
        buttonComponent: SetStatus,
        status: 'draft',
        children: formatMessage({ id: 'adminBlog.actions.unpublish' }),
        message: formatMessage({ id: 'adminBlog.actions.unpublishConfirm' }),
        isDelete: false,
        hidden: data?.status !== 'published'
      },
      {
        ...actionProps,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        confirm: true,
        message: formatMessage({ id: 'adminBlog.actions.removeConfirm' })
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
