function relativeDate(dtstr) {
  if (!dtstr) return '暂无数据';
  const dt = new Date(dtstr);
  const dateTimeStamp = dt.getTime();
  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const month = day * 30;
  const now = new Date().getTime();
  const diffValue = now - dateTimeStamp;
  if (diffValue < 0) {
    return;
  }
  const monthC = diffValue / month;
  const weekC = diffValue / (7 * day);
  const dayC = diffValue / day;
  const hourC = diffValue / hour;
  const minC = diffValue / minute;
  const secC = diffValue / second;
  let result;
  if (monthC > 12) {
    const y = dt.getFullYear() + ' 年';
    const m = dt.getMonth() + 1 + ' 月';
    const d = dt.getDate() + ' 日';
    result = [y, m, d].join(' ');
  } else if (monthC >= 1) {
    result = '' + Math.floor(monthC) + ' 个月前';
  } else if (weekC >= 1) {
    result = '' + Math.floor(weekC) + ' 周前';
  } else if (dayC >= 1) {
    result = '' + Math.floor(dayC) + ' 天前';
  } else if (hourC >= 1) {
    result = '' + Math.floor(hourC) + ' 小时前';
  } else if (minC >= 1) {
    result = '' + Math.floor(minC) + ' 分钟前';
  } else result = '' + Math.floor(secC) + ' 秒前';
  return result;
}

export { relativeDate };
