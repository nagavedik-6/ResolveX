# ResolveX

ResolveX is a full-stack community complaint reporting and resolution website. It has a React/Vite browser app in `frontend/` and an Express/MongoDB API in `backend/`.

## What is included

- Community feed with category, neighborhood, search, support and saved-report actions
- Registration, login, session restore and sign out
- Public and private complaint submission with map pin, optional geolocation and image URL
- Complaint detail, threaded comments/replies, tracking ID and status history
- Interactive OpenStreetMap complaint map, status/category filters and nearby discovery
- Member profile view/edit and in-app notification inbox
- Role-aware staff tools for assignment and status progress
- Admin dashboard, department/officer management, user directory, content moderation and analytics

Image uploads, password-reset email delivery and realtime notifications are not configured in this MVP. Complaint images and profile pictures use public image URLs.

## Run locally

You need Node.js 20+ and a MongoDB instance (local or Atlas).

1. Configure the API:

   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   ```

   In `backend/.env`, set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and `CLIENT_ORIGIN=http://localhost:5173`.

2. Start the API in that terminal:

   ```powershell
   npm run dev
   ```

3. In a second terminal from the project root, configure and start the website:

   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```

   Open `http://localhost:5173`. The website uses `VITE_API_URL` from `frontend/.env` (defaults to `http://localhost:5000/api`).

   For a temporary public preview, expose port `5173` while both dev servers are running. The Vite dev server proxies `/api` to the backend, and the browser uses that same-origin proxy when the configured API URL points to `localhost`.

4. For a production frontend bundle, run `npm run build` inside `frontend/`.

## Deploy on Render

The root `render.yaml` configures one free web service that builds the frontend and serves it from the API. Before deployment:

1. Push this project to a GitHub repository and create a MongoDB Atlas database.
2. In Atlas, create a database user and configure network access for the Render service. Use a strong, unique database password.
3. In Render, choose **New +** → **Blueprint**, connect the repository, and set `MONGODB_URI` to the Atlas connection URI when prompted. Render generates `JWT_SECRET`.
4. Deploy the Blueprint. The service health check is `/api/health`; the deployed site and API use the same public URL.

The free Render service may sleep when idle. Store connection strings and other secrets in Render's environment settings, not in source files.

Public registration creates community accounts only. An administrator can promote community accounts to officers in **Community members** and assign them to departments. Provision the first administrator through MongoDB Compass by opening the `users` collection, finding the trusted account by email, and changing its `role` to `admin`. Administrator privileges are intentionally unavailable from public registration and the admin UI.

## Main paths

- `/` community board
- `/map` map and location discovery
- `/report` complaint submission
- `/track` public tracking ID lookup
- `/my-complaints`, `/profile`, `/notifications` community account pages
- `/admin`, `/departments`, `/users`, `/moderation`, `/analytics` administrator pages
- `/assigned` officer work queue
