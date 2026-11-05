# ResolveX API

ResolveX API, built with Express and MongoDB/Mongoose. It includes account registration/login, role checks, public/private complaint access, GeoJSON nearby queries, tracking, discussion, support, department management, notifications, reports, and admin analytics. The React website is in `../frontend`.

## Requirements

- Node.js 20 or newer
- MongoDB locally or a MongoDB Atlas connection string

## Run locally

From this directory:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and `CLIENT_ORIGIN=http://localhost:5173` in `.env`, then run:

```powershell
npm run dev
```

The health endpoint is `http://localhost:5000/api/health`.

## API outline

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/complaints`, `GET /api/complaints`, `GET /api/complaints/nearby`, `GET /api/complaints/track/:trackingId`
- `GET|PUT|DELETE /api/complaints/:id`
- `GET|POST /api/complaints/:id/comments`; `PUT|DELETE /api/complaints/:id/comments/:commentId`
- `POST|DELETE|GET /api/complaints/:id/support`
- `POST /api/complaints/:id/status` (administrator or assigned officer)
- `GET /api/departments`; administrator-only department create/update and officer assignment
- `GET /api/notifications`, `PUT /api/notifications/:id/read`
- `POST /api/reports`; administrator report review at `GET|PUT /api/reports`
- `GET /api/admin/dashboard`, `GET /api/admin/users`, `PUT /api/admin/complaints/:id/assign`, `GET /api/admin/reports/analytics`

Protected endpoints require `Authorization: Bearer <token>`. Coordinates are sent as `[longitude, latitude]`. Complaints accept image URLs; actual file upload/Cloudinary integration is not included in this MVP. Password-reset email, realtime notifications, and the React frontend are follow-up work.

## Important setup note

Public registration always creates a `community` account. Create the first administrator through a controlled database/admin provisioning process; never accept a public `role` field during registration.

After an administrator is provisioned, they can promote accounts to `officer` from the web app's **Community members** page and assign officers to departments.
