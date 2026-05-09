import { createWithIntlProvider, localeLoader } from '@kne/react-intl';
import zhCN from './locale/zh-CN';
import enUS from './locale/en-US';

const namespace = 'developer-document';

localeLoader('zh-CN', zhCN, namespace);
localeLoader('en-US', enUS, namespace);

const withLocale = createWithIntlProvider('zh-CN', zhCN, namespace);

export default withLocale;
