# ⚡ Drop Pulse Inventory — Sneaker Drop Storefront

A premium, high-concurrency, real-time sneaker release and reservation storefront. Engineered to mitigate race conditions and prevent inventory overselling during high-traffic "drop" events. The engine implements database-level pessimistic locking (`SELECT ... FOR UPDATE`) in isolated ACID transactions and propagates real-time inventory adjustments instantly to all connected clients via WebSockets.

---

## 🏗️ Architectural Core & Concurrency Mechanics

High-demand flash sales trigger intense concurrent traffic peaks. This application resolves race conditions at the database level to ensure reliable, zero-overselling inventory integrity.

```
                   [ WebSockets / HTTP Clients ]
                                 │
                         ( Load Balancer )
                                 │
                       [ Express API Cluster ]
                        │                   │
               ( Acquire Row Lock )   ( Broadcast Update )
                        │                   │
                        ▼                   ▼
           ┌───────────────────────┐   ┌───────────────┐
           │   PostgreSQL Engine   │   │   Socket.io   │
           │  (SELECT ... FOR UPT) │   │   Broadcast   │
           └───────────────────────┘   └───────────────┘
```

### 1. Database-Level Pessimistic Locking
When a reservation request arrives, the backend initiates a transaction and performs a lock query:
```sql
SELECT * FROM "MerchDrops" WHERE "id" = :dropId FOR UPDATE;
```
This forces concurrent database requests for the same row to wait sequentially, guaranteeing that the inventory decrement is computed against verified, locked state.

### 2. Relational Check Constraints
To prevent race conditions from ever pushing stock levels negative, the PostgreSQL engine is configured with a native constraint:
```sql
ALTER TABLE "MerchDrops" ADD CONSTRAINT check_available_stock_non_negative CHECK (available_stock >= 0);
```
If a transaction attempts to decrement stock below zero, the engine immediately throws a constraint violation and aborts/rolls back the transaction, preserving data integrity.

### 3. Expiration Scheduler
Reservations occupy inventory for a maximum of 60 seconds (hold window). An in-memory queue coupled with a periodic database scheduler reclaims abandoned items:
- **Immediate Expiration**: Scheduled on-memory timers release holds after 60 seconds.
- **Orphan Cleanup**: A background scheduler queries the database every 5 seconds for any pending reservations whose `expires_at` is less than the current time, reverting them back to the active inventory pool.

---

## ⚡ Tech Stack

### Frontend Client
* **Vite & React 19** (TypeScript)
* **Tailwind CSS v4** (Custom premium sleek dark mode theme with glassmorphism, dynamic scrolling log monitors, and smooth hover effects)
* **Lucide React** (Modern, clean vector iconography)
* **Socket.io-Client** (Real-time telemetry and state synchronization)

### Backend Server
* **Node.js & Express** (TypeScript)
* **Sequelize ORM** (Postgres adapter, associations declaration, and validation filters)
* **Socket.io** (Bidirectional live events broadcaster)
* **Bcrypt** (Secure password hashing configuration)
* **JWT (Json Web Tokens)** (Stateless authorization middleware)

### Orchestration & Database
* **PostgreSQL 15** (Relational backend with ACID transactions support and constraint engines)
* **Docker & Docker Compose** (Isolated multi-container bridge networking configuration)

---

## 📁 Project Structure

```
drop-pulse-inventory/
├── client/                     # Frontend Vite + React project
│   ├── src/
│   │   ├── components/         # Reusable modals, cards, alerts, logs
│   │   ├── context/            # Socket.io connection state provider
│   │   ├── App.tsx             # Main storefront dashboard component
│   │   └── index.css           # Premium sleek stylesheets
│   ├── .env.example            # Client environmental template
│   └── Dockerfile              # Frontend container image definition
├── server/                     # Backend API & WebSocket server
│   ├── src/
│   │   ├── config/             # DB client configuration
│   │   ├── controllers/        # Express handlers (Controllers pattern)
│   │   ├── dtos/               # Data Transfer Objects (Validation rules)
│   │   ├── middleware/         # Auth & Schema Validation filters
│   │   ├── models/             # Sequelize models & associations declarations
│   │   ├── routes/             # Express routes definition
│   │   ├── services/           # Business Logic layer (Transactions & Schedules)
│   │   ├── socket.ts           # WebSockets server config and broadcasts
│   │   └── index.ts            # Entrypoint bootstrap & Database seed engine
│   ├── .env.example            # Server environmental template
│   └── Dockerfile              # Backend container image definition
├── docker-compose.yml          # Container orchestration topology
└── README.md                   # Project documentation (this file)
```

---

## 🚀 Orchestration & Setup Guide

### 1. Prerequisites
Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### 2. Configure Environment Variables
Establish environmental templates for both client and server:

```bash
# Setup Client configuration
cp client/.env.example client/.env

# Setup Server configuration
cp server/.env.example server/.env
```

