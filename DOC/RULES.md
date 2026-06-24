# Full function trace — frontend → DB

Every frontend function maps through 5 layers:
```
frontend engine → API URL → backend route → backend function → Prisma → DB table
```

---

## Auth

### `loginUser(username, password)`
```
POST /api/auth/login
  → authRoutes: POST /login
    → loginUser(username, password)
      → prisma.user.findUnique({ where: { username } })          // User table
      → bcrypt.compare(password, user.password)
      → jwt.sign({ id: user.id })
      → prisma.user.update({ data: { status: Online } })         // User table
```

### `registerUser(email, username, password)`
```
POST /api/auth/register
  → authRoutes: POST /register
    → createUser(email, username, password)
      → prisma.$transaction:
        → tx.user.findFirst({ OR: [{ email }, { username }] })  // User table
        → tx.user.create({ data: { email, username, password } }) // User table
```

### `logoutUser()`
```
POST /api/auth/logout
  → authRoutes: POST /logout
    → logoutUser(username)
      → prisma.user.update({ data: { status: Offline } })        // User table
```

---

## User

### `getUser()`
```
GET /api/user
  → usersRoutes: GET /
    → getUser(username, includeEmail=true)
      → prisma.user.findUnique({ where: { username } })          // User table
```

### `getPublicUser(username)`
```
GET /api/user/:username
  → usersRoutes: GET /:username
    → getUser(username, includeEmail=false)
      → prisma.user.findUnique({ where: { username } })          // User table
    → prisma.usership.findFirst({ status: Blocked })             // Usership table (block check)
```

### `editUser({ username?, email?, password?, avatarFile? })`
```
POST /api/user
  → usersRoutes: POST /
    → editUser(username, opts)
      → prisma.user.findUnique({ where: { username } })          // User table (load current)
      → saveUploadedFile()                                       // disk write
      → prisma.user.update({ where: { id }, data: fields })      // User table
      → prisma.user.findUnique({ where: { username } })          // User table (re-fetch)
```

### `deleteUser()`
```
POST /api/user/remove
  → usersRoutes: POST /remove
    → deleteUser(username)
      → prisma.$transaction:
        → tx.user.findUnique({ where: { username } })            // User table
        → tx.guildship.findMany({ where: { userId } })           // Guildship table
        → tx.guild.findFirst({ where: { guildshipIds: { has } } }) // Guild table
        → tx.guildship.deleteMany({ id: { in } })               // Guildship table
        → tx.guild.delete({ where: { id } })                     // Guild table
        → tx.usership.findMany({ where: { id: { in } } })       // Usership table
        → tx.user.update({ data: { usershipIds } })              // User table (clean peers)
        → tx.usership.deleteMany({ where: { id: { in } } })     // Usership table
        → tx.usership.findMany({ where: { userId } })            // Usership table (inbound sweep)
        → tx.user.delete({ where: { id } })                      // User table
```

---

## Friends

### `getFriendList()`
```
GET /api/friend
  → friendsRoutes: GET /
    → getFriendList(username, limit, offset)
      → loadUsershipUser({ username })                            // User table
      → prisma.usership.findMany({ status: Friend })             // Usership table
      → prisma.user.findMany({ where: { id: { in } } })          // User table
```

### `getFriend(username)`
```
GET /api/friend/:username
  → friendsRoutes: GET /:username
    → getFriend(username, friendUsername)
      → loadUsershipUser({ username })                            // User table
      → lookupUser(friendUsername)                                // User table
      → findUsershipRow(status: Friend)                           // Usership table
      → prisma.user.findUnique({ where: { id } })                // User table
```

### `createFriendRequest(username)`
```
POST /api/friend/request/:username
  → friendsRoutes: POST /request/:username
    → createFriendRequest(username, targetUsername)
      → lookupUser(targetUsername)                                // User table
      → prisma.$transaction:
        → tx.user.findUnique({ where: { username } })            // User table (sender)
        → findUsershipRow(sender, receiver.id)                   // Usership table (check existing)
        → tx.user.findUnique({ where: { id } })                  // User table (receiver)
        → tx.usership.findMany({ where: { id: { in } } })        // Usership table (receiver rows)
        → tx.usership.create({ data: { userId, Pending } })      // Usership table (sender row)
        → tx.usership.create({ data: { userId, Requested } })    // Usership table (receiver row)
        → tx.user.update({ data: { usershipIds: { push } } })    // User table (sender)
        → tx.user.update({ data: { usershipIds: { push } } })    // User table (receiver)
```

