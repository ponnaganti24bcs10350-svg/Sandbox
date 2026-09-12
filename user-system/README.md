# SandBox — Person 1 Module: Authentication + User Progress

Owns: Signup/Login, JWT session, basic user data, daily solved count, daily limit reset/check logic.

## Flow this implements

```
User logs in
   ↓
GET /api/progress/today  →  "Today's solved: 2 / 5"
   ↓
Challenge passed → POST /api/progress/solved
   ↓
"Today's solved: 3 / 5"   (429 error once 5/5 is reached)
```

The counter resets automatically at **midnight IST** using lazy reset — no cron job needed. Whenever progress is read or written, the stored date is compared with today's date; if it changed, the count resets to 0.

## Setup

```bash
npm install
cp .env.example .env     # then edit .env (set a real JWT_SECRET)
npm run dev              # or: npm start
```

Needs MongoDB running locally (`mongodb://127.0.0.1:27017/sandbox`) or use a free MongoDB Atlas URI in `.env`.

## API Reference

Base URL: `http://localhost:5000`

### Auth

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| GET | `/api/auth/me` | — | Needs `Authorization: Bearer <token>`. Use for session restore on refresh |

### Progress (all need the Bearer token)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/progress/today` | Dashboard display: `{ solvedToday, dailyLimit, remainingToday, limitReached, totalSolved }` |
| GET | `/api/progress/can-solve` | Check before starting/submitting a challenge |
| POST | `/api/progress/solved` | Record one successful submission. Returns **429** if daily limit reached |

## Quick test with curl

```bash
# 1. Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Teresa","email":"t@test.com","password":"secret123"}'

# 2. Copy the token from the response, then:
TOKEN=paste_token_here

# 3. Check today's progress  →  0 / 5
curl http://localhost:5000/api/progress/today -H "Authorization: Bearer $TOKEN"

# 4. Record a solve  →  1 / 5
curl -X POST http://localhost:5000/api/progress/solved -H "Authorization: Bearer $TOKEN"

# 5. Repeat #4 five times → sixth call returns 429 "Daily limit reached"
```

## How teammates integrate (important for combining!)

**Person 2 (Challenges module):**
- Before letting a user submit: `GET /api/progress/can-solve`
- After the test runner marks a submission PASSED: `POST /api/progress/solved`
- To protect your own routes, import my middleware:
  ```js
  const { protect } = require("../middleware/auth");
  router.post("/challenges/:id/submit", protect, handler);
  // inside handler: req.user is the full user document
  ```

**Person 3 (IDE frontend) / any React page:**
```js
// login
const res = await fetch("http://localhost:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();
// store token in memory/localStorage, then for every request:
fetch(url, { headers: { Authorization: `Bearer ${token}` } });
```

**Person 4 (Admin):** the User model has a `role` field (`student | company | admin`) and there's a `restrictTo("admin")` middleware ready in `middleware/auth.js`.

## Files

```
server.js            → Express app entry
config/db.js         → MongoDB connection
models/User.js       → User schema + daily limit logic (resetDailyIfNeeded, recordSolve)
middleware/auth.js   → JWT protect + restrictTo middleware
routes/auth.js       → signup / login / me
routes/progress.js   → today / can-solve / solved
```
