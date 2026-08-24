# Postflow

Postflow is an internal Topic & Post Tracking application built with Next.js App Router, TypeScript, Payload CMS, Neon PostgreSQL, Tailwind CSS, and Payload authentication.

The model intentionally separates current state from history:

- `posts.status` and `posts.performedBy` store the latest workflow state and latest performer.
- `post-actions` stores the append-only audit trail of every workflow action.

There are no Postflow workflow roles. Every authenticated Postflow user has the same topic/post permissions.

Payload CMS admin access is separate: the first user created in the database is treated as the Payload admin user, while later users are normal Postflow users and cannot access `/admin`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Neon PostgreSQL database and copy the pooled connection string.

3. Configure environment variables:

```bash
cp .env.example .env
```

Set:

```env
DATABASE_URL=postgres://...
PAYLOAD_SECRET=long-random-secret
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

4. Generate Payload types:

```bash
npm run generate:types
```

5. Run migrations or let Payload create tables during development:

```bash
npm run migrate
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## First User

Visit `http://localhost:3000/admin` and create the first Payload user. That first database user receives Payload admin access and can also sign into the Postflow dashboard at `/login`.

Later users should create accounts from:

```text
http://localhost:3000/signup
```

Signup users can log into Postflow at `/login`, but cannot access the Payload admin dashboard at `/admin`.

If you are adding this to an existing database, sync the oldest user as the Payload admin:

```bash
npm run users:sync-admin
```

## Seed Data

Optional development seed:

```bash
npm run seed
```

This creates User A, User B, User C, and User D with password `Postflow123!`, then creates sample Open, Review, Proof Read, Posted, and Declined records through the real workflow service.

## Workflow

Central workflow rules live in `src/lib/workflow/postWorkflow.ts`.

Allowed transitions:

- `open -> review`
- `open -> declined`
- `review -> open`
- `review -> proof_read`
- `review -> declined`
- `proof_read -> review`
- `proof_read -> posted`
- `proof_read -> declined`

`declined` and `posted` are terminal by default.

All status changes go through `changePostStatus`. The browser never controls `performedBy`, audit performer, audit timestamp, or transition validity.

## Testing

Run the business-rule test suite:

```bash
npm test
```

The tests cover creation defaults, `performedBy`, declined-without-content, audit records, spoofing protection, append-only history, invalid transitions, content requirements, and unauthenticated workflow rejection.

## Vercel Deployment

Build locally before deploying:

```bash
npm run build
```

Deployment checklist:

1. Create a Neon PostgreSQL database.
2. Set `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SERVER_URL` in Vercel project environment variables.
3. Set `NEXT_PUBLIC_SERVER_URL` to the production Vercel URL, for example `https://your-project.vercel.app`.
4. Run Payload migrations during release setup with `npm run migrate`.
5. Deploy the Next.js app to Vercel.
6. Create the first user through `/admin`.

Never commit `.env` or production secrets.
# postflow
