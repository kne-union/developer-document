import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import { Space } from 'antd';
import withLocale from './withLocale';
import { useIntl } from '@kne/react-intl';
import { useGlobalContext } from '@kne/global-context';

const LanguageSwitch = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-admin:Account@Language']
})(({ remoteModules }) => {
  const [usePreset, Language] = remoteModules;
  const { setting } = usePreset();
  const { locale: currentLocale } = useIntl();
  const { setGlobalValue } = useGlobalContext();

  const languages = setting?.advanced?.languages;
  const selected = languages?.selected || [];

  if (selected.length <= 1) {
    return null;
  }

  return <Language locale={currentLocale} list={selected.map(value => ({ label: value === 'zh-CN' ? '中文' : 'EN', value }))} onChange={value => setGlobalValue('locale', value)} />;
});

const RightOptions = createWithRemoteLoader({
  modules: ['components-core:Global@GetGlobal', 'components-admin:UserTool']
})(
  withLocale(({ remoteModules }) => {
    const [GetGlobal, UserTool] = remoteModules;
    const navigate = useNavigate();
    const { formatMessage } = useIntl();

    return (
      <GetGlobal globalKey="userInfo">
        {({ value }) => {
          if (!value) {
            return <LanguageSwitch />;
          }
          const userInfo = value.value;

          return (
            <Space size={8}>
              <LanguageSwitch />
              <UserTool
                avatar={userInfo.avatar}
                name={userInfo.nickname}
                email={userInfo.emaill}
                list={[
                  {
                    iconType: 'icon-shezhi',
                    label: formatMessage({ id: 'rightOptions.admin' }),
                    onClick: () => navigate('/admin')
                  }
                ]}
              />
            </Space>
          );
        }}
      </GetGlobal>
    );
  })
);

export default RightOptions;
