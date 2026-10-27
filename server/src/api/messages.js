import { Router } from 'express';
import { query } from '../db/pool.js';
import { ensure, text, toId } from '../lib/http.js';
import { avatarUrl, toMessage } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';
import { notify } from '../socket.js';

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get('/threads', async (req, res) => {
  const { rows } = await query(
    `WITH mine AS (
       SELECT m.*, CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS other_id
       FROM messages m WHERE m.sender_id = $1 OR m.recipient_id = $1
     ),
     latest AS (
       SELECT DISTINCT ON (other_id) other_id, body, sender_id, created_at
       FROM mine ORDER BY other_id, created_at DESC, id DESC
     )
     SELECT l.*, u.full_name, u.role, u.avatar_updated_at,
            (SELECT COUNT(*)::int FROM messages x
             WHERE x.sender_id = l.other_id AND x.recipient_id = $1 AND x.read_at IS NULL) AS unread
     FROM latest l JOIN users u ON u.id = l.other_id
     ORDER BY l.created_at DESC`,
    [req.user.id],
  );

  res.json({
    threads: rows.map((r) => ({
      contact: { id: r.other_id, fullName: r.full_name, role: r.role, avatarUrl: avatarUrl(r.other_id, r.avatar_updated_at) },
      lastMessage: { body: r.body, fromMe: r.sender_id === req.user.id, createdAt: r.created_at },
      unread: r.unread,
    })),
  });
});

messagesRouter.get('/unread-count', async (req, res) => {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM messages WHERE recipient_id = $1 AND read_at IS NULL',
    [req.user.id],
  );
  res.json(rows[0]);
});

async function findContact(id) {
  const { rows } = await query(
    'SELECT id, full_name, role, avatar_updated_at, is_blocked FROM users WHERE id = $1',
    [id],
  );
  return rows[0];
}

messagesRouter.get('/:userId', async (req, res) => {
  const otherId = toId(req.params.userId);
  const contact = await findContact(otherId);
  ensure(contact && otherId !== req.user.id, 'המשתמש לא נמצא', 404);

  await query(
    'UPDATE messages SET read_at = now() WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL',
    [otherId, req.user.id],
  );
  const { rows } = await query(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at DESC, id DESC LIMIT 300
     ) recent ORDER BY created_at, id`,
    [req.user.id, otherId],
  );

  res.json({
    contact: {
      id: contact.id,
      fullName: contact.full_name,
      role: contact.role,
      avatarUrl: avatarUrl(contact.id, contact.avatar_updated_at),
    },
    messages: rows.map(toMessage),
  });
});

messagesRouter.post('/:userId', async (req, res) => {
  const otherId = toId(req.params.userId);
  const body = text(req.body.body, { max: 2000 });
  ensure(body.length > 0, 'אי אפשר לשלוח הודעה ריקה');

  const contact = await findContact(otherId);
  ensure(contact && otherId !== req.user.id, 'המשתמש לא נמצא', 404);
  ensure(!contact.is_blocked, 'אי אפשר לשלוח הודעות למשתמש הזה');

  const { rows } = await query(
    'INSERT INTO messages (sender_id, recipient_id, body) VALUES ($1, $2, $3) RETURNING *',
    [req.user.id, otherId, body],
  );
  const message = toMessage(rows[0]);

  // Sender gets it too, so their other open tabs stay in sync.
  notify(otherId, 'message:new', message);
  notify(req.user.id, 'message:new', message);
  res.status(201).json({ message });
});
