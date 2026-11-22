import config from '../config/default.js';
// 前端传 Date 对象时，JSON 序列化会得到 UTC 的 ISO 字符串（如 2026-11-08T12:42:45.935Z），
// 而 moment 字段是 VARCHAR，收到什么就存什么，导致库里格式五花八门。
// 这里统一转成配置时区下的 'YYYY-MM-DD HH:mm:ss'。
// 已经是目标格式，无需处理
const PLAIN_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
// 带时区标记（Z 或 +08:00 / +0800），表示绝对时刻
const WITH_TIMEZONE = /(?:z|[+-]\d{2}:?\d{2})$/i;
// 不带时区标记的日期时间，按「墙上时间」处理，只统一分隔符
const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?$/;
const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});
const toZoneString = (date) => {
    const parts = formatter.formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
};
// 把时间值转成 'YYYY-MM-DD HH:mm:ss'，无法识别的值原样返回
export const formatMoment = (value) => {
    if (value instanceof Date || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : toZoneString(date);
    }
    if (typeof value !== 'string') {
        return value;
    }
    const text = value.trim();
    if (PLAIN_PATTERN.test(text)) {
        return text;
    }
    if (WITH_TIMEZONE.test(text)) {
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? value : toZoneString(date);
    }
    const wall = WALL_CLOCK.exec(text);
    if (wall) {
        const time = wall[2].length === 5 ? `${wall[2]}:00` : wall[2];
        return `${wall[1]} ${time}`;
    }
    return value;
};
//# sourceMappingURL=date.js.map