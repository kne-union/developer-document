import { createWithRemoteLoader } from '@kne/remote-loader';
import { useState } from 'react';
import { Card, Typography, Button, Flex, App } from 'antd';
import { FeatureSection } from '@components/HomePage';
import { FormOutlined } from '@ant-design/icons';
import IconSelect from '@kne/antd-icon-select';
import '@kne/antd-icon-select/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import style from './style.module.scss';

const Profile = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Image', 'components-core:FormInfo', 'components-core:InfoPage', 'components-core:InfoPage@CentralContent', 'components-core:InfoPage@Content']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset, Image, FormInfo, InfoPage, CentralContent, Content] = remoteModules;
    const { Form, List, SubmitButton, CancelButton } = FormInfo;
    const { Input, Avatar, TextArea, ColorPicker } = FormInfo.fields;
    const [isEdit, setIsEdit] = useState(false);
    const { apis, ajax, setting } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const data = setting['profile'];
    if (isEdit) {
      return (
        <Form
          type="default"
          data={data}
          onSubmit={async data => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.setting.saveOrCreate, {
                data: {
                  settingKey: 'profile',
                  settingValue: Object.assign({}, data)
                }
              })
            );
            if (resData.code !== 0) {
              return;
            }
            message.success(formatMessage({ id: 'common.saveSuccess' }));
            setIsEdit(false);
            window.location.reload();
          }}
        >
          <FormInfo
            title={formatMessage({ id: 'setting.profile.systemInfoTitle' })}
            list={[
              <Avatar name="logo" label="Logo" block shape="square" interceptor="photo-string" />,
              <Input label={formatMessage({ id: 'setting.profile.siteNameLabel' })} name="name" rule="REQ LEN-0-100" />,
              <ColorPicker name="theme" label={formatMessage({ id: 'setting.profile.themeColorLabel' })} format="hex" />,
              <Input label="Slogan" name="slogan" rule="REQ LEN-0-500" block />
            ]}
          />
          <List
            name="features"
            title={formatMessage({ id: 'setting.profile.featuresTitle' })}
            minLength={4}
            maxLength={4}
            list={[
              <IconSelect name="icon" label={formatMessage({ id: 'common.icon' })} />,
              <Input label={formatMessage({ id: 'setting.about.titleLabel' })} name="title" rule="REQ LEN-0-500" />,
              <TextArea label={formatMessage({ id: 'setting.about.descriptionLabel' })} name="description" rule="LEN-0-500" block />
            ]}
          />
          <FormInfo
            title={formatMessage({ id: 'setting.profile.relatedInfoTitle' })}
            list={[
              <Input label={formatMessage({ id: 'setting.profile.githubLabel' })} name="github" rule="LEN-0-100" block />,
              <Input label={formatMessage({ id: 'setting.profile.homepageLabel' })} name="homepage" rule="LEN-0-100" block />
            ]}
          />
          <Flex justify="center" gap={12}>
            <SubmitButton>{formatMessage({ id: 'common.save' })}</SubmitButton>
            <CancelButton
              onClick={() => {
                setIsEdit(false);
              }}
            >
              {formatMessage({ id: 'common.cancel' })}
            </CancelButton>
          </Flex>
        </Form>
      );
    }

    return (
      <InfoPage>
        <InfoPage.Part
          title={formatMessage({ id: 'setting.profile.basicInfoTitle' })}
          extra={
            <Button
              type="link"
              icon={<FormOutlined />}
              onClick={() => {
                setIsEdit(true);
              }}
            >
              {formatMessage({ id: 'common.edit' })}
            </Button>
          }
        >
          <InfoPage.Part title={formatMessage({ id: 'setting.profile.systemInfoTitle' })}>
            <CentralContent
              dataSource={data}
              columns={[
                {
                  name: 'logo',
                  title: 'Logo',
                  render: item => <Image.Avatar id={item} alt="logo" size={40} shape="square" />
                },
                {
                  name: 'theme',
                  title: formatMessage({ id: 'setting.profile.themeColorDisplay' }),
                  render: item => <div style={{ width: 40, height: 40, backgroundColor: item, borderRadius: 4 }} />
                },
                {
                  name: 'name',
                  title: formatMessage({ id: 'setting.profile.siteNameDisplay' })
                },
                {
                  name: 'slogan',
                  title: 'Slogan',
                  block: true
                }
              ]}
            />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.profile.featuresTitle' })}>
            <FeatureSection data={data.features} />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.profile.relatedInfoTitle' })}>
            <Card>
              <Content
                className={style['card-content']}
                dataSource={data}
                list={[
                  {
                    label: formatMessage({ id: 'setting.profile.homepageDisplay' }),
                    content: data.homepage ? (
                      <Typography.Link href={data.homepage} target="_blank" rel="noopener noreferrer">
                        {data.homepage}
                      </Typography.Link>
                    ) : (
                      '-'
                    )
                  },
                  {
                    label: 'Github',
                    content: data.github ? (
                      <Typography.Link href={data.github} target="_blank" rel="noopener noreferrer">
                        {data.github}
                      </Typography.Link>
                    ) : (
                      '-'
                    )
                  }
                ]}
              />
            </Card>
          </InfoPage.Part>
        </InfoPage.Part>
      </InfoPage>
    );
  })
);

export default Profile;
