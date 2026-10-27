// Shape database rows into the camelCase objects the client consumes.

export const USER_COLUMNS = 'id, full_name, email, role, is_blocked, avatar_updated_at, created_at';

export function avatarUrl(id, updatedAt) {
  return updatedAt ? `/api/users/${id}/avatar?v=${new Date(updatedAt).getTime()}` : null;
}

export function toUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isBlocked: row.is_blocked,
    avatarUrl: avatarUrl(row.id, row.avatar_updated_at),
    createdAt: row.created_at,
  };
}

export function toPerson(id, fullName, avatarUpdatedAt) {
  return { id, fullName, avatarUrl: avatarUrl(id, avatarUpdatedAt) };
}

export function toTutorSummary(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: avatarUrl(row.id, row.avatar_updated_at),
    headline: row.headline,
    city: row.city,
    hourlyRate: row.hourly_rate,
    teachesOnline: row.teaches_online,
    teachesInPerson: row.teaches_in_person,
    yearsExperience: row.years_experience,
    rating: Math.round(row.rating * 10) / 10,
    reviewCount: row.review_count,
    subjects: row.subjects ?? [],
  };
}

export function toLesson(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    status: row.status,
    mode: row.mode,
    note: row.note,
    price: row.price,
    isPast: row.is_past,
    subject: row.subject_id ? { id: row.subject_id, name: row.subject_name, emoji: row.subject_emoji } : null,
    tutor: toPerson(row.tutor_id, row.tutor_name, row.tutor_avatar),
    student: toPerson(row.student_id, row.student_name, row.student_avatar),
    review: row.review_rating ? { rating: row.review_rating, comment: row.review_comment } : null,
  };
}

export function toMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
