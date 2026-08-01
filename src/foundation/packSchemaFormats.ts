/**
 * Complete normative format validators for the pack schema bundle. These enforce
 * the JSON Schema `uuid` and RFC 3339 `date-time` formats that ajv otherwise
 * ignores, rejecting impossible calendar and clock values without normalization.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/u;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function isUuid(value: string): boolean {
    return UUID.test(value);
}

/** RFC 3339 `date-time`: rejects e.g. February 30, hour 24, and out-of-range offsets. */
export function isRfc3339DateTime(value: string): boolean {
    const match = DATE_TIME.exec(value);
    if (match === null) return false;
    const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
    return isValidDate(Number(year), Number(month), Number(day)) &&
        isValidOffset(offsetHour, offsetMinute) &&
        isValidTime({year: Number(year), month: Number(month), day: Number(day),
            hour: Number(hour), minute: Number(minute), second: Number(second), sign, offsetHour, offsetMinute});
}

interface DateTimeParts {
    readonly year: number; readonly month: number; readonly day: number;
    readonly hour: number; readonly minute: number; readonly second: number;
    readonly sign: string | undefined;
    readonly offsetHour: string | undefined; readonly offsetMinute: string | undefined;
}

function isValidDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12 || day < 1) return false;
    return day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
    return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidTime(parts: DateTimeParts): boolean {
    if (parts.hour > 23 || parts.minute > 59 || parts.second > 60) return false;
    // RFC 3339 permits a leap second only at 23:59:60 UTC on the last day of a month.
    return parts.second !== 60 || isLeapSecondInstant(parts);
}

/**
 * True when the local date/time :60, normalized to UTC by the numeric offset
 * (with full calendar rollover), lands on 23:59:60 UTC of a month's last day.
 */
function isLeapSecondInstant(parts: DateTimeParts): boolean {
    const offsetMinutes = parts.offsetHour === undefined || parts.offsetMinute === undefined
        ? 0 : (parts.sign === '-' ? -1 : 1) * (Number(parts.offsetHour) * 60 + Number(parts.offsetMinute));
    const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - offsetMinutes * 60000);
    if (utc.getUTCHours() !== 23 || utc.getUTCMinutes() !== 59) return false;
    const lastDayOfMonth = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() + 1, 0)).getUTCDate();
    return utc.getUTCDate() === lastDayOfMonth;
}

function isValidOffset(offsetHour: string | undefined, offsetMinute: string | undefined): boolean {
    if (offsetHour === undefined || offsetMinute === undefined) return true;
    return Number(offsetHour) <= 23 && Number(offsetMinute) <= 59;
}
