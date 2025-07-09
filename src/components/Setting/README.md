
# Setting


### 概述

系统设置


### 示例(全屏)

#### 示例代码

- 这里填写示例标题
- 这里填写示例说明
- _Setting(@components/Setting)

```jsx
const { Menu } = _Setting;
const BaseExample = () => {
  return <Menu />;
};

render(<BaseExample />);

```

- 这里填写示例标题
- 这里填写示例说明
- _Setting(@components/Setting)

```jsx
const { Profile } = _Setting;
const BaseExample = () => {
  return (
    <Profile
      data={{
        name: 'KNE组件库',
        slogan: '一套高质量、可定制的 React 组件库，帮助开发者快速构建现代化的用户界面',
        features: [
          {
            title: '高性能',
            description: '采用现代化的技术栈，确保组件运行高效，提供流畅的用户体验'
          },
          {
            title: '可定制',
            description: '提供丰富的配置选项和主题系统，满足不同项目的个性化需求'
          },
          {
            title: 'API友好',
            description: '简洁一致的API设计，降低学习成本，提高开发效率'
          },
          {
            title: '开源共建',
            description: '开放源代码，欢迎社区贡献，共同打造更好的组件库'
          }
        ],
        homepage: 'https://kne-ui.github.io/',
        github: 'https://github.com/kne-ui/kne'
      }}
    />
  );
};

render(<BaseExample />);

```


### API

|属性名|说明|类型|默认值|
|  ---  | ---  | --- | --- |

