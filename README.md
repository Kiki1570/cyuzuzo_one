# Computer Deposit Tracker

Admin-only web application for tracking computer deposits and retrievals. Built with React, Express, Node.js, and MongoDB.

## Behavior

- The first administrator is created through a one-time setup screen. Once an administrator exists, setup is permanently closed.
- Only an authenticated administrator can add people/computers, view records and history, or change a status.
- New records start as **Not deposited**.
- Admin actions move a record between **Deposited** and **Retrieved / withdrawn**. Each action is timestamped and records the administrator and optional note.
- Search/filter, summary counts, CSV export, and print-friendly reports are included.
- No end-user accounts or public record views exist.

## Requirements

- Node.js 18.18+ (or Node 20+)
- MongoDB local or Atlas connection string

## Run locally

1. Configure the API:

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set MONGO_URI and a long random JWT_SECRET
   npm install
   npm run dev
   ```

2. In another terminal, run the web app:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open the Vite URL (normally http://localhost:5173). Create the first admin on the setup screen. Keep the password private.

## Configuration

Backend variables are documented in `backend/.env.example`. `FRONTEND_ORIGIN` should be the exact deployed frontend origin in production. Set `VITE_API_URL` in the frontend environment if the API is not at `http://localhost:5000/api`.

Do not commit `.env` files. Use HTTPS and a strong, unique JWT secret in production. The one-time setup endpoint is disabled automatically as soon as an admin exists; if admin access is lost, restore it through a controlled database/admin recovery process rather than reopening public registration.

## API overview

- `GET /api/health` — service health
- `GET /api/auth/setup-status` — whether initial setup is available
- `POST /api/auth/setup` — create the first admin only
- `POST /api/auth/login` — admin login
- `GET /api/auth/me` — current admin (auth required)
- `GET /api/admin/records` — list/search/filter records (auth required)
- `POST /api/admin/records` — create a record (auth required)
- `PATCH /api/admin/records/:id/status` — mark deposited/retrieved and append history (auth required)
- `GET /api/admin/summary` — status totals (auth required)

All record and summary endpoints are protected on the server, not merely hidden in the UI.
