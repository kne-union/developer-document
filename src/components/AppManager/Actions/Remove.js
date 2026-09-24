import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Remove = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();

    const doRemove = async (extra = {}) => {
      const { data: resData } = await ajax(
        Object.assign({}, apis.appManager.remove, {
          data: {
            name: data.name,
            exportBeforeRemove: true,
            cleanupData: true,
            ...extra
          }
        })
      );
      if (resData.code !== 0) {
        message.error(formatMessage({ id: 'common.deleteFailed' }));
        return;
      }
      const result = resData.data || {};
      if (result.removed === false) {
        modal.confirm({
          title: formatMessage({ id: 'appManager.remove.cleanupIncompleteTitle' }),
          width: 720,
          content: (
            <div>
              <p>{formatMessage({ id: 'appManager.remove.cleanupIncompleteContent' })}</p>
              <pre style={{ maxHeight: 280, overflow: 'auto', fontSize: 12 }}>{(result.cleanup?.sql || []).join('\n')}</pre>
            </div>
          ),
          okText: formatMessage({ id: 'appManager.remove.forceRemove' }),
          onOk: async () => {
            await doRemove({ allowRemoveIfCleanupIncomplete: true });
          }
        });
        return;
      }
      message.success(formatMessage({ id: 'common.deleteSuccess' }));
      onSuccess && onSuccess();
    };

    return (
      <Button
        {...props}
        danger
        onClick={() => {
          modal.confirm({
            title: formatMessage({ id: 'appManager.remove.confirmTitle' }),
            content: formatMessage({ id: 'appManager.remove.confirmContent' }, { name: data.label || data.name }),
            onOk: () => doRemove()
          });
        }}
      />
    );
  })
);

export default Remove;
