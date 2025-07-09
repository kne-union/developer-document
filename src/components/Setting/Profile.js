import { createWithRemoteLoader } from '@kne/remote-loader';
import { useState } from 'react';
import { Card, Typography, Button, Flex, App } from 'antd';
import { FeatureSection } from '@components/HomePage';
import { FormOutlined } from '@ant-design/icons';
import IconSelect from '@kne/antd-icon-select';
import '@kne/antd-icon-select/dist/index.css';
import style from './style.module.scss';

const Profile = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Image', 'components-core:FormInfo', 'components-core:InfoPage', 'components-core:InfoPage@CentralContent', 'components-core:InfoPage@Content']
})(({ remoteModules }) => {
  const [usePreset, Image, FormInfo, InfoPage, CentralContent, Content] = remoteModules;
  const { Form, List, SubmitButton, CancelButton } = FormInfo;
  const { Input, Avatar, TextArea, ColorPicker } = FormInfo.fields;
  const [isEdit, setIsEdit] = useState(false);
  const { apis, ajax, setting } = usePreset();
  const { message } = App.useApp();
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
          message.success('保存成功');
          setIsEdit(false);
          window.location.reload();
        }}
      >
        <FormInfo
          title="系统信息"
          list={[
            <Avatar name="logo" label="Logo" block shape="square" interceptor="photo-string" />,
            <Input label="站点名称" name="name" rule="REQ LEN-0-100" />,
            <ColorPicker name="theme" label="主题色" format="hex" />,
            <Input label="Slogan" name="slogan" rule="REQ LEN-0-500" block />
          ]}
        />
        <List
          name="features"
          title="特性"
          minLength={4}
          maxLength={4}
          list={[<IconSelect name="icon" label="图标" />, <Input label="标题" name="title" rule="REQ LEN-0-500" />, <TextArea label="描述" name="description" rule="LEN-0-500" block />]}
        />
        <FormInfo title="关联信息" list={[<Input label="Github地址" name="github" rule="LEN-0-100" block />, <Input label="主页" name="homepage" rule="LEN-0-100" block />]} />
        <Flex justify="center" gap={12}>
          <SubmitButton>保存</SubmitButton>
          <CancelButton
            onClick={() => {
              setIsEdit(false);
            }}
          >
            取消
          </CancelButton>
        </Flex>
      </Form>
    );
  }

  return (
    <InfoPage>
      <InfoPage.Part
        title="基本信息"
        extra={
          <Button
            type="link"
            icon={<FormOutlined />}
            onClick={() => {
              setIsEdit(true);
            }}
          >
            编辑
          </Button>
        }
      >
        <InfoPage.Part title="系统信息">
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
                title: '主题色',
                render: item => <div style={{ width: 40, height: 40, backgroundColor: item, borderRadius: 4 }} />
              },
              {
                name: 'name',
                title: '站点名称'
              },
              {
                name: 'slogan',
                title: 'Slogan',
                block: true
              }
            ]}
          />
        </InfoPage.Part>
        <InfoPage.Part title="特性">
          <FeatureSection data={data.features} />
        </InfoPage.Part>
        <InfoPage.Part title="关联信息">
          <Card>
            <Content
              className={style['card-content']}
              dataSource={data}
              list={[
                {
                  label: '主页',
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
});

export default Profile;