### `acceptFriendRequest(username)`
```
POST /api/friend/accept/:username
  → friendsRoutes: POST /accept/:username
    → acceptFriendRequest(username, senderUsername)
      → lookupUser(senderUsername)                                // User table
      → prisma.$transaction:
        → loadUsershipUser({ username })                          // User table
        → findUsershipRow(status: Requested)                      // Usership table
        → loadUsershipUser({ id: sender.id })                     // User table
        → findUsershipRow(status: Pending)                        // Usership table
        → tx.usership.update({ data: { status: Friend } })        // Usership table (×2)
```

### `removeFriendRequest(direction, username)`
```
POST /api/friend/pending/:direction/:username
  → friendsRoutes: POST /pending/:direction/:username
    → removeFriendRequest(username, targetUsername, direction)
      → lookupUser(targetUsername)                                // User table
      → prisma.$transaction:
        → loadUsershipUser({ username })                          // User table
        → findUsershipRow(status: Pending/Requested)              // Usership table
        → loadUsershipUser({ id: target.id })                     // User table
        → findUsershipRow(status: Requested/Pending)              // Usership table
        → tx.usership.deleteMany({ where: { id: { in } } })       // Usership table
        → tx.user.update({ data: { usershipIds } })               // User table (×2)
```

### `deleteUsership(username)`
```
POST /api/friend/remove/:username
  → friendsRoutes: POST /remove/:username
    → deleteUsership(username, friendUsername)
      → lookupUser(friendUsername)                                // User table
      → prisma.$transaction:
        → loadUsershipUser({ username })                          // User table
        → loadUsershipUser({ id: friend.id })                     // User table
        → findUsershipRow(status: Friend)                         // Usership table (×2)
        → tx.usership.deleteMany({ where: { id: { in } } })       // Usership table
        → tx.user.update({ data: { usershipIds } })               // User table (×2)
```

### `getDirectionalFriendRequests(direction)`
```
GET /api/friend/pending/:direction
  → friendsRoutes: GET /pending/:direction
    → getDirectionalFriendRequests(username, direction)
      → prisma.user.findUnique({ where: { username } })           // User table
      → prisma.usership.findMany({ status: Pending/Requested })   // Usership table
      → prisma.user.findMany({ where: { id: { in } } })           // User table
```

---

## Blocks

### `getBlockList()`
```
GET /api/block
  → blocksRoutes: GET /
    → getBlockList(username, limit, offset)
      → loadUsershipUser({ username })                            // User table
      → prisma.usership.findMany({ status: Blocked })            // Usership table
      → prisma.user.findMany({ where: { id: { in } } })           // User table
```

### `createBlock(username)`
```
POST /api/block/:username
  → blocksRoutes: POST /:username
    → createBlock(username, targetUsername)
      → lookupUser(targetUsername)                                // User table
      → prisma.$transaction:
        → loadUsershipUser({ username }) (×2)                     // User table
        → tx.usership.findMany({ where: { id: { in } } })        // Usership table
        → removeFriendFromIds() (if was friend)                   // Usership + User tables
        → tx.usership.create({ data: { userId, Blocked } })       // Usership table
        → tx.user.update({ data: { usershipIds: { push } } })    // User table
```

### `deleteBlock(username)`
```
POST /api/block/remove/:username
  → blocksRoutes: POST /remove/:username
    → deleteBlock(username, targetUsername)
      → lookupUser(targetUsername)                                // User table
      → prisma.$transaction:
        → loadUsershipUser({ username })                          // User table
        → findUsershipRow(status: Blocked)                        // Usership table
        → tx.user.update({ data: { usershipIds } })               // User table
        → tx.usership.delete({ where: { id } })                   // Usership table
```

