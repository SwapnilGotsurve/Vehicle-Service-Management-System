# Vehicle Service Management System

A MERN vehicle service workflow for customers, staff, mechanics, and administrators. The initial release includes JWT authentication, role-based access, vehicle and service management, conflict-aware bookings, mechanic assignment, service records, parts inventory, invoices, notifications, and responsive dashboards.

## Run locally

1. Install MongoDB and start it locally, or provide a hosted MongoDB URI.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and `JWT_SECRET`.
3. Copy `frontend/.env.example` to `frontend/.env`.
4. Run `npm install` in the root, then `npm run install:all`.
5. Seed demo data with `npm run seed --prefix backend`.
6. Start both applications with `npm run dev`.

Frontend: http://localhost:5173  |  API: http://localhost:5000/api

## Demo credentials

`admin@example.com` / `Admin@123`  
`staff@example.com` / `Staff@123`  
`mechanic@example.com` / `Mechanic@123`

Change demo passwords before production use. See [PRD.md](PRD.md) for the complete product roadmap.
