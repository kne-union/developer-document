import { createWithRemoteLoader } from '@kne/remote-loader';
import { useState } from 'react';
import { App, Button, Flex } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import IconSelect from '@kne/antd-icon-select';
import { StatisticSection, ValueSection, HistorySection, TeamMemberSection, CompanyCultureSection } from '@components/About';

const About = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:InfoPage', 'components-core:FormInfo']
})(({ remoteModules }) => {
  const [usePreset, InfoPage, FormInfo] = remoteModules;
  const { Form, List, TableList, SubmitButton, CancelButton } = FormInfo;
  const { Input, InputNumber, DatePicker, TextArea, Avatar } = FormInfo.fields;
  const [isEdit, setIsEdit] = useState(false);
  const { apis, ajax, setting } = usePreset();
  const { message } = App.useApp();
  const data = setting['about'];
  if (isEdit) {
    return (
      <Form
        type="default"
        data={data}
        onSubmit={async data => {
          const { data: resData } = await ajax(
            Object.assign({}, apis.setting.saveOrCreate, {
              data: {
                settingKey: 'about',
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
        <InfoPage.Part title="关于我们">
          <Flex gap={24} vertical>
            <List
              title="数据统计"
              name="statistic"
              maxLength={4}
              minLength={1}
              list={[<IconSelect name="icon" label="图标" />, <InputNumber name="value" label="数据" rule="REQ LEN-0-100" suffix="+" />, <Input name="name" label="名称" rule="LEN-0-500" block />]}
            />
            <List
              title="核心价值观"
              name="coreValues"
              maxLength={3}
              minLength={1}
              list={[<IconSelect name="icon" label="图标" />, <Input name="title" label="标题" rule="REQ LEN-0-100" />, <TextArea name="description" label="描述" rule="LEN-0-500" block />]}
            />
            <TableList title="发展历程" name="history" minLength={1} list={[<DatePicker name="time" label="时间" rule="REQ" />, <Input name="event" label="事件" rule="REQ LEN-0-500" />]} />
            <List
              title="核心团队"
              name="coreTeam"
              minLength={1}
              list={[
                <Avatar name="avatar" label="头像" interceptor="photo-string" block />,
                <Input name="name" label="姓名" rule="REQ LEN-0-100" />,
                <Input name="role" label="角色" rule="REQ LEN-0-100" />,
                <TextArea name="description" label="简介" rule="LEN-0-500" block />
              ]}
            />
            <List title="公司文化" name="culture" minLength={1} list={[<Input name="title" label="标题" rule="REQ LEN-0-100" block />, <TextArea name="description" label="描述" rule="LEN-0-500" block />]} />
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
          </Flex>
        </InfoPage.Part>
      </Form>
    );
  }
  return (
    <InfoPage>
      <InfoPage.Part
        title="关于我们"
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
        <InfoPage.Part title="数据统计">
          <StatisticSection data={data.statistic} />
        </InfoPage.Part>
        <InfoPage.Part title="核心价值观">
          <ValueSection data={data.coreValues} />
        </InfoPage.Part>
        <InfoPage.Part title="发展历程">
          <HistorySection data={data.history} />
        </InfoPage.Part>
        <InfoPage.Part title="核心团队">
          <TeamMemberSection data={data.coreTeam} />
        </InfoPage.Part>
        <InfoPage.Part title="公司文化">
          <CompanyCultureSection data={data.culture} />
        </InfoPage.Part>
      </InfoPage.Part>
    </InfoPage>
  );
});

export default About;
