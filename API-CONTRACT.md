# Sign-in API contract

This document is the full spec for the server your IT department needs to
build so students can create an account and sign in on the *Cancer in the
Commonwealth* site. The front end is already built and wired up to call
these two endpoints exactly as described below — once your server matches
this contract and its URL is set in `assets/api-config.js`, sign-in goes
live with no other changes needed on the site side.

If anything here needs to change to fit your existing systems, that's
fine — just let whoever maintains the site know so the two sides stay in
sync.

---

## 1. Where the site plugs in

Open `assets/api-config.js` and set one value:

```js
window.CIC_API_BASE_URL = "https://your-server.example.edu";
```

No trailing slash. Leave it as `""` (empty string) and the site falls back
to its current no-server behavior (a name remembered on the student's own
device, no real password check) — so nothing breaks while this is being
built.

Every request below is made to `{CIC_API_BASE_URL}` + the path shown.

---

## 2. Required endpoints

### `POST /auth/register`

Creates a new student account.

**Request body** (`Content-Type: application/json`):

```json
{
  "username": "jsmith",
  "password": "the-students-chosen-password",
  "county": "Fayette",
  "school": "Lafayette High School"
}
```

- `username` — plain text, whatever uniqueness/format rules you want to
  enforce (e.g. case-insensitive uniqueness).
- `password` — sent once, in plain text, over HTTPS. **Hash it
  server-side before storing it** (bcrypt, argon2, or scrypt — never store
  or log the raw value).
- `county` — one of Kentucky's 120 county names, exactly as sent (e.g.
  `"Fayette"`, `"McCracken"`). The site's dropdown is the source of truth
  for spelling.
- `school` — free-text school name as typed by the student.

**Success response** — `201 Created`:

```json
{
  "username": "jsmith",
  "county": "Fayette",
  "school": "Lafayette High School",
  "token": "opaque-session-token-or-omit-this-field"
}
```

`token` is optional. The site stores whatever you return here but doesn't
use it for anything yet — it's reserved for future features (see
"Optional future work" below). If you don't have a token/session scheme
yet, just omit the field.

**Error responses:**

| Status | Body | When |
|---|---|---|
| `409` | `{"error": "username_taken"}` | Username already exists |
| `400` | `{"error": "invalid_input", "message": "..."}` | Missing/malformed fields — `message` is shown to the student as-is, so keep it short and friendly |

---

### `POST /auth/login`

Authenticates an existing student.

**Request body:**

```json
{
  "username": "jsmith",
  "password": "the-students-password"
}
```

**Success response** — `200 OK`:

```json
{
  "username": "jsmith",
  "county": "Fayette",
  "school": "Lafayette High School",
  "token": "opaque-session-token-or-omit-this-field"
}
```

Return the student's actual `county`/`school` on file here — the site
displays whatever you send back, not what was typed at login (login only
collects username + password).

**Error responses:**

| Status | Body | When |
|---|---|---|
| `401` | `{"error": "invalid_credentials"}` | Wrong username or password (use the same generic error for both — don't reveal which one was wrong) |
| `400` | `{"error": "invalid_input", "message": "..."}` | Missing fields |

---

## 3. Cross-cutting requirements

- **HTTPS only.** Browsers will block a plain-`http://` API from an
  `https://` site, and passwords should never travel over an unencrypted
  connection regardless.
- **CORS.** The site is served from its own domain, different from your
  API. Your server must respond to `OPTIONS` preflight requests and
  include, at minimum:
  ```
  Access-Control-Allow-Origin: https://<the site's actual deployed domain>
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```
- **Content type.** Requests are sent as `Content-Type: application/json`
  with a JSON body; respond the same way.
- **Rate limiting** on both endpoints is strongly recommended (this is a
  login form reachable from the public internet).
- **Never store passwords in plain text.** Hash with bcrypt/argon2/scrypt
  and a per-user salt (bcrypt and argon2 handle this for you). The site
  never stores the password anywhere, including in the student's own
  browser — it only exists in memory for the moment it's sent to you.

---

## 4. Quick manual test

Once your server is running, these two `curl` calls should succeed before
you wire up the real site:

```bash
curl -i -X POST https://your-server.example.edu/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123","county":"Fayette","school":"Test High School"}'

curl -i -X POST https://your-server.example.edu/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

The first should return `201` with a JSON body; the second `200` with a
matching JSON body. Registering the same username twice should return
`409` on the second attempt. Logging in with a wrong password should
return `401`.

---

## 5. Optional future work (not required to launch)

The site currently keeps all quiz progress and reflection answers in the
student's own browser only — nothing about course progress is sent to
your server today. If you later want teachers to see student progress
across devices, that would mean adding endpoints like:

```
GET  /progress      (Authorization: Bearer <token>)
POST /progress      (Authorization: Bearer <token>)
```

to read/write a student's saved quiz scores and module completion. This
is a separate, larger piece of work — flag it explicitly if/when you want
to scope it, since it touches more of the site's code than the sign-in
flow described above.
