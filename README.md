# Food Ordering Backend

Production-oriented NestJS backend for a role-based food ordering system using **GraphQL (code-first)**, **Prisma**, **PostgreSQL**, and **JWT** authentication.

---

## 🔥 Highlights

- RBAC enforced via NestJS Guards
- ReBAC (country-based access control)
- Transaction-safe order processing
- Strict order lifecycle enforcement
- Ownership validation for all mutations

## System at a glance

- **RBAC**: route-level gates via **`@Roles`** + global **`RolesGuard`**
- **ReBAC**: country-scoped reads/writes (**`applyCountryScope`** merged into **`where`** + extra service checks)
- **Transactions**: order creation and **`checkout`** wrapped in **`prisma.$transaction`**
- **Order lifecycle**: strict **`CREATED` → `PAID` / `CANCELLED`**; invalid transitions rejected
- **Modular NestJS**: bounded contexts with thin GraphQL resolvers and **service-owned** domain rules

## Request flow (quick view)

`Client → POST /graphql → GqlAuthGuard → RolesGuard → Resolver → Service → Prisma → PostgreSQL`

---

## Why this is production-ready (summary)

- **Transactions** keep **order + lines + cart clear** atomic—no half-written orders.
- **ReBAC** + explicit **403 / 404** patterns reduce **cross-tenant data leakage** (country scope + “exists but forbidden” vs “not found”).
- **Ownership** on orders (`userId`) limits **horizontal privilege escalation**; payments validated against **order country**.
- **DTO validation** (`ValidationPipe` + `class-validator`) rejects unknown fields and bad shapes before services run.

## Common failure prevention

| Risk | Mitigation |
|------|------------|
| Cross-country catalog access | **ReBAC** filters + **403** when a foreign row exists |
| **MEMBER** running **`checkout`** / **`cancelOrder`** | **RBAC** on resolver (`@Roles`) |
| Mutating orders after **payment** | **`checkout`** only from **`CREATED`**; **cancel** only from **`CREATED`** |
| Mixed-country **one order** | **`createOrder`** rejects carts spanning countries |
| Invalid GraphQL input | DTOs + strict **ValidationPipe** |

## How to demo this project

1. **MEMBER** (e.g. `thanos@titan.mcu` / `Password123!`) — build cart, **`createOrder`**, then **`checkout`** → expect **403** (role guard).
2. **MANAGER** (e.g. `carol.danvers@shield.gov`) — same flow → **`checkout`** succeeds → order **`PAID`**.
3. **ADMIN** (`nick.fury@shield.gov`) — **`restaurants`** lists **both** countries; use **`addPaymentMethod`** (admin-only) per `docs/examples.graphql`.

Use **`docs/examples.graphql`** and **`POST /graphql`** (Postman: JSON body + `Content-Type: application/json`; add `apollo-require-preflight` if Apollo CSRF blocks you).

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

1. **Clone / copy this project** and install dependencies:

   ```bash
   cd food-ordering-backend
   npm install
   ```

   Generate Prisma Client (ensures enum/type exports are available):

   ```bash
   npm run prisma:generate
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Update `DATABASE_URL`, `JWT_SECRET`, and optionally `PORT`.

3. **Apply database schema**

   ```bash
   npx prisma migrate deploy
   ```

   For local development you can instead run:

   ```bash
   npm run prisma:migrate
   ```

4. **Seed demo data**

   ```bash
   npm run db:seed
   ```

   Default password for all seeded users: `Password123!`

5. **Start the API**

   ```bash
   npm run start:dev
   ```

   GraphQL Playground / Apollo Sandbox is served at `http://localhost:3000/graphql` (depending on your Nest/Apollo version; introspection is enabled in development builds).

## Quick Test Flow

1. **Login** (`login`) and copy `accessToken`
2. **Restaurants** (`restaurants`) to observe **ReBAC** (country scoping)
3. **Menu** (`menuItems`) for a restaurant in-scope
4. **Cart** (`addToCart`, `myCart`, `removeFromCart`)
5. **Order** (`createOrder`)
6. **Checkout** (`checkout`) — **MANAGER/ADMIN only**

Example operations are available in `docs/examples.graphql`.

## Seeded users

| Name             | Email                       | Role    | Country |
| ---------------- | --------------------------- | ------- | ------- |
| Nick Fury        | nick.fury@shield.gov        | ADMIN   | USA     |
| Captain Marvel   | carol.danvers@shield.gov    | MANAGER | INDIA   |
| Captain America  | steve.rogers@shield.gov     | MANAGER | USA     |
| Thanos           | thanos@titan.mcu            | MEMBER  | INDIA   |
| Thor             | thor@asgard.mcu             | MEMBER  | INDIA   |
| Travis           | travis@usa.test             | MEMBER  | USA     |

Restaurants: one in **INDIA** (“Spice Route”) and one in **USA** (“Liberty Diner”), each with two menu items.

## Folder structure

