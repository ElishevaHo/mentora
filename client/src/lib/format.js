const TZ = 'Asia/Jerusalem';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const formatter = (options) => new Intl.DateTimeFormat('he-IL', { timeZone: TZ, ...options });

const longDate = formatter({ weekday: 'long', day: 'numeric', month: 'long' });
const time = formatter({ hour: '2-digit', minute: '2-digit', hour12: false });
const dayNum = formatter({ day: 'numeric' });
const monthShort = formatter({ month: 'short' });
const shortDate = formatter({ day: 'numeric', month: 'numeric', year: '2-digit' });
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
});

export const fmtLongDate = (iso) => longDate.format(new Date(iso));
export const fmtTime = (iso) => time.format(new Date(iso));
export const fmtDayNumber = (iso) => dayNum.format(new Date(iso));
export const fmtMonth = (iso) => monthShort.format(new Date(iso));
export const fmtShortDate = (iso) => shortDate.format(new Date(iso));
export const fmtPrice = (n) => `₪${Number(n).toLocaleString('he-IL')}`;

/** "YYYY-MM-DD" of the given instant, in Israel time. */
export function dayKey(date) {
  const p = Object.fromEntries(parts.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Weekday index (0 = Sunday) of the given instant, in Israel time. */
export function weekdayOf(date) {
  const short = parts.formatToParts(new Date(date)).find((x) => x.type === 'weekday').value;
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
}

export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'אתמול' : `לפני ${days} ימים`;
  return fmtShortDate(iso);
}

export const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

export const STATUS_LABELS = {
  pending: 'ממתין לאישור',
  confirmed: 'מאושר',
  declined: 'נדחה',
  cancelled: 'בוטל',
  done: 'התקיים',
};

export const MODE_LABELS = { online: 'אונליין', in_person: 'פרונטלי' };