---

## Guilds

### `getGuildList()`
```
GET /api/guild
  → guildsRoutes: GET /
    → getGuildList(limit, offset)
      → prisma.guild.findMany()                                   // Guild table
      → buildGuildViews(guilds)
        → prisma.guildship.findMany({ where: { id: { in } } })   // Guildship table
        → prisma.user.findMany({ where: { id: { in } } })         // User table
```

### `getGuild(guildName)`
```
GET /api/guild/:name
  → guildsRoutes: GET /:name
    → getGuild(guildName)
      → lookupGuild(guildName)                                    // Guild table
      → buildGuildViews([guild])
        → prisma.guildship.findMany({ where: { id: { in } } })   // Guildship table
        → prisma.user.findMany({ where: { id: { in } } })         // User table
```

### `createGuild(name)`
```
POST /api/guild
  → guildsRoutes: POST /
    → createGuild(name, username)
      → prisma.user.findUnique({ where: { username } })           // User table (owner exists?)
      → prisma.guild.findUnique({ where: { name } })             // Guild table (name taken?)
      → prisma.$transaction:
        → tx.guild.create({ data: { name } })                     // Guild table
        → tx.guildship.create({ data: { userId, Owner } })        // Guildship table
        → tx.guild.update({ data: { guildshipIds: { push } } })  // Guild table
```

### `editGuild(guildName, { name?, bannerFile? })`
```
POST /api/guild/:name
  → guildsRoutes: POST /:name
    → editGuild(guildName, opts, requesterUsername)
      → lookupGuild + lookupUser                                   // Guild + User tables
      → isGuildOwner() check                                      // Guildship table
      → prisma.guild.findUnique({ where: { name } })             // Guild table (conflict check)
      → saveUploadedFile() (if banner)                            // disk write
      → prisma.guild.update({ where: { id }, data: updates })    // Guild table
      → getGuild() (re-fetch)                                     // Guild + Guildship + User tables
```

### `deleteGuild(guildName)`
```
POST /api/guild/:name/remove
  → guildsRoutes: POST /:name/remove
    → deleteGuild(guildName, requesterUsername)
      → lookupGuild + lookupUser                                   // Guild + User tables
      → prisma.$transaction:
        → findOwnerRow() check                                    // Guildship table
        → tx.guildship.deleteMany({ where: { id: { in } } })     // Guildship table
        → tx.guild.delete({ where: { id } })                      // Guild table
      → fs.unlink(banner)                                         // disk delete
```

### `createGuildRequest(guildName, username?)`
```
POST /api/guild/:name/request/:username
  → guildsRoutes: POST /:name/request/:username
    → createGuildRequest(guildName, senderUsername, targetUsername)
      → lookupGuild + lookupUser (×2)                              // Guild + User tables
      → prisma.$transaction:
        → findOwnerRow() (sender role check)                      // Guildship table
        → loadUsershipUser({ id: target.id })                     // User table (block check)
        → findUsershipRow(status: Blocked)                        // Usership table
        → findGuildshipRow() (already member?)                    // Guildship table
        → tx.guildship.create({ data: { userId, status } })       // Guildship table
        → tx.guild.update({ data: { guildshipIds: { push } } })  // Guild table
```

### `removeGuildRequest(guildName, direction, username?)`
```
POST /api/guild/:name/pending/:direction/:username
  → guildsRoutes: POST /:name/pending/:direction/:username
    → removeGuildRequest(guildName, username, direction)
      → lookupGuild + lookupUser                                   // Guild + User tables
      → prisma.$transaction:
        → findPendingGuildshipRow()                                // Guildship table
        → removeGuildshipFromGuild()
          → tx.guild.update({ data: { guildshipIds } })           // Guild table
          → tx.guildship.delete({ where: { id } })                // Guildship table
```

### `acceptGuildRequest(guildName, username)`
```
POST /api/guild/:name/accept/:username
  → guildsRoutes: POST /:name/accept/:username
    → acceptGuildRequest(guildName, targetUsername, requesterUsername)
      → lookupGuild + lookupUser (×2)                              // Guild + User tables
      → prisma.$transaction:
        → findPendingGuildshipRow()                                // Guildship table
        → (OwnerRequest: check requester == target)
        → (UserRequest: findOwnerRow)
        → tx.guildship.update({ data: { status: User } })         // Guildship table
```

