import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import SetStatus from './SetStatus';
import Remove from './Remove';
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
        buttonComponent: SetStatus,
        status: 'published',
        children: formatMessage({ id: 'adminDocument.actions.publish' }),
        message: formatMessage({ id: 'adminDocument.actions.publishConfirm' }),
        isDelete: false,
        hidden: props?.data.status === 'published'
      },
      {
        ...props,
        buttonComponent: SetStatus,
        status: 'draft',
        children: formatMessage({ id: 'adminDocument.actions.unpublish' }),
        message: formatMessage({ id: 'adminDocument.actions.unpublishConfirm' }),
        isDelete: false,
        hidden: props?.data.status !== 'published'
      },
      {
        ...props,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        confirm: true,
        message: formatMessage({ id: 'adminDocument.actions.removeConfirm' })
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
