import { useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import ActionButton from './ActionButton';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

export const getActionList =
  ({ formatMessage }) =>
  ({ data, onSuccess, ...rest }) => {
    const actionProps = { data, onSuccess, ...rest };
    return [
      {
        ...actionProps,
        buttonComponent: ActionButton,
        apiKey: 'close',
        successMessage: formatMessage({ id: 'adminExperience.actions.closeSuccess' }),
        children: formatMessage({ id: 'adminExperience.actions.close' }),
        message: formatMessage({ id: 'adminExperience.actions.closeConfirm' }),
        hidden: data?.status === 'closed'
      },
      {
        ...actionProps,
        buttonComponent: ActionButton,
        apiKey: 'reopen',
        successMessage: formatMessage({ id: 'adminExperience.actions.reopenSuccess' }),
        children: formatMessage({ id: 'adminExperience.actions.reopen' }),
        message: formatMessage({ id: 'adminExperience.actions.reopenConfirm' }),
        hidden: data?.status === 'active'
      },
      {
        ...actionProps,
        buttonComponent: ActionButton,
        apiKey: 'delete',
        successMessage: formatMessage({ id: 'common.deleteSuccess' }),
        children: formatMessage({ id: 'common.delete' }),
        message: formatMessage({ id: 'adminExperience.actions.deleteConfirm' }),
        confirm: true
      }
    ];
  };

const Actions = createWithRemoteLoader({
  modules: ['components-core:ButtonGroup', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [ButtonGroup] = remoteModules;
    const { formatMessage } = useIntl();

    const actionList = useMemo(() => getActionList({ formatMessage })({ data, onSuccess }), [data?.id, data?.status, formatMessage, onSuccess]);

    return <ButtonGroup list={actionList} showLength={1} />;
  })
);

export default Actions;
