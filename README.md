# ft_transcendence

Social platform — auth, friends, blocks, guilds, cards, profiles. Single-command Docker deploy.

## Team

| Name | Role | Contributions |
| ---- | ---- | ------------- |
| TODO | Product Owner (PO) | TODO |
| TODO | Project Manager (PM) | TODO |
| TODO | Tech Lead | TODO |
| TODO | Developer | TODO |
| TODO | Developer | TODO |

## Project Management

We organized work using **TODO: methodology (Scrum/Kanban/etc.)**. Tasks were tracked via **TODO: tool (GitHub Projects/Trello/etc.)**, with weekly sprints/meetings. The Git repository serves as the single source of truth with feature branches and pull requests.

## Modules & Points

**Total: TODO / 14 pts (minimum 14 required)**

### Major Modules (2 pts each)

| Module | Points | Status | Implemented by |
| ------ | ------ | ------ | -------------- |
| Frontend framework (React) | 2 | ✅ | TODO |
| Backend framework (Fastify) | 2 | ✅ | TODO |
| Standard user management | 2 | ✅ | TODO |
| Organization system (guilds) | 2 | ✅ | TODO |
| User interaction (chat + profile + friends) | 2 | ⚠️ | TODO (chat missing) |
| Advanced permissions (roles) | 2 | ⚠️ | TODO (role enum exists, no mod UI) |
| Real-time features (WebSockets) | 2 | ❌ | — |

### Minor Modules (1 pt each)

| Module | Points | Status | Implemented by |
| ------ | ------ | ------ | -------------- |
| ORM (Prisma) | 1 | ✅ | TODO |
| Language (en, fr) | 1 | ✅ | TODO |
| Advanced search / pagination | 1 | ❌ | — |
| OAuth 2.0 | 1 | ❌ | — |
| Analytics dashboard | 1 | ❌ | — |

### Justifications

- **React + Fastify**: React provides a component-based SPA with strong ecosystem; Fastify offers high-performance async request handling with TypeScript-native plugin system.
- **Prisma ORM**: Type-safe database access with auto-generated migrations, eliminating SQL injection risks.
- **Language**: All user-facing strings live in JSON files (`language/en.json`, `language/fr.json`). Detected via `Accept-Language` header + `localStorage` preference. English is synchronously bundled (no flash of untranslated keys). Backend returns only error codes — zero text on the server.
- **Guild system**: Full CRUD with owner/member roles, invite/join flows, promote/demote — mirrors real-world org management.
- **Permissions**: `UserRole` enum (`User`, `Moderator`, `Admin`) with `requireAdmin` middleware gating admin endpoints. Role stored in the JWT session — no extra DB query per check.

## Stack

| Layer          | Technology                          | Why |
| -------------- | ----------------------------------- | --- |
| Frontend       | React 19 + Vite 8 + TypeScript 6    | Component-based SPA with fast HMR |
| Styling        | SCSS (Sass)                         | CSS preprocessor with nesting, variables, mixins |
| Backend        | Node.js 24 + Fastify 5 + TypeScript 6 | High-performance async server, schema-based validation |
| Database       | PostgreSQL 16                       | ACID-compliant relational DB with array column support |
| ORM            | Prisma 7                            | Type-safe queries, auto-generated migrations |
| Validation     | Zod 4 (frontend + backend)          | Shared validation rules — error codes only, no text |
| Auth           | JWT (jsonwebtoken) + bcrypt         | Stateless auth, httpOnly Secure SameSite=Strict cookie |
| Language       | JSON translation files (en, fr)     | Zero-dependency, `Accept-Language` + `localStorage` |
| TLS            | Self-signed cert (HTTPS only)       | Encrypted transport, no HTTP fallback |
| Infrastructure | Docker Compose + Docker Secrets     | Single-command deploy, secrets never on disk as env vars |

## Project structure

