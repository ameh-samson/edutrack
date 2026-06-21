# EduTrack — Student Portal

A full-stack student portal built with Node.js, Express, MongoDB, and plain HTML/CSS/JS. Students can register, log in, view their profile on a protected dashboard, update their details, change their password, and reset a forgotten password.

---

## Tech Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JS (ES6+)                        |
| Backend  | Node.js, Express.js                                   |
| Database | MongoDB via Mongoose                                  |
| Auth     | `express-session` (session-based, httpOnly cookies)   |
| Security | `bcryptjs`, `express-rate-limit`, `express-validator` |

---

## Project Structure

```
edutrack/
├── backend/
│   ├── app.js                         # Express entry point — middleware, routes, static serving
│   ├── .env.example                   # Environment variable template (commit this, not .env)
│   ├── config/
│   │   └── db.js                      # MongoDB connection via Mongoose
│   ├── routes/
│   │   ├── auth.routes.js             # GET /auth/me, POST /login, /register, /logout
│   │   ├── dashboard.routes.js        # GET /dashboard (protected)
│   │   ├── settings.routes.js         # GET|PATCH /settings/profile, POST /settings/password
│   │   └── forgot-password.routes.js  # POST /auth/forgot-password/verify, /reset
│   ├── models/
│   │   └── User.js                    # Mongoose user schema
│   └── middleware/
│       ├── auth.middleware.js         # Session guard — redirects unauthenticated requests
│       ├── rateLimiter.js             # Rate-limit configs for login + register
│       └── validate.js                # express-validator chains + error handler
│
├── frontend/
│   ├── index.html                     # Login page
│   ├── register.html                  # Registration page
│   ├── dashboard.html                 # Student profile dashboard (protected)
│   ├── settings.html                  # Profile update + password change (protected)
│   ├── forgot-password.html           # Two-step forgot-password flow
│   ├── css/
│   │   ├── variables.css              # Design tokens (colours, radii, fonts)
│   │   ├── base.css                   # Reset, typography, auth page layout
│   │   ├── layout.css                 # App shell, sidebar, topbar, responsive
│   │   └── components.css             # Buttons, cards, forms, alerts, dropdowns
│   ├── js/
│   │   ├── api.js                     # fetch wrapper (GET/POST/PATCH + 401 redirect)
│   │   ├── auth.js                    # Login + register logic, session-check redirect
│   │   ├── dashboard.js               # Fetches and renders student profile
│   │   ├── settings.js                # Profile update + password change logic
│   │   ├── sidebar.js                 # Topbar toggle (desktop collapse + mobile drawer)
│   │   └── forgot-password.js         # Two-step password reset flow
│   └── assets/
│       └── logo.svg
│
└── .gitignore
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MongoDB](https://www.mongodb.com/) running locally, **or** a MongoDB Atlas connection string

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/ameh-samson/edutrack.git
cd edutrack
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in your values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
SESSION_SECRET=replace_with_a_long_random_string
NODE_ENV=development
COOKIE_SECURE=false

# Rate limiting
LOGIN_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
LOGIN_RATE_LIMIT_MAX=5              # attempts per window per IP

# Session duration
SESSION_MAX_AGE_MS=1800000          # 30 minutes (standard session)
REMEMBER_ME_MAX_AGE_MS=86400000     # 24 hours (remember me)
```

> **Never commit your real `.env` file.** It is gitignored by default.

### 4. Start the server

```bash
npm run dev    # development — auto-restarts on file changes
npm start      # production
```

### 5. Open in browser

```
http://localhost:5000
```

The Express server serves the entire `frontend/` folder as static files — the full app runs from a single port.

---

## Pages & Routes

| Page            | URL                     | Backend Route                                                                 | Auth Required |
| --------------- | ----------------------- | ----------------------------------------------------------------------------- | ------------- |
| Login           | `/` or `/index.html`    | `POST /auth/login`, `GET /auth/me`                                            | No            |
| Register        | `/register.html`        | `POST /auth/register`, `GET /auth/me`                                         | No            |
| Dashboard       | `/dashboard.html`       | `GET /dashboard`                                                              | Yes           |
| Settings        | `/settings.html`        | `GET /settings/profile`, `PATCH /settings/profile`, `POST /settings/password` | Yes           |
| Forgot Password | `/forgot-password.html` | `POST /auth/forgot-password/verify`, `POST /auth/forgot-password/reset`       | No            |
| Logout          | —                       | `POST /auth/logout`                                                           | Yes           |

