# Employee & Task Management System

A MERN application for managing employees, assigning work, tracking task status and viewing team workload.

## Stack
- React + Vite + React Router
- Node.js + Express
- MongoDB + Mongoose
- Axios and plain CSS

## Requirements
Node.js 18.18+ and MongoDB (local or Atlas).

## Run locally

### 1. Backend
```bash
cd server
cp .env.example .env
# Set MONGODB_URI and PORT in .env
npm install
npm run dev
```
The API runs at `http://localhost:5000`. Health check: `/api/health`.

### 2. Frontend
In another terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open the Vite URL shown in the terminal. Set `VITE_API_URL` to the backend URL including `/api`.

## Environment variables
Backend: `PORT`, `MONGODB_URI`, `CLIENT_URL`, `NODE_ENV`.
Frontend: `VITE_API_URL`.

## API overview
- `GET/POST /api/employees`
- `GET/PUT/DELETE /api/employees/:id`
- `GET/POST /api/tasks`
- `GET/PUT/DELETE /api/tasks/:id`
- `PUT /api/tasks/:id/status` (the only status transition endpoint)
- `GET /api/dashboard`
- `GET /api/tasks/export/csv`

List endpoints accept `page`, `limit`, `search`, `department`, `priority`, `status`, `dueFrom`, `dueTo`, and `sort`. Task sorting supports `createdAt`, `dueDate`, `priority`, and `title`.

## Data model and relationship
An employee has a unique `employeeId` and normalized unique email. A task stores the employee ObjectId and an `employeeSnapshot` (name, employee ID, department). The snapshot keeps historical task records readable if an employee is later deleted.

## Business rules
- Task assignment is validated on the server. Inactive employees cannot receive tasks. On Leave employees are blocked only when the task start date falls within the leave dates, inclusive.
- Due date cannot precede start date.
- New tasks always start as Todo. Status changes use the dedicated status endpoint and only allow Todo → In Progress, Todo → Cancelled, In Progress → Completed, and In Progress → Cancelled.
- Completed/Cancelled tasks cannot be edited. Completed date is assigned by the server.
- An employee can have at most three active tasks (Todo + In Progress).
- An employee cannot be deleted while they have active tasks.
- Overdue means today's date is later than due date and status is neither Completed nor Cancelled.

## Assignment questions
1. **Where are status transitions validated and why?** In the task status controller on the backend. A client can be modified or bypassed, so the API is the trusted boundary. The regular task update endpoint does not accept status.
2. **Why does Completed Date come from the backend?** It is a system event timestamp. Taking it from the browser would allow clients to submit incorrect or future dates and create inconsistent records.
3. **How are inactive/on-leave assignments blocked?** Before creating or reassigning a task, the server loads the employee, rejects Inactive status, and checks whether the task start date is inside an On Leave period (inclusive).
4. **Why are filtering and pagination on the backend?** It avoids transferring the full collection, scales better, and makes the server the consistent source of truth for results and totals.
5. **Why do filters live in the URL?** URLs can be refreshed, bookmarked, shared, and navigated with browser history while preserving the exact list state.
6. **What if two requests assign a fourth active task simultaneously?** Both requests could read a count of two before either writes, then both insert and exceed capacity. A production-grade solution should make the capacity check and write atomic, for example with a transaction plus a per-employee lock/counter or another serialized allocation strategy. A simple count-then-create check is vulnerable to this race.

## Notes / assumptions
- Dates are stored as MongoDB dates and treated as calendar dates for validation.
- No authentication is included, as requested.
- For a production deployment, use MongoDB Atlas and set CORS origins explicitly.
- The basic capacity check is implemented in the API; see the concurrency note above for the additional protection needed under simultaneous writes.


Deployment configuration verified for Vercel.