### `deleteGuildship(guildName, username)`
```
POST /api/guild/:name/remove/:username
  → guildsRoutes: POST /:name/remove/:username
    → deleteGuildship(guildName, targetUsername, requesterUsername)
      → lookupGuild + lookupUser (×2)                              // Guild + User tables
      → prisma.$transaction:
        → findOwnerRow() check                                    // Guildship table
        → findGuildshipRow() check                                // Guildship table
        → requireNotLastOwner() (if target is owner)              // Guildship table
        → removeGuildshipFromGuild()
          → tx.guild.update({ data: { guildshipIds } })           // Guild table
          → tx.guildship.delete({ where: { id } })                // Guildship table
```

### `promoteOwner(guildName, username)`
```
POST /api/guild/:name/promote/:username
  → guildsRoutes: POST /:name/promote/:username
    → promoteMember(guildName, targetUsername, requesterUsername)
      → lookupGuild + lookupUser (×2)                              // Guild + User tables
      → prisma.$transaction:
        → findOwnerRow() (requester check)                        // Guildship table
        → findGuildshipRow() (target check)                       // Guildship table
        → tx.guildship.update({ data: { status: Owner } })        // Guildship table
```

### `demoteOwner(guildName, username)`
```
POST /api/guild/:name/demote/:username
  → guildsRoutes: POST /:name/demote/:username
    → demoteOwner(guildName, targetUsername, requesterUsername)
      → lookupGuild + lookupUser (×2)                              // Guild + User tables
      → prisma.$transaction:
        → findOwnerRow() (requester check)                        // Guildship table
        → findGuildshipRow() (target check)                       // Guildship table
        → requireNotLastOwner()                                    // Guildship table
        → tx.guildship.update({ data: { status: User } })         // Guildship table
```

### `leaveGuild(guildName)`
```
POST /api/guild/:name/leave
  → guildsRoutes: POST /:name/leave
    → leaveGuild(guildName, username)
      → lookupGuild + lookupUser                                   // Guild + User tables
      → prisma.$transaction:
        → findGuildshipRow()                                       // Guildship table
        → requireNotLastOwner() (if owner)                        // Guildship table
        → removeGuildshipFromGuild()
          → tx.guild.update({ data: { guildshipIds } })           // Guild table
          → tx.guildship.delete({ where: { id } })                // Guildship table
```

### `getDirectionalGuildRequests(direction)`
```
GET /api/guild/pending/:direction
  → guildsRoutes: GET /pending/:direction
    → getDirectionalGuildRequestsGlobal(username, direction)
      → lookupUser(username)                                       // User table
      → outgoing: prisma.guildship.findMany({ status: UserRequest }) // Guildship table
      → outgoing: prisma.guild.findMany({ hasSome })             // Guild table
      → incoming: prisma.guildship.findMany({ status: Owner })    // Guildship table
        → prisma.guild.findMany({ hasSome })                      // Guild table
        → prisma.guildship.findMany({ status: UserRequest })      // Guildship table
        → prisma.user.findMany({ where: { id: { in } } })          // User table
```

---

## Cards

### `getCardList()`
```
GET /api/card
  → cardsRoutes: GET /
    → getCardList(limit, offset)
      → prisma.card.findMany()                                     // Card table
```

### `getCard(cardName)`
```
GET /api/card/:name
  → cardsRoutes: GET /:name
    → getCard(cardName)
      → prisma.card.findUnique({ where: { name } })               // Card table
```

### `createCard({ name, pokemon, ... })`
```
POST /api/card  (requireAdmin)
  → cardsRoutes: POST /
    → createCard(data)
      → prisma.card.findUnique({ where: { name } })               // Card table (conflict)
      → prisma.card.create({ data })                               // Card table
```

