import { createWithRemoteLoader } from '@kne/remote-loader';
import { useState } from 'react';
import { App, Button, Flex, List, Tag } from 'antd';
import { FormOutlined, CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import LanguageCheckList from './LanguageCheckList';

const languageOptions = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

const Advanced = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:FormInfo', 'components-core:InfoPage']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset, FormInfo, InfoPage] = remoteModules;
    const { Form, SubmitButton, CancelButton } = FormInfo;
    const [isEdit, setIsEdit] = useState(false);
    const { apis, ajax, setting } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const data = setting['advanced'] || {};

    if (isEdit) {
      return (
        <Form
          type="default"
          data={data}
          rules={{
            LANGUAGE_REQ: value => ({
              result: !!(value?.selected && value.selected.length > 0),
              errMsg: formatMessage({ id: 'setting.advanced.languageLabel' })
            })
          }}
          onSubmit={async data => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.setting.saveOrCreate, {
                data: {
                  settingKey: 'advanced',
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
            title={formatMessage({ id: 'setting.advanced.languageTitle' })}
            list={[<LanguageCheckList name="languages" label={formatMessage({ id: 'setting.advanced.languageLabel' })} rule="LANGUAGE_REQ" options={languageOptions} block />]}
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

    const languages = data.languages?.selected || ['zh-CN'];
    const defaultLanguage = data.languages?.default || '';

    return (
      <InfoPage>
        <InfoPage.Part
          title={formatMessage({ id: 'setting.advanced.languageTitle' })}
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
          <InfoPage.Part title={formatMessage({ id: 'setting.advanced.languageLabel' })}>
            <List
              bordered
              dataSource={languageOptions}
              renderItem={option => {
                const isSelected = languages.includes(option.value);
                const isDefault = defaultLanguage === option.value;
                return (
                  <List.Item style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{option.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isDefault && (
                        <Tag color="blue" style={{ margin: 0 }}>
                          {formatMessage({ id: 'setting.advanced.defaultTag' })}
                        </Tag>
                      )}
                      {isSelected ? <CheckCircleFilled style={{ color: '#1677ff', fontSize: 18, flexShrink: 0 }} /> : <CheckCircleOutlined style={{ color: '#d9d9d9', fontSize: 18, flexShrink: 0 }} />}
                    </span>
                  </List.Item>
                );
              }}
            />
          </InfoPage.Part>
        </InfoPage.Part>
      </InfoPage>
    );
  })
);

export default Advanced;
