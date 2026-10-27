import { useMemo } from 'react';
import { WEEKDAYS_SHORT, dayKey, fmtDayNumber, fmtTime, weekdayOf } from '../lib/format.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Two-week strip of days, then the open hours of the chosen day. */
export function SlotPicker({ slots, days = 14, selectedDay, onSelectDay, selectedSlot, onSelectSlot }) {
  const byDay = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const key = dayKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [slots]);

  const strip = useMemo(() => {
    // Noon avoids DST edge cases when stepping by 24h.
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(start.getTime() + i * DAY_MS);
      return { key: dayKey(date), date };
    });
  }, [days]);

  const daySlots = byDay.get(selectedDay) ?? [];

  return (
    <div className="slot-picker">
      <div className="day-strip" role="listbox" aria-label="בחירת יום">
        {strip.map(({ key, date }) => {
          const count = byDay.get(key)?.length ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={selectedDay === key}
              disabled={!count}
              className={`day ${selectedDay === key ? 'is-selected' : ''}`}
              onClick={() => onSelectDay(key)}
            >
              <span className="day__name">{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
              <span className="day__num">{fmtDayNumber(date)}</span>
              <span className="day__dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="hour-grid" role="listbox" aria-label="בחירת שעה">
          {daySlots.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={selectedSlot === s}
              className={`hour ${selectedSlot === s ? 'is-selected' : ''}`}
              onClick={() => onSelectSlot(s)}
            >
              {fmtTime(s)}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small">
          {slots.length ? 'בחרו יום מסומן כדי לראות שעות פנויות' : 'אין כרגע שעות פנויות בשבועיים הקרובים'}
        </p>
      )}
    </div>
  );
}