```text
food-ordering-backend/
├── docs/
│   └── examples.graphql
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   ├── graphql/
│   │   ├── auth.module.ts
│   │   ├── auth.resolver.ts
│   │   ├── auth.service.ts
│   │   └── jwt.strategy.ts
│   ├── cart/
│   │   ├── dto/
│   │   ├── graphql/
│   │   ├── cart.module.ts
│   │   ├── cart.resolver.ts
│   │   └── cart.service.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── guards/
│   │   ├── prisma/
│   │   ├── rebac/
│   │   ├── types/
│   │   └── utils/
│   ├── menu/
│   ├── orders/
│   ├── payments/
│   ├── restaurants/
│   ├── users/
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── README.md
```

---

## Architecture

- **Modular NestJS** layout: each bounded context (`auth`, `restaurants`, `menu`, `cart`, `orders`, `payments`) owns its service + resolver.
- **Business rules live in services**, not resolvers. Resolvers validate presence/shape via `class-validator` and delegate to services.
- **Prisma** is the single persistence layer; `PrismaModule` is global.
- **GraphQL context** carries the raw HTTP `req`; Passport attaches `req.user` after JWT validation.

### RBAC (role-based access control)

- **`@Roles(...)`** metadata on resolvers combined with a global **`RolesGuard`**.
- Examples:
  - `checkout` / `cancelOrder`: `ADMIN`, `MANAGER` only.
  - `addPaymentMethod`: `ADMIN` only.
  - `updatePaymentMethod`: `ADMIN` only.
  - `deletePaymentMethod`: `ADMIN` only.
  - `createOrder`, cart mutations, catalog queries: any authenticated role subject to **ReBAC** rules in services.

JWT payload includes `role` and `country` so the API can enforce role rules without an extra DB hit on every guard check (services still load entities when needed for ownership checks).

**Resolver-level enforcement (excerpt):**

```typescript
@Roles(Role.ADMIN, Role.MANAGER)
@Mutation(() => OrderGql)
async checkout(/* ... */) { /* OrdersService.checkout */ }
```

### ReBAC (relationship / attribute-based access control — country scope)

Helper: **`applyCountryScope(user)`** in `src/common/rebac/rebac.helper.ts`.

**Core helper (behavioral contract):**

```typescript
export function applyCountryScope(user: AuthUser) {
  if (user.role === Role.ADMIN) return {};
  return { country: user.country };
}
```

- **ADMIN**: scope is **`{}`** (global visibility for catalog-style queries that use this helper).
- **MANAGER / MEMBER**: scope **`{ country: user.country }`** merged into Prisma **`where`** for multi-country isolation.

Additional rules:

- **Cross-country reads** (e.g., `menuItems` for a foreign restaurant id) return **403 Forbidden** when a row exists but is outside the caller’s country, and **404** when the id does not exist at all (avoid leaking foreign ids).
- **Orders** and **carts** enforce **ownership** (`userId`) plus **country** alignment for non-admin users.

### Order lifecycle

Valid transitions:

- `CREATED` → `PAID` (checkout)
- `CREATED` → `CANCELLED` (cancel)

Invalid:

- `PAID` → `CANCELLED`
- Any transition from `CANCELLED`

### Transactions

- **`createOrder`**: creates **`Order` + `OrderLine`** rows, then clears the cart in a single **Prisma** transaction.
- **`checkout`**: re-validates ownership, status, optional payment method, then moves **`CREATED` → `PAID`** in a transaction.

---

## Example GraphQL operations

See `docs/examples.graphql`.

---

## Test scenarios (manual)

1. **Login as India manager**, list restaurants → only India restaurant returned.
2. **Login as USA member**, query India restaurant menu → **403**.
3. **Member** builds cart and `createOrder` succeeds; `checkout` → **403** (role guard).
4. **Manager** checks out own `CREATED` order → `PAID`.
5. **Checkout with payment method** where `paymentMethod.country !== order.country` → **400**.
6. **Cancel `PAID` order** → **400**.
7. **Manager** calls `addPaymentMethod` → **403**; **Admin** succeeds with `userId` targeting another user (country must match that user).
8. **Cart** with items from two countries → `createOrder` → **400**.
9. **Empty cart** → `createOrder` → **400**.
10. **Duplicate `addToCart`** increments quantity (unique `[cartId, menuItemId]`).

## Scripts

| Script            | Purpose                |
| ----------------- | ---------------------- |
| `npm run start:dev` | Dev server + watch   |
| `npm run build`     | Compile to `dist/`   |
| `npm run prisma:generate` | Prisma client    |
| `npm run prisma:migrate`  | Dev migrations   |
| `npm run db:seed`       | Seed data          |

Optional local API smoke suite:

- `node scripts/run-api-tests.js`: runs an end-to-end GraphQL check against `http://localhost:3000/graphql` (requires the API to be running).

## Security notes

- Passwords are hashed with **bcrypt**.
- JWTs are bearer tokens; protect **`JWT_SECRET`** in production.
- All non-public GraphQL operations require a valid JWT.
- Input DTOs use **`class-validator`** with **`ValidationPipe`** (`whitelist`, `forbidNonWhitelisted`).

---

## Limitations / future improvements

- No **refresh tokens** or token rotation API (access JWT only).
- No **rate limiting** or abuse throttling on `/graphql`.
- No **caching** layer (e.g. Redis) for catalog reads.
- No **audit logs** / event stream for security or compliance review.
- Automated **e2e tests** not included in-repo (manual checklist below).

## License

Private / take-home assignment.