```
├── backend/
│   ├── tsconfig.json
│   ├── schema.prisma
│   ├── prisma.config.ts
│   ├── migrations/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.ts              # Fastify server, TLS, CORS, rate-limit
│       ├── constants.ts        # Prisma client, config, secrets, limits, sanitize()
│       ├── middleware.ts       # JWT auth, requireAdmin/Moderator, wrapHandler, multipart
│       ├── validation.ts       # Zod schemas (error codes only)
│       └── engine/
│           ├── auth.ts         # register, login, logout
│           ├── users.ts        # profile CRUD, lookup, delete cascade
│           ├── friends.ts      # friends + blocks (same Usership engine)
│           ├── guilds.ts       # guilds CRUD, join/invite, accept/decline, promote/demote, kick/leave
│           └── cards.ts        # card catalog (admin-gated)
├── frontend/
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── app.tsx             # React entry, error boundary, nav, built-in HTTPS SSR server
│       ├── app.scss            # global layout styles (tokens → reset → layout → navbar → panel → footer)
│       ├── constants.ts        # limits + types (Profile, PublicUser, GuildView, Card, etc.) + sanitize()
│       ├── validation.ts       # Zod schemas + re-exports sanitize (mirrors backend)
│       ├── vite-env.d.ts       # Vite client type declarations
│       ├── scss.d.ts           # SCSS module type declarations
│       ├── language.tsx         # React context + useT() / useLang() hooks + StatusMessage component
│       ├── language/
│       │   ├── en.json         # English translations (synchronously loaded)
│       │   └── fr.json         # French translations (async loaded)
│       ├── engine/
│       │   ├── api.ts          # authOpts(), apiGet(), apiPost(), uploadMultipart(), assetUrl()
│       │   ├── auth.ts         # loginUser(), registerUser(), logoutUser()
│       │   ├── users.ts        # getUser(), getPublicUser(), editUser(), deleteUser()
│       │   ├── friends.ts      # friend + block API wrappers
│       │   ├── guilds.ts       # guild API wrappers
│       │   └── cards.ts        # card API wrappers
│       └── pages/
│           ├── auth/           # login / register form + guest mode
│           ├── friends/        # friend list, pending requests, blocks
│           ├── guilds/         # guild list, join/invite, promote/demote, leave/kick
│           ├── profile/        # edit profile, avatar upload, delete account
│           ├── legal/          # privacy policy + terms of service overlay
│           └── error/          # full-screen error with retry
├── secrets/                    # generated by Makefile (git-ignored)
├── .env.example                # documented environment variables
├── docker-compose.yml
├── Makefile
├── DOC/                        # needs.txt, RULES.md, other reference docs
└── README.md
```

## Quick start

```bash
make start    # generate secrets + TLS cert + build & start all containers
```

```
Frontend   https://localhost:443
Backend    https://localhost:3000
Database   postgresql://localhost:5432
```

## Makefile

| Command        | Description |
| -------------- | ----------- |
| `make start`   | generate secrets → build & start all containers |
| `make stop`    | stop containers |
| `make clean`   | stop + remove volumes + node_modules |
| `make fclean`  | full cleanup + rebuild |
| `make backend` | shell into backend container |
| `make frontend`| shell into frontend container |
| `make prisma`  | run Prisma migrations manually |

## Configuration

Configuration is generated by `make all` into `secrets/` and `.env`. Environment variables (`DOMAIN`, `DB_PORT`, `BACKEND_PORT`, `FRONTEND_PORT`) have defaults in the Makefile. Ports default to 3000 / 443 / 5432. See `.env.example` for all available variables.

Both servers bind on `0.0.0.0` (all interfaces) inside containers — hardcoded, no env var needed. The `DOMAIN` env var is used only for CORS origin validation and cookie scoping, not for binding.

Admin users: `UserRole` enum in the database (`Admin` or `Moderator` roles). The `requireAdmin` middleware checks `request.user.role` (loaded once by `requireAuth`, no extra DB hit).

## API

### Error codes

The backend returns **only error codes** — no human-readable text. The frontend translates codes via `t("validation.xxx")` or `t("error.xxx")` using the active language file. Examples: `"error.invalidCredentials"`, `"validation.emailInvalid"`, `"error.guildNotFound"`.

### Identifiers

Users are addressed by **username** everywhere — every route param and engine function argument is a `username` string. The numeric `id` is purely internal: it is the DB primary key and the only field embedded in the JWT.

### Endpoints

| Action            | Friend                                   | Guild                                          |
| ----------------- | ---------------------------------------- | ---------------------------------------------- |
| list              | `GET  /api/friend`                       | `GET  /api/guild`                              |
| get one           | `GET  /api/friend/:username`             | `GET  /api/guild/:name`                        |
| request / invite  | `POST /api/friend/request/:username`     | `POST /api/guild/:name/request/:username`      |
| accept            | `POST /api/friend/accept/:username`      | `POST /api/guild/:name/accept/:username`       |
| decline / cancel  | `POST /api/friend/pending/:direction/:username` | `POST /api/guild/:name/pending/:direction/:username` |
| list pending      | `GET  /api/friend/pending/:direction`    | `GET  /api/guild/pending/:direction` (global)  |
| remove            | `POST /api/friend/remove/:username`      | `POST /api/guild/:name/remove/:username` (kick) |

