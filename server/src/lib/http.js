export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Throws an HttpError when the condition is falsy. */
export function ensure(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message);
}

export function toId(value) {
  const id = Number(value);
  ensure(Number.isInteger(id) && id > 0, 'מזהה לא תקין', 400);
  return id;
}

export function text(value, { max = 500 } = {}) {
  return String(value ?? '').trim().slice(0, max);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