Unauthenticated requests to protected routes are redirected to `/index.html`. API callers receive `401 JSON`.
Already-authenticated users visiting `/index.html` or `/register.html` are automatically redirected to `/dashboard.html`.

---

## Features

### Authentication

- Session-based auth with httpOnly, `sameSite: lax` cookies
- Passwords hashed with `bcryptjs` at 12 salt rounds
- Timing-safe login — bcrypt compare always runs (dummy hash when user not found) to prevent email enumeration via response time
- Generic error on login failure — no hint whether email or password was wrong

### Already Logged In Redirect

- Visiting the login or register page with an active session immediately redirects to the dashboard

### Remember Me

- Unchecked: session expires after 30 minutes of inactivity
- Checked: session persists for 24 hours

### Forgot Password

- Step 1 — student provides email + matric number; server verifies both match the same account and returns a short-lived token (15-minute expiry)
- Step 2 — student sets a new password using that token; token is invalidated immediately after use

### Rate Limiting

- Login: max 5 attempts per 15 minutes per IP → `429 Too Many Requests`
- Register: max 10 attempts per hour per IP

### Validation

Both client-side (immediate feedback) and server-side (authoritative) on all forms:

| Field            | Rules                                                 |
| ---------------- | ----------------------------------------------------- |
| Full Name        | Letters, spaces, hyphens · 2–60 chars                 |
| Email            | Valid format · unique · normalized to lowercase       |
| Phone            | 10–14 digits · optional leading `+`                   |
| Matric Number    | Exactly 10 digits · unique (e.g. 2460113247)          |
| Department       | Non-empty                                             |
| Level            | One of: ND 1, ND 2, HND 1, HND 2                      |
| Date of Birth    | Valid date · age 14–80                                |
| Password         | ≥ 8 chars · at least one uppercase, lowercase, number |
| Confirm Password | Must match Password                                   |

### Dashboard

Displays the authenticated student's full profile: name, email, phone, matric number, department, level, date of birth, gender, last login, and join date. Skeleton loader shown while fetching.

### Settings

- **Update profile** — edit all fields except matric number (read-only after registration)
- **Change password** — requires current password; session is invalidated on success

### UI / Navigation

- Topbar toggle button: on desktop it collapses/expands the sidebar (chevron `>` rotates to `<` when open); on mobile it opens a full-height drawer
- Sidebar collapse state persisted to `localStorage` — survives page navigation
- Fully responsive — sidebar becomes a drawer at ≤ 768 px
- Design tokens in `css/variables.css` — purple primary (`#6B21A8`), pink accent (`#D6249F`)

---

## Environment Variables Reference

| Variable                     | Default       | Description                             |
| ---------------------------- | ------------- | --------------------------------------- |
| `PORT`                       | `5000`        | Server listen port                      |
| `MONGODB_URI`                | —             | MongoDB connection string               |
| `SESSION_SECRET`             | —             | Long random string for session signing  |
| `NODE_ENV`                   | `development` | Set to `production` in production       |
| `COOKIE_SECURE`              | `false`       | Set to `true` when serving over HTTPS   |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000`      | Login rate-limit window in ms (15 min)  |
| `LOGIN_RATE_LIMIT_MAX`       | `5`           | Max login attempts per window per IP    |
| `SESSION_MAX_AGE_MS`         | `1800000`     | Standard session duration (30 min)      |
| `REMEMBER_ME_MAX_AGE_MS`     | `86400000`    | Remember-me session duration (24 hours) |

---

## Security Notes

- Session cookies are `httpOnly` and `sameSite: lax`
- Set `COOKIE_SECURE=true` and serve over HTTPS in production
- Generate a fresh `SESSION_SECRET` before any deployment
- Keep `MONGODB_URI` (with credentials) in `.env` — never commit it
- Rate limiting is active on login and register out of the box

---

## License

MIT