`:direction` is `incoming` or `outgoing`. For a guild self-join, `:username` is `me`.

Guild-only operations:

| Endpoint | Description |
| -------- | ----------- |
| `POST /api/guild/:name/promote/:username` | Member → Owner |
| `POST /api/guild/:name/demote/:username`  | Owner → Member |
| `POST /api/guild/:name/leave`             | Self-removal |
| `POST /api/guild`                         | Create guild |
| `POST /api/guild/:name`                   | Edit guild (name/banner) |
| `POST /api/guild/:name/remove`            | Delete guild (cascade) |
| `GET  /api/guild/:name/pending/:direction` | Pending requests for a specific guild |

Remaining endpoints:

| Prefix        | Endpoints |
| ------------- | --------- |
| `/api/auth`   | `POST /register`, `POST /login`, `POST /logout` |
| `/api/user`   | `GET /` (own profile), `GET /:username`, `POST /` (edit / avatar), `POST /remove` (delete cascade) |
| `/api/block`  | `GET /`, `POST /:username` (block), `POST /remove/:username` (unblock) |
| `/api/message`| `GET /:username` (conversation), `POST /:username` (send message) |
| `/api/card`   | `GET /`, `GET /:name`, `POST /`, `POST /:name`, `POST /:name/remove` — mutations admin-only |

All list endpoints support `?limit=N&offset=M` pagination (default 50, max 200).

## Auth flow

1. `POST /api/auth/login` returns `{ token }` (JWT)
2. Server sets one cookie: `token` — httpOnly Secure SameSite=Strict
3. Frontend sends `Accept-Language` header on every request — backend returns errors in the user's language via error codes
4. Server extracts JWT from cookie (priority) or `Authorization: Bearer` header
5. `requireAuth` middleware loads user from DB on every request (id + username + role) — not trusting JWT claims alone
6. `requireAdmin` checks `request.user.role` — no extra DB query
7. Logout clears the cookie + sets user offline

## Features

| Feature | Implemented by | Description |
| ------- | -------------- | ----------- |
| Auth (register/login/logout) | TODO | Email + username + password, bcrypt 12 rounds, JWT httpOnly cookie |
| User profiles | TODO | View/edit profile, avatar upload, account deletion cascade |
| Friends system | TODO | Add/remove friends, pending requests (incoming/outgoing), online status |
| Block system | TODO | One-directional blocks, cleans prior relationships, blocked users invisible |
| Guilds (organizations) | TODO | CRUD, join/invite flows, owner/member roles, promote/demote, kick/leave |
| Card catalog | TODO | Admin-gated CRUD, Pokémon TCG-style cards with rarity/types |
| Language (en, fr) | TODO | JSON-based, `Accept-Language` detection, `localStorage` preference, synchronous en bundle |
| Privacy Policy & ToS | TODO | Full legal pages accessible from every view |
| Guest mode | TODO | Browse without account, restricted actions |
| Pagination | TODO | All list endpoints: `?limit=&offset=` (default 50, max 200) |

## Individual Contributions

### TODO: Team Member 1
- Role: TODO
- Implemented: TODO (e.g., auth system, middleware, security)

### TODO: Team Member 2
- Role: TODO
- Implemented: TODO (e.g., friends/blocks engine, usership state machine)

### TODO: Team Member 3
- Role: TODO
- Implemented: TODO (e.g., guilds engine, frontend components, SCSS)

### TODO: Team Member 4
- Role: TODO
- Implemented: TODO (e.g., cards system, language, legal pages)

### TODO: Team Member 5
- Role: TODO
- Implemented: TODO (e.g., Docker infrastructure, Makefile, README)

## Security

- **Password complexity:** 8–60 characters with uppercase, lowercase, and digit
- **XSS prevention:** HTML tag stripping + entity escaping on usernames, guild names, card names (Zod `.transform(sanitize)`)
- **SameSite=Strict cookies:** httpOnly Secure cookies prevent CSRF — no double-submit pattern needed
- **CORS:** credentialed requests restricted to configured `DOMAIN` + `localhost` / `127.0.0.1`
- **No id leakage:** numeric ids stay server-side (DB key + JWT only); the API speaks usernames
- **Error code isolation:** backend returns only codes (e.g. `"validation.emailInvalid"`) — zero text, zero leaks
- **Timing side-channel defense:** bcrypt dummy hash on non-existent user lookups (via `HASH_SECRET`)
- **Rate limiting:** 20/min auth routes, 600/min global routes
- **Path traversal protection:** resolved path verified within `distDir` in frontend static server
- **File upload safety:** MIME whitelist + 5 MB size limit + UUID-based filenames (no overwrite races)
- **Admin:** role-based (`UserRole.Admin`) — role cached in `request.user`, no extra DB query per check
- **HTTPS only:** self-signed TLS, no HTTP fallback