### 3. Spin Up the Platform
Build the Docker images and start up the containers in detached mode:
```bash
docker compose up -d --build
```
This builds and launches three interconnected services:
1. `sneaker-db` (Postgres database container, running health checks)
2. `sneaker-backend` (Express application, waiting for the database to be healthy)
3. `sneaker-frontend` (Vite-React static web application)

### 4. Topology Port Map
* **React Storefront**: [http://localhost:5173](http://localhost:5173)
* **Express API Server**: [http://localhost:5001](http://localhost:5001) (Internally maps to container port `5000` to avoid host system conflicts)
* **PostgreSQL Database**: `5432:5432`

---

## 🔒 Concurrency Testing & Validation Playbook

This engine ensures **absolute inventory integrity** under concurrent strain. Here is the validation playbook to confirm its behavior:

### Method A: Parallel Browser Check (Manual UI test)
1. Open **two distinct browser instances** (e.g., standard browser window and an Incognito window) side-by-side, navigated to [http://localhost:5173](http://localhost:5173).
2. **Register/Login** as two separate users (User A in Window 1, User B in Window 2).
3. Find a high-demand drop configured with exactly **1 unit of stock** remaining (e.g., Yeezy Boost Zebra).
4. Click **Reserve Sneaker** on both screens at the exact same fraction of a second.
5. **Observed Result**:
   - One user successfully locks in the 60-second hold (green notification, active checkout timer).
   - The other user's window briefly waits for the database locks to resolve, then returns a `Sold Out!` conflict error.
   - Live telemetry broadcasts the stock drop from `1` to `0` instantly across all sessions.

### Method B: Parallel API Calls (Simulated Strain)
You can simulate race conditions by sending concurrent requests via `curl`. Create two user tokens and trigger reservation requests concurrently:

```bash
# User A attempts reservation
curl -X POST http://localhost:5001/api/drops/reserve \
  -H "Authorization: Bearer <TOKEN_A>" \
  -H "Content-Type: application/json" \
  -d '{"dropId": "<SNEAKER_UUID>"}' &

# User B attempts reservation concurrently
curl -X POST http://localhost:5001/api/drops/reserve \
  -H "Authorization: Bearer <TOKEN_B>" \
  -H "Content-Type: application/json" \
  -d '{"dropId": "<SNEAKER_UUID>"}' &
```

---

## 📡 API Reference & Schema Specification

### 🔐 Authentication Routes

#### `POST /api/auth/register`
Creates a new client account profile.
* **Payload**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "5fa23d11-...",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

#### `POST /api/auth/login`
Authenticates user and signs an authorization JWT.
* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "5fa23d11-...",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

---

### 👟 Sneaker & Reservation Routes

#### `GET /api/drops`
Retrieves all sneaker drops, chronological order of release, current active stock, and the last 5 confirmed purchases.
* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "a4d8c6b9-...",
      "name": "Travis Scott x Air Jordan 1 Low \"Olive\"",
      "price": 150.00,
      "total_stock": 5,
      "available_stock": 4,
      "start_time": "2026-08-08T00:00:00.000Z",
      "purchases": []
    }
  ]
  ```

#### `POST /api/drops/create`
Admin endpoint to register a new sneaker release drop.
* **Payload**:
  ```json
  {
    "name": "Air Jordan 1 Retro High OG 'Chicago'",
    "price": 180.00,
    "total_stock": 15,
    "start_time": "2026-08-08T12:00:00.000Z"
  }
  ```

#### `POST /api/drops/reserve` *(JWT Required)*
Initiates a 60-second database-locked reservation reservation holds.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "dropId": "a4d8c6b9-..."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "reservation_id": "c1a6b4b8-...",
    "expires_at": "2026-08-08T00:01:00.000Z",
    "available_stock": 3
  }
  ```

#### `POST /api/drops/purchase` *(JWT Required)*
Finalizes the payment stage and marks reservation as completed.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "reservationId": "c1a6b4b8-..."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "id": "7fa4b1b3-...",
    "user_id": "5fa23d11-...",
    "drop_id": "a4d8c6b9-...",
    "reservation_id": "c1a6b4b8-...",
    "amount_paid": 150.00,
    "created_at": "2026-08-08T00:00:22.000Z"
  }
  ```

---

### 📡 WebSocket Broadcaster Events

Connected clients automatically subscribe to live inventory updates broadcast by the server:

| Event Name | Direction | Payload Example | Description |
| :--- | :--- | :--- | :--- |
| `stock_updated` | Server -> Client | `{"dropId": "a4d8...", "availableStock": 4}` | Fired immediately when stock is reserved or an expired reservation reverts to stock. |
| `purchase_completed` | Server -> Client | `{"dropId": "a4d8...", "username": "johndoe"}` | Fired when a purchase is finalized. Broadcasts ticker logs of success checkouts. |
