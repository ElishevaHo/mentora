# Mentora

**A marketplace for private lessons.** Students find a tutor, see the hours that are actually free, book a lesson, and chat in real time. Tutors manage a public profile, a weekly schedule, and incoming requests.

🔗 **Live demo:** _add your Render link here_

> On the login page there are one-click buttons for a **demo student** and a **demo tutor**.
> Open each one in a different browser and send a message: it shows up instantly on the other side.

---

## Features

**Students**
- Search tutors by subject, price, lesson type (online / in person), and free text, with sorting and pagination
- Tutor profile: bio, weekly hours, ratings, and reviews
- **Booking calendar**: a two-week day strip that shows only the open one-hour slots
- My lessons: upcoming / pending / history, cancellation, and a review after a lesson takes place

**Tutors**
- Studio: edit the profile, pick subjects, publish or hide it
- **Weekly availability grid**: click or drag to mark hours
- Approve or decline requests, plus stats (pending, upcoming, monthly income, average rating)

**Everyone**
- Real-time messaging with Socket.IO: typing indicator, unread badge, and live lesson status updates
- Profile picture upload, password change
- Admin panel: overview, block/unblock users, change roles, delete users, manage subjects
- Hebrew RTL interface, responsive down to 360px, automatic dark mode

## Tech stack

| Layer | Technology |
|---|---|
| Client | React 19, Vite, React Router 7, Context API, custom hooks, plain CSS with design tokens |
| Server | Node.js, Express 5 (ES modules), JWT, bcrypt, Multer, Helmet, express-rate-limit |
| Real time | Socket.IO, with a JWT handshake and a private room per user |
| Database | PostgreSQL with handwritten SQL through `pg` (no ORM) |
| Deploy | Render Blueprint (`render.yaml`): one web service plus a managed Postgres |

## Interesting technical details

- **Free slots are computed in SQL**, in Israel time (`Asia/Jerusalem`): `generate_series` over days and hours, joined with the weekly availability, minus live bookings. The same rule is checked again when a booking is created, so the API can't be tricked into booking off-hours.
- **No double booking, even with concurrent requests.** A *partial unique index* on `(tutor_id, starts_at) WHERE status IN ('pending','confirmed')`. Two students racing for the same slot: one wins, the other gets `409`.
- **Reviews only from real lessons.** A review is tied to a lesson that was confirmed and already happened, with one review per lesson (`UNIQUE(lesson_id)`).
- **Lesson state machine.** Allowed transitions (`confirm` / `decline` / `cancel`) are declared in one table, with role and timing checks.
- **Auth that stays fresh.** The middleware loads the user from the DB on every request, so blocking a user or changing their role takes effect immediately, not when the token expires.
- **Images in Postgres** (`BYTEA`) with versioned URLs and `immutable` caching. They survive deploys on hosts with an ephemeral disk.
- **Idempotent migrations** run on every boot, and demo data seeds automatically when the database is empty.

## Project structure

```
mentora/
├── render.yaml              # one-click deploy
├── server/
│   └── src/
│       ├── server.js        # HTTP + Socket.IO bootstrap
│       ├── app.js           # Express app, routes, error handling, SPA serving
│       ├── socket.js        # authenticated sockets, per-user rooms
│       ├── api/             # auth, users, subjects, tutors, lessons, studio, messages, admin
│       ├── middleware/      # requireAuth / requireRole
│       ├── lib/             # HttpError helpers, row → JSON serializers
│       └── db/              # pool, schema.sql, migrate, seed
└── client/
    └── src/
        ├── pages/           # Home, Explore, Tutor, Lessons, Inbox, Studio, Account, Admin…
        ├── components/      # Layout, TutorCard, SlotPicker, Avatar, Stars…
        ├── context/         # Auth, Live (socket + unread), Notice (toasts)
        ├── lib/             # api client, Israel-time formatting, useLoad hook
        └── styles/          # tokens, base, components, pages
```

## Running locally

Requires Node.js 20+ and PostgreSQL.

```bash
git clone https://github.com/<your-username>/mentora.git
cd mentora
npm run setup                       # installs server + client

createdb mentora                    # or create the DB in pgAdmin
cp server/.env.example server/.env  # then update DATABASE_URL

npm run dev:server                  # API on :4000 (creates tables + demo data)
npm run dev:client                  # in a second terminal, UI on :5173
```

Demo accounts (password `demo1234`): `student@demo.com`, `tutor@demo.com`.
For an admin account, set `SEED_ADMIN_PASSWORD` in `.env` before the first run and log in as `admin@mentora.dev`.
To start over: `npm run seed:reset --prefix server`.

## Deploying to Render

1. Push the repo to GitHub.
2. In Render: **New → Blueprint** → pick the repo. Render reads `render.yaml` and creates the service and the database.
3. Wait for the build. The site seeds itself on first boot.

## API

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | public |
| GET | `/api/auth/me` | signed in |
| GET | `/api/subjects` | public |
| GET | `/api/tutors?subject&q&maxPrice&mode&sort&page` | public |
| GET | `/api/tutors/:id` · `/api/tutors/:id/slots?days=14` | public |
| GET / POST | `/api/lessons` | signed in / student |
| PATCH | `/api/lessons/:id` `{ action: confirm \| decline \| cancel }` | participant |
| POST | `/api/lessons/:id/review` | student |
| GET / PUT | `/api/studio` · GET `/api/studio/stats` | tutor |
| GET | `/api/messages/threads` · `/api/messages/unread-count` | signed in |
| GET / POST | `/api/messages/:userId` | signed in |
| PUT | `/api/users/me` · `/me/password` · `/me/avatar` | signed in |
| GET / PATCH / DELETE | `/api/admin/users[/:id]` · `/api/admin/overview` | admin |
| POST / DELETE | `/api/admin/subjects[/:id]` | admin |

Socket events: `message:new`, `lesson:changed`, `typing`.

---

All tutors and students in the demo data are fictional.
