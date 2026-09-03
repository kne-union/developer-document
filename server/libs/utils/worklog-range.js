/**
 * 解析工作日志查询的时间范围（默认按 Asia/Shanghai 日历理解「本周/上周」）
 * 优先级：startAt/endAt > week > days > 默认近 7 天
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDateInput = value => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shanghaiYmd = date =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

/** 上海时区下的「当天 0 点」对应的 Date（上海无夏令时，固定 UTC+8） */
const startOfShanghaiDay = date => new Date(`${shanghaiYmd(date)}T00:00:00+08:00`);

const shanghaiWeekdayMon0 = date => {
  // 0=周一 … 6=周日
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(date);
  return { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
};

const resolveWrittenAtRange = ({ startAt, endAt, week, days } = {}) => {
  const explicitStart = parseDateInput(startAt);
  const explicitEnd = parseDateInput(endAt);
  if (explicitStart || explicitEnd) {
    return {
      writtenAtStart: explicitStart || undefined,
      writtenAtEnd: explicitEnd || undefined,
      label: [explicitStart ? shanghaiYmd(explicitStart) : '…', explicitEnd ? shanghaiYmd(explicitEnd) : '…'].join(' ~ ')
    };
  }

  const now = new Date();
  if (week === 'this' || week === 'last') {
    const todayStart = startOfShanghaiDay(now);
    const monOffset = shanghaiWeekdayMon0(now);
    const thisMonday = new Date(todayStart.getTime() - monOffset * DAY_MS);
    const rangeStart = week === 'this' ? thisMonday : new Date(thisMonday.getTime() - 7 * DAY_MS);
    const rangeEndExclusive = week === 'this' ? new Date(thisMonday.getTime() + 7 * DAY_MS) : thisMonday;
    // end 用开区间前一毫秒，便于 Op.lte
    const writtenAtEnd = new Date(rangeEndExclusive.getTime() - 1);
    return {
      writtenAtStart: rangeStart,
      writtenAtEnd,
      label: `${shanghaiYmd(rangeStart)} ~ ${shanghaiYmd(writtenAtEnd)}${week === 'this' ? '（本周）' : '（上周）'}`
    };
  }

  const lookback = Number.isFinite(Number(days)) && Number(days) > 0 ? Number(days) : 7;
  const writtenAtStart = new Date(now.getTime() - lookback * DAY_MS);
  return {
    writtenAtStart,
    writtenAtEnd: now,
    label: `近 ${lookback} 天（${shanghaiYmd(writtenAtStart)} ~ ${shanghaiYmd(now)}）`
  };
};

module.exports = {
  parseDateInput,
  resolveWrittenAtRange,
  shanghaiYmd
};
