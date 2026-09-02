import { createWithRemoteLoader } from '@kne/remote-loader';
import { hasValue } from './renderHelpers';
import styles from './style.module.scss';

const DIMENSION_MESSAGE_ID = {
  requirementFit: 'kneDocumentRecordDetail.dimension.requirementFit',
  implementationQuality: 'kneDocumentRecordDetail.dimension.implementationQuality',
  processCompliance: 'kneDocumentRecordDetail.dimension.processCompliance',
  userSatisfaction: 'kneDocumentRecordDetail.dimension.userSatisfaction'
};

const PRIMARY = '#2563eb';

const toDimensions = (dimensions, formatMessage) => {
  if (!hasValue(dimensions) || typeof dimensions !== 'object') {
    return [];
  }
  return Object.entries(dimensions)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([key, value]) => ({
      key,
      label: DIMENSION_MESSAGE_ID[key] ? formatMessage({ id: DIMENSION_MESSAGE_ID[key] }) : key,
      value
    }));
};

const buildOption = (dimensions, max) => {
  const axisLabelStyle = { color: '#64748b', fontSize: 12 };

  if (dimensions.length < 3) {
    return {
      grid: { top: 16, right: 24, bottom: 8, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        max,
        splitLine: { lineStyle: { color: '#eef2f6' } },
        axisLabel: axisLabelStyle
      },
      yAxis: {
        type: 'category',
        data: dimensions.map(item => item.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: axisLabelStyle
      },
      series: [
        {
          type: 'bar',
          barWidth: 14,
          data: dimensions.map(item => item.value),
          itemStyle: { color: PRIMARY, borderRadius: [0, 7, 7, 0] },
          label: { show: true, position: 'right', color: PRIMARY, fontSize: 12 }
        }
      ]
    };
  }

  return {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: dimensions.map(item => ({ name: item.label, max })),
      radius: '66%',
      center: ['50%', '54%'],
      splitNumber: 4,
      axisName: axisLabelStyle,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } }
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data: [
          {
            value: dimensions.map(item => item.value),
            itemStyle: { color: PRIMARY },
            lineStyle: { color: PRIMARY, width: 2 },
            areaStyle: { color: 'rgba(37, 99, 235, 0.16)' },
            label: { show: true, fontSize: 11, color: PRIMARY }
          }
        ]
      }
    ]
  };
};

const ScoreBoard = createWithRemoteLoader({
  modules: ['components-thirdparty:Echart']
})(({ remoteModules, score, formatMessage }) => {
  const [Echart] = remoteModules;
  const max = score.scale?.max || 10;
  const dimensions = toDimensions(score.dimensions, formatMessage);
  const percent = score.overall != null ? Math.min(100, Math.max(0, (score.overall / max) * 100)) : null;

  return (
    <div className={styles['score-board']}>
      <div className={styles['score-summary']}>
        {score.overall != null ? (
          <>
            <div className={styles['score-value']}>
              {score.overall}
              <span className={styles['score-max']}>/ {max}</span>
            </div>
            <div className={styles['score-bar']}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className={styles['score-caption']}>{formatMessage({ id: 'adminWorklog.tabDetail.score' })}</div>
          </>
        ) : null}
        {hasValue(score.rationale) ? <p className={styles['score-rationale']}>{score.rationale}</p> : null}
      </div>
      {dimensions.length > 0 ? (
        <div className={styles['score-chart']}>
          <div className={styles['sub-label']}>{formatMessage({ id: 'kneDocumentRecordDetail.scoreDimensions' })}</div>
          <Echart className={styles['score-chart-inner']} option={buildOption(dimensions, max)} />
        </div>
      ) : null}
    </div>
  );
});

export default ScoreBoard;
