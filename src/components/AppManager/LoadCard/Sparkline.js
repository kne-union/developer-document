const WIDTH = 120;
const HEIGHT = 28;

// null 表示该点无数据（如无请求时的 P95），折线在此断开
const Sparkline = ({ values, className }) => {
  const numbers = values.filter(value => typeof value === 'number');
  if (values.length < 2 || !numbers.length) {
    return <svg className={className} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" />;
  }
  const max = Math.max(...numbers);
  const scale = max > 0 ? max : 1;
  const step = WIDTH / (values.length - 1);
  const segments = [];
  let current = [];
  values.forEach((value, index) => {
    if (typeof value !== 'number') {
      if (current.length) {
        segments.push(current);
        current = [];
      }
      return;
    }
    const x = index * step;
    const y = HEIGHT - 2 - (value / scale) * (HEIGHT - 4);
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) {
    segments.push(current);
  }

  return (
    <svg className={className} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      {segments.map((points, index) =>
        points.length === 1 ? (
          <circle key={index} cx={points[0].split(',')[0]} cy={points[0].split(',')[1]} r="1.5" fill="currentColor" />
        ) : (
          <polyline key={index} points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )
      )}
    </svg>
  );
};

export default Sparkline;
