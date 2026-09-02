import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import { HeaderBack, HeaderMeta } from '@components/Shared/KneDocumentRecordDetail/Header';
import KneDocumentRecordDetail, { KneDocumentRecordRawJson, buildKneDocumentPageHeaderMeta } from '@components/Shared/KneDocumentRecordDetail';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@StateBarPage', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, ...props }) => {
    const [StateBarPage, PageHeader, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams, setSearchParams] = useSearchParams();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.worklog.detail, { params: { id: searchParams.get('id') } })}
        render={({ data }) => {
          const activeKey = searchParams.get('tab') || 'detail';
          const { title, meta, tags } = buildKneDocumentPageHeaderMeta({ recordType: 'worklog', data, formatMessage });

          return (
            <StateBarPage
              {...props}
              headerFixed={false}
              header={<PageHeader addonBefore={<HeaderBack baseUrl={baseUrl} />} title={title} info={<HeaderMeta {...meta} formatMessage={formatMessage} />} tags={tags} tagSplit={null} />}
              stateBar={{
                activeKey,
                onChange: key => {
                  const next = new URLSearchParams(searchParams);
                  next.set('tab', key);
                  setSearchParams(next, { replace: true });
                },
                stateOption: [
                  { tab: formatMessage({ id: 'kneDocumentRecordDetail.detail' }), key: 'detail' },
                  { tab: formatMessage({ id: 'adminWorklog.tabDetail.rawJson' }), key: 'raw' }
                ]
              }}
            >
              {activeKey === 'raw' ? <KneDocumentRecordRawJson data={data} /> : <KneDocumentRecordDetail recordType="worklog" data={data} formatMessage={formatMessage} />}
            </StateBarPage>
          );
        }}
      />
    );
  })
);

export default TabDetail;