### `editCard(cardName, { name?, pokemon?, ..., cardFile? })`
```
POST /api/card/:name  (requireAdmin)
  → cardsRoutes: POST /:name
    → editCard(cardName, opts)
      → lookupCard(cardName)                                       // Card table
      → prisma.card.findUnique({ where: { name } })               // Card table (conflict)
      → saveUploadedFile() (if image)                              // disk write
      → prisma.card.update({ where: { id }, data: updates })      // Card table
```

### `deleteCard(cardName)`
```
POST /api/card/:name/remove  (requireAdmin)
  → cardsRoutes: POST /:name/remove
    → deleteCard(cardName)
      → lookupCard(cardName)                                       // Card table
      → prisma.card.delete({ where: { id } })                     // Card table
      → fs.unlink(card.image)                                      // disk delete
```

---

## Validation Rules

### Backend validation (`backend/src/validation.ts`)

| Schema | Fields |
|--------|--------|
| `loginSchema` | username (1–30 chars), password (1–60 chars) |
| `registerSchema` | email (valid → lowered), username (3–30, sanitized), password (8–60, uppercase+lowercase+digit) |
| `editUserSchema` | `registerSchema.partial()` |
| `usernameUserSchema` | `registerSchema.shape.username` |
| `createGuildSchema` | name (3–30, sanitized) |
| `nameGuildSchema` | `createGuildSchema.shape.name` |
| `editGuildSchema` | `createGuildSchema.partial()` |
| `createCardSchema` | name (1+, sanitized), pokemon (1+, sanitized), rarity (CardRarity), type (CardType), subType (CardType, optional), health (int ≥ 0) |
| `editCardSchema` | `createCardSchema.partial()` |

### Frontend validation (`frontend/src/validation.ts`)

Mirrors backend but uses `z.enum()` with runtime arrays for CardRarity/CardType since Prisma enums don't exist in browser. Re-exports `sanitize` from constants.ts.

### Limits (`backend/src/constants.ts`)

| Constant | Value | Used by |
|----------|-------|---------|
| USERNAME_MIN / MAX | 3 / 30 | user validation |
| PASSWORD_MIN / MAX | 8 / 60 | password validation |
| GUILD_NAME_MIN / MAX | 3 / 30 | guild name validation |
| BCRYPT_ROUNDS | 12 | password hashing |
| TOKEN_EXPIRY | 7d | JWT sign |
| COOKIE_MAX_AGE | 604800 | cookie maxAge (7 days in seconds) |
| PAGINATION_DEFAULT / MAX | 50 / 200 | all list endpoints |
| MAX_FILE_SIZE | 5 MB | upload limit |
| BODY_LIMIT | 6 MB | Fastify body parser |
| RATE_LIMIT_AUTH | 20/min | auth routes |
| RATE_LIMIT_GLOBAL | 600/min | other routes |
| ALLOWED_MIME | png/jpg/gif/webp | upload whitelist |

### Secrets

| Env var | Secret file | Purpose |
|---------|-------------|---------|
| JWT_SECRET | `jwt_secret` | JWT signing key |
| HASH_SECRET | `hash_secret` | bcrypt dummy hash (timing-safe comparison) |
| DB_USER/PASS/NAME | `db_user`, `db_password`, `db_name` | PostgreSQL credentials |
| SSL_KEY/CERT | `server.key`, `server.crt` | TLS certificate |

### Sanitization

`sanitize()` (identical in backend `constants.ts` and frontend `constants.ts`) strips HTML tags via `/<[^>]*>/g` and trims whitespace. Applied via Zod `.transform(sanitize)` on username, guild name, card name, pokemon fields. Usernames displayed in UI are sanitized at render time.

### Error Flow

```
Zod validation fails
  → validateBody() sends 400 { error: "validation.xxx" }
  → frontend receives data.error
  → frontend throws new Error(data.error)
  → page component catches → setErrorMsg(err.message)
  → StatusMessage calls t(err.message)
  → getMsg() resolves "validation.xxx" → translated string
  → displayed in <p class="auth-error">
```

English translations load synchronously (`import enDefault from "./language/en.json"`) so keys are never shown raw. French loads async, falls back to English until ready.
