import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
import SetStatus from './SetStatus';
import Remove from './Remove';

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup']
})(({ remoteModules, moreType, children, itemClassName, ...props }) => {
  const [ButtonGroup] = remoteModules;

  const actionList = [
    {
      ...props,
      buttonComponent: Save,
      children: '编辑'
    },
    {
      ...props,
      buttonComponent: SetStatus,
      status: 'published',
      children: '发布',
      message: '确定要发布吗？',
      isDelete: false,
      hidden: props?.data.status === 'published'
    },
    {
      ...props,
      buttonComponent: SetStatus,
      status: 'draft',
      children: '取消发布',
      message: '确定要取消发布吗？',
      isDelete: false,
      hidden: props?.data.status !== 'published'
    },
    {
      ...props,
      buttonComponent: Remove,
      children: '删除',
      confirm: true,
      message: '确定要删除此博客吗？'
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
});

export default Actions;