## Database schema

```
User              (id, email, username, password, avatar, status, role, language,
                   usershipIds[], cardshipIds[], cardshipExchangeIds[], messageIds[])
Usership          (id, userId, status)
Guild             (id, name, banner, guildshipIds[])
Guildship         (id, userId, status)
Card              (id, name, pokemon, rarity, type, subType, health, image)
Cardship          (id, cardId, status)
CardshipExchange  (id, cardId, userId, status)
Message           (id, userId, content, time)
```

### Enums

| Enum | Values |
| ---- | ------ |
| UserStatus | `Online`, `Offline` |
| UserRole | `User`, `Moderator`, `Admin` |
| UsershipStatus | `Pending`, `Requested`, `Friend`, `Blocked` |
| GuildshipStatus | `UserRequest`, `OwnerRequest`, `User`, `Owner` |
| CardshipStatus | `Unpossessed`, `Possessed`, `Wanted`, `Available` |
| CardshipExchangeStatus | `ExchangePending`, `ExchangeRequested` |
| CardRarity | `Common`, `Uncommon`, `Rare`, `Legendary` |
| CardType | `None`, `Normal`, `Fire`, `Water`, `Electric`, `Grass`, `Ice`, `Fighting`, `Poison`, `Ground`, `Flying`, `Psychic`, `Bug`, `Rock`, `Ghost`, `Dragon` |

### Friendship System Rules

1. **Request Initiation** — User A sends to User B: A row (userId=B, status=Pending) + B row (userId=A, status=Requested)
2. **Request Acceptance** — both rows flip to status=Friend
3. **Request Decline** — both rows deleted, both usershipIds cleaned
4. **Duplicate Prevention** — Pending row already exists → request ignored
5. **Block Initiation** — one-directional: User A row (userId=B, status=Blocked)
6. **Block Prevents Incoming** — blocked user tries to send request → their row deleted, block persists
7. **Block Prevents Outgoing** — blocker tries to send to blocked → no new row, block persists
8. **Block Overwrites Friendship** — block while friends → A: status=Blocked, B: Friend row deleted
9. **Bidirectional Pending** — both users request each other → both sides show as Pending; either user accepting flips ALL rows to Friend

### Guild System Rules

1. **User Join Request** — guildship (userId=user, status=UserRequest) → push id to guild.guildshipIds
2. **Owner Invite** — guildship (userId=user, status=OwnerRequest) → push id to guild.guildshipIds
3. **Accept Join Request** — owner accepts UserRequest → guildship status → User
4. **Decline Join Request** — delete guildship, remove id from guild.guildshipIds
5. **Accept Owner Invite** — user accepts OwnerRequest → guildship status → User
6. **Decline Owner Invite** — delete guildship, remove id from guild.guildshipIds
7. **Remove Member** — owner or self removes → delete guildship, remove id from guild.guildshipIds (last owner protected)
8. **Promote User** — any owner promotes User → guildship status → Owner
9. **Demote Owner** — any owner demotes another owner → guildship status → User (last owner protected)

### Deletion Cascades

| Operation | Cleans |
|---|---|
| deleteUser | avatar file, all guildships (cascade guild if last owner), all userships (both sides + inbound sweep), user row |
| deleteGuild | all guildships, guild row, banner file |
| deleteUsership | both user.usershipIds cleaned, both Friend rows deleted |
| deleteBlock | blocker.usershipIds cleaned, Blocked row deleted |
| deleteGuildship | guild.guildshipIds cleaned, guildship row deleted |
| leaveGuild | same as deleteGuildship for self |

Migrations run automatically on `start` via `npm run migrate`.

## File storage

| Type   | Path                           | Naming |
| ------ | ------------------------------ | ------ |
| Avatar | `uploads/avatars/{uuid}.{ext}` | UUID-only, no user input on disk |
| Banner | `uploads/banners/{uuid}.{ext}` | UUID-only |
| Card   | `uploads/cards/{uuid}.{ext}`   | UUID-only |

Max 5 MB. `uploads/` created at runtime by `app.ts`.

## TLS

Self-signed cert generated by `make all` → stored in `secrets/` → mounted as Docker secrets. HTTPS only.

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain secrets/server.crt
```
