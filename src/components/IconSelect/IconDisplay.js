import * as icons from '@ant-design/icons';

const IconDisplay = ({ type, ...props }) => {
  const Icon = icons[type];
  if (!Icon) {
    return null;
  }
  return <Icon {...props} />;
};

export default IconDisplay;
