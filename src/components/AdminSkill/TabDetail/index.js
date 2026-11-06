import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { Card, Descriptions, Divider, Empty, Tag } from 'antd';
import dayjs from 'dayjs';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Actions from '../Actions';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [Page, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams] = useSearchParams();
    const { formatMessage } = useIntl();
    const id = searchParams.get('id');

    const pageProps = {
      ...props,
      menu: menu || null,
      backUrl: baseUrl,
      title: formatMessage({ id: 'adminSkill.list.pageTitle' })
    };

    return (
      <Fetch
        {...Object.assign({}, apis.skill.detail, { params: { id } })}
        render={({ data, reload }) => {
          if (!data) {
            return (
              <Page {...pageProps}>
                <Empty description={formatMessage({ id: 'adminSkill.detail.notFound' })} />
              </Page>
            );
          }

          const typeText = formatMessage({ id: `adminSkill.type.${data.type}`, defaultMessage: data.type });
          const statusText = formatMessage({ id: `adminSkill.status.${data.status}`, defaultMessage: data.status });
          const categoryText = data.category ? formatMessage({ id: `adminSkill.category.${data.category}`, defaultMessage: data.category }) : '-';

          const metaItems = [
            {
              key: 'type',
              label: formatMessage({ id: 'adminSkill.columns.type' }),
              children: <Tag color={data.type === 'rule' ? 'purple' : 'blue'}>{typeText}</Tag>
            },
            {
              key: 'category',
              label: formatMessage({ id: 'adminSkill.columns.category' }),
              children: categoryText
            },
            {
              key: 'status',
              label: formatMessage({ id: 'common.status' }),
              children: <Tag color={data.status === 'active' ? 'success' : 'default'}>{statusText}</Tag>
            },
            {
              key: 'source',
              label: formatMessage({ id: 'adminSkill.columns.source' }),
              children: data.source || '-'
            },
            ...(data.type === 'rule'
              ? [
                  {
                    key: 'alwaysApply',
                    label: formatMessage({ id: 'adminSkill.detail.alwaysApply' }),
                    children: data.alwaysApply ? formatMessage({ id: 'adminSkill.detail.yes' }) : formatMessage({ id: 'adminSkill.detail.no' })
                  },
                  {
                    key: 'globs',
                    label: 'globs',
                    children: (data.globs || []).length ? (data.globs || []).join(', ') : '-'
                  }
                ]
              : []),
            {
              key: 'updatedAt',
              label: formatMessage({ id: 'common.updatedAt' }),
              children: data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm') : '-'
            },
            {
              key: 'description',
              label: formatMessage({ id: 'adminSkill.columns.description' }),
              span: 2,
              children: data.description || '-'
            }
          ];

          return (
            <Page {...pageProps}>
              <Card title={<span>{data.title || data.name}</span>} extra={<Actions data={data} onSuccess={reload} />}>
                <Descriptions column={2} size="small" items={metaItems} />
                <Divider />
                {data.content ? <MarkdownRender>{data.content}</MarkdownRender> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminSkill.detail.emptyContent' })} />}
              </Card>
            </Page>
          );
        }}
      />
    );
  })
);

export default TabDetail;
