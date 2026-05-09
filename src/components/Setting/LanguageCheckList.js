import { createWithRemoteLoader } from '@kne/remote-loader';
import { List, Tag } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const CheckListField = props => {
  const { value, onChange, options = [] } = props;
  const { formatMessage } = useIntl();
  const selected = value?.selected || [];
  const defaultLang = value?.default || '';

  const handleToggle = option => {
    const isSelected = selected.includes(option.value);
    if (isSelected) {
      if (selected.length <= 1) return;
      const newSelected = selected.filter(v => v !== option.value);
      const newDefault = defaultLang === option.value ? '' : defaultLang;
      onChange({ selected: newSelected, default: newDefault });
    } else {
      onChange({ selected: [...selected, option.value], default: defaultLang });
    }
  };

  const handleSetDefault = (e, option) => {
    e.stopPropagation();
    if (!selected.includes(option.value)) return;
    onChange({ selected, default: defaultLang === option.value ? '' : option.value });
  };

  return (
    <List
      bordered
      dataSource={options}
      renderItem={option => {
        const isSelected = selected.includes(option.value);
        const isDefault = defaultLang === option.value;
        return (
          <List.Item style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => handleToggle(option)}>
            <span style={{ pointerEvents: 'none' }}>{option.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isSelected && (
                <Tag color={isDefault ? 'blue' : 'default'} style={{ margin: 0, cursor: 'pointer' }} onClick={e => handleSetDefault(e, option)}>
                  {isDefault ? formatMessage({ id: 'setting.advanced.defaultTag' }) : formatMessage({ id: 'setting.advanced.setDefault' })}
                </Tag>
              )}
              {isSelected ? (
                <CheckCircleFilled style={{ color: 'var(--primary-color)', fontSize: 18, flexShrink: 0, pointerEvents: 'none' }} />
              ) : (
                <CheckCircleOutlined style={{ color: '#d9d9d9', fontSize: 18, flexShrink: 0, pointerEvents: 'none' }} />
              )}
            </span>
          </List.Item>
        );
      }}
    />
  );
};

const LanguageCheckList = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [FormInfo] = remoteModules;
    const { useOnChange } = FormInfo.hooks;
    const render = useOnChange(props);
    return render(CheckListField);
  })
);

export default LanguageCheckList;
