import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';

const RightOptions = createWithRemoteLoader({
  modules: ['components-core:Global@GetGlobal', 'components-admin:UserTool']
})(({ remoteModules }) => {
  const [GetGlobal, UserTool] = remoteModules;
  const navigate = useNavigate();

  return (
    <GetGlobal globalKey="userInfo">
      {({ value }) => {
        if (!value) {
          return null;
        }
        const userInfo = value.value;

        return (
          <UserTool
            avatar={userInfo.avatar}
            name={userInfo.nickname}
            email={userInfo.emaill}
            list={[
              {
                iconType: 'icon-shezhi',
                label: '管理端',
                onClick: () => navigate('/admin')
              }
            ]}
          />
        );
      }}
    </GetGlobal>
  );
});

export default RightOptions;
