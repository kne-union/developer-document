import { createWithRemoteLoader } from '@kne/remote-loader';
import { useState } from 'react';
import { App, Button, Flex } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import IconSelect from '@kne/antd-icon-select';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { StatisticSection, ValueSection, HistorySection, TeamMemberSection, CompanyCultureSection } from '@components/About';

const About = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:InfoPage', 'components-core:FormInfo']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset, InfoPage, FormInfo] = remoteModules;
    const { Form, List, SubmitButton, CancelButton } = FormInfo;
    const { Input, InputNumber, TextArea, Avatar, Upload } = FormInfo.fields;
    const [isEdit, setIsEdit] = useState(false);
    const { apis, ajax, setting } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
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
            message.success(formatMessage({ id: 'common.saveSuccess' }));
            setIsEdit(false);
            window.location.reload();
          }}
        >
          <InfoPage.Part title={formatMessage({ id: 'setting.about.partTitle' })}>
            <Flex gap={24} vertical>
              <List
                title={formatMessage({ id: 'setting.about.statisticTitle' })}
                name="statistic"
                maxLength={4}
                minLength={1}
                list={[
                  <IconSelect name="icon" label={formatMessage({ id: 'common.icon' })} />,
                  <InputNumber name="value" label={formatMessage({ id: 'setting.about.dataLabel' })} rule="REQ LEN-0-100" suffix="+" />,
                  <Input name="name" label={formatMessage({ id: 'setting.about.nameLabel' })} rule="LEN-0-500" block />
                ]}
              />
              <List
                title={formatMessage({ id: 'setting.about.coreValuesTitle' })}
                name="coreValues"
                maxLength={3}
                minLength={1}
                list={[
                  <IconSelect name="icon" label={formatMessage({ id: 'common.icon' })} />,
                  <Input name="title" label={formatMessage({ id: 'setting.about.titleLabel' })} rule="REQ LEN-0-100" />,
                  <TextArea name="description" label={formatMessage({ id: 'setting.about.descriptionLabel' })} rule="LEN-0-500" block />
                ]}
              />
              <List
                title={formatMessage({ id: 'setting.about.historyTitle' })}
                name="history"
                minLength={1}
                list={[
                  <Input name="time" label={formatMessage({ id: 'setting.about.timeTitleLabel' })} rule="REQ LEN-0-100" />,
                  <TextArea name="event" label={formatMessage({ id: 'setting.about.eventContentLabel' })} rule="REQ LEN-0-500" block />,
                  <Upload name="images" label={formatMessage({ id: 'setting.about.relatedImagesLabel' })} interceptor="photo-string-list" />
                ]}
              />
              <List
                title={formatMessage({ id: 'setting.about.coreTeamTitle' })}
                name="coreTeam"
                minLength={1}
                list={[
                  <Avatar name="avatar" label={formatMessage({ id: 'setting.about.avatarLabel' })} interceptor="photo-string" block />,
                  <Input name="name" label={formatMessage({ id: 'setting.about.nameLabel2' })} rule="REQ LEN-0-100" />,
                  <Input name="role" label={formatMessage({ id: 'setting.about.roleLabel' })} rule="REQ LEN-0-100" />,
                  <TextArea name="description" label={formatMessage({ id: 'setting.about.introLabel' })} rule="LEN-0-500" block />
                ]}
              />
              <List
                title={formatMessage({ id: 'setting.about.cultureTitle' })}
                name="culture"
                minLength={1}
                list={[
                  <Input name="title" label={formatMessage({ id: 'setting.about.titleLabel' })} rule="REQ LEN-0-100" block />,
                  <TextArea name="description" label={formatMessage({ id: 'setting.about.descriptionLabel' })} rule="LEN-0-500" block />
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
            </Flex>
          </InfoPage.Part>
        </Form>
      );
    }
    return (
      <InfoPage>
        <InfoPage.Part
          title={formatMessage({ id: 'setting.about.partTitle' })}
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
          <InfoPage.Part title={formatMessage({ id: 'setting.about.statisticTitle' })}>
            <StatisticSection data={data.statistic} />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.about.coreValuesTitle' })}>
            <ValueSection data={data.coreValues} />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.about.historyTitle' })}>
            <HistorySection data={data.history} />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.about.coreTeamTitle' })}>
            <TeamMemberSection data={data.coreTeam} />
          </InfoPage.Part>
          <InfoPage.Part title={formatMessage({ id: 'setting.about.cultureTitle' })}>
            <CompanyCultureSection data={data.culture} />
          </InfoPage.Part>
        </InfoPage.Part>
      </InfoPage>
    );
  })
);

export default About;
