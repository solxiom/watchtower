const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})[Tt]([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(?:\.(\d+))?([Zz]|([+-])([01]\d|2[0-3]):([0-5]\d))$/;

interface Rfc3339Instant {readonly minute: number; readonly second: number; readonly fraction: string;}

/** Strict RFC 3339 full-date + full-time validation, including calendar dates. */
export function isRfc3339DateTime(value: string): boolean {
    return parseRfc3339Instant(value) !== undefined;
}

/** Compare admitted RFC 3339 instants without losing leap seconds or fractional precision. */
export function compareRfc3339DateTimes(left: string, right: string): number | undefined {
    const first = parseRfc3339Instant(left); const second = parseRfc3339Instant(right);
    if (first === undefined || second === undefined) return undefined;
    if (first.minute !== second.minute) return first.minute < second.minute ? -1 : 1;
    if (first.second !== second.second) return first.second < second.second ? -1 : 1;
    const length = Math.max(first.fraction.length, second.fraction.length);
    const firstFraction = first.fraction.padEnd(length, '0'); const secondFraction = second.fraction.padEnd(length, '0');
    return firstFraction === secondFraction ? 0 : firstFraction < secondFraction ? -1 : 1;
}

function parseRfc3339Instant(value: string): Rfc3339Instant | undefined {
    const match = RFC3339.exec(value);
    if (match === null) return undefined;
    const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return undefined;
    const localMinute = dayIndex(year, month, day) * 1440 + Number(match[4]) * 60 + Number(match[5]);
    const direction = match[9] === '-' ? -1 : 1;
    const offset = match[9] === undefined ? 0 : direction * (Number(match[10]) * 60 + Number(match[11]));
    const minute = localMinute - offset; const second = Number(match[6]);
    if (second === 60 && !isUtcMonthEndMinute(minute, year)) return undefined;
    return {minute, second, fraction: match[7] ?? ''};
}

function isUtcMonthEndMinute(minute: number, localYear: number): boolean {
    const utcDay = Math.floor(minute / 1440);
    if (minute - utcDay * 1440 !== 1439) return false;
    for (let year = localYear - 1; year <= localYear + 1; year += 1) {
        for (let month = 1; month <= 12; month += 1) {
            if (utcDay === dayIndex(year, month, daysInMonth(year, month))) return true;
        }
    }
    return false;
}

function daysInMonth(year: number, month: number): number {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function dayIndex(year: number, month: number, day: number): number {
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400); const yearOfEra = adjustedYear - era * 400;
    const adjustedMonth = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
    return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
}
