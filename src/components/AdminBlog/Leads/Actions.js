import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import EditContent from './EditContent';
import Remove from './Remove';
import OpenSource from './OpenSource';

export const getActionList =
  ({ formatMessage }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };
    return [
      {
        ...actionProps,
        buttonComponent: OpenSource,
        children: formatMessage({ id: 'adminBlog.leads.openSource' }),
        hidden: !data?.sourceUrl
      },
      {
        ...actionProps,
        buttonComponent: EditContent,
        children: formatMessage({ id: 'adminBlog.leads.editContent' }),
        hidden: data?.status === 'completed'
      },
      {
        ...actionProps,
        buttonComponent: Remove,
        children: formatMessage({ id: 'common.delete' }),
        confirm: true,
        message: formatMessage({ id: 'adminBlog.leads.removeConfirm' })
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
