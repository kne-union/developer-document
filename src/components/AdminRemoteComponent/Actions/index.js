import { createWithRemoteLoader } from '@kne/remote-loader';
import Save from './Save';
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
      buttonComponent: Remove,
      children: '删除',
      confirm: true,
      message: '确定要删除此远程组件吗？'
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
