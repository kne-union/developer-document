import { createWithRemoteLoader } from '@kne/remote-loader';
import { Select } from 'antd';
import * as icons from '@ant-design/icons';
import style from './style.module.scss';

const iconList = Object.keys(icons)
  .filter(name => /(Outlined|Filled|TwoTone)$/.test(name))
  .map(name => {
    const IconComponent = icons[name];
    return { label: <IconComponent />, value: name };
  });

const IconSelectField = props => {
  return (
    <Select
      {...props}
      virtual={false}
      classNames={{
        root: style['icon-select'],
        popup: {
          root: style['icon-select-popup']
        }
      }}
      options={iconList}
      showSearch
      filterOption={(input, option) => {
        return (option?.value || '').toLowerCase().includes(input.toLowerCase());
      }}
    />
  );
};
const IconSelect = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules, ...props }) => {
  const [FormInfo] = remoteModules;
  const { useOnChange } = FormInfo.hooks;
  const render = useOnChange(Object.assign({}, { placeholder: '请选择' + (props.label || '') }, props));
  return render(IconSelectField);
});
export default IconSelect;
