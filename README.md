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
SELECT * FROM "merch_drops" WHERE "id" = :dropId FOR UPDATE;
```
This forces concurrent database requests for the same row to wait sequentially, guaranteeing that the inventory decrement is computed against verified, locked state.

### 2. Relational Check Constraints
To prevent race conditions from ever pushing stock levels negative, the PostgreSQL engine is configured with a native constraint:
```sql
ALTER TABLE "merch_drops" ADD CONSTRAINT check_available_stock_non_negative CHECK (available_stock >= 0);
```
If a transaction attempts to decrement stock below zero, the engine immediately throws a constraint violation and aborts/rolls back the transaction, preserving data integrity.

### 3. Expiration Scheduler
Reservations occupy inventory for a maximum of 60 seconds (hold window). An in-memory queue coupled with a periodic database scheduler reclaims abandoned items:
- **Immediate Expiration**: Scheduled on-memory timers release holds after 60 seconds.
- **Orphan Cleanup**: A background scheduler queries the database every 5 seconds for any pending reservations whose `expires_at` is less than the current time, reverting them back to the active inventory pool.

---

## 💡 Concurrency & Expiration Architecture Deep-Dive

### Concurrency: Preventing Double-Claiming on the Last Item
When only **1 unit** of a popular sneaker remains and hundreds of users click "Reserve" concurrently, the system guarantees that exactly one user succeeds while the others receive a graceful conflict error, avoiding overselling.

1. **Explicit Pessimistic Lock (`SELECT ... FOR UPDATE`)**: 
   Every reservation process initiates a database transaction with `lock: transaction.LOCK.UPDATE`. This acquires a row-level write lock on the target sneaker record in the `merch_drops` table. Any other concurrent transaction attempting to read or modify this specific row is blocked and queued until the active transaction commits or rolls back.
2. **Sequential Inventory Verification**:
   Once the lock is acquired, the transaction evaluates the `available_stock`. Because the database row is locked, this check is guaranteed to read the absolute latest state. If `available_stock <= 0`, the transaction is rolled back, releasing the lock, and a `409 Conflict` error is returned to the user.
3. **Database Check Constraint Fail-safe**:
   As a final line of defense against application logic errors, a database constraint `CHECK (available_stock >= 0)` enforces that stock cannot be negative. If any race condition bypasses the check, the database engine aborts the transaction instantly and rolls back all operations.
4. **WebSocket Broadcast State Sync**:
   The instant a reservation transaction successfully commits (decreasing the stock), the backend broadcasts the updated available stock count to all active WebSocket clients. The UI updates dynamically, rendering the item as "Sold Out" or updating the stock count, preventing further clicks.

### Expiration: Handling the 60-Second Hold Window
Reservations are temporary. If a user holds an item but fails to check out within 60 seconds, the held item must be released back into the active pool. This is handled using a **dual-layer hybrid expiration system**:

```
[Create Reservation] ──► (Create DB Reservation Status='PENDING')
         │
         ├──► [Layer 1: Memory] ─► (Set setTimeout for 60s) ─────┐
         │                                                      ▼
         └──► [Layer 2: Database] ─► (Daemon polls DB every 5s) ──┼─► [Execute Expiration Transaction]
                                                                │   1. Lock Reservation (FOR UPDATE)
                                                                │   2. If PENDING: Status='EXPIRED'
                                                                │   3. Lock & Increment Merch Drop Stock (+1)
                                                                │   4. Broadcast WebSockets Sync
                                                                └─► 5. Commit Transaction
```

1. **Layer 1: In-Memory Timers (Low Latency)**
   - When a reservation is successfully created, the backend starts a local node-level `setTimeout` set to fire in 60 seconds.
   - Upon execution, it triggers `expireReservation(reservationId)`, which transactionally rolls back the stock and marks the reservation as `EXPIRED`.
2. **Layer 2: Active Periodic Cleanup Daemon (Fault Tolerance & Scalability)**
   - In-memory timers can be lost if a server node crashes, restarts, or handles heavy load.
   - To guarantee reliability, a background cron-like daemon (`startExpirationScheduler`) executes every **5 seconds**.
   - It queries the database using `Reservation.findAll` for any reservations where `status = 'PENDING'` and `expires_at < NOW()`.
   - Any found orphan reservations are passed to `expireReservation` to be reclaimed.
3. **Pessimistic Locking on Expiration**:
   - The expiration function itself executes inside a database transaction and acquires locks on both the reservation row and the merch drop row (`FOR UPDATE`).
   - This ensures that if the in-memory timer and the background daemon try to expire the same reservation at the exact same moment, or if a user attempts to complete a purchase while the item is expiring, the database safely serializes the requests. Only the first acquired lock executes the status update, while the second sees that the status is no longer `PENDING` and aborts.

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

## 🚀 Run & Setup Guide

You can run the application using **Docker Compose** (recommended for isolated runtime environment) or **Locally** (for development).

### Option A: Running with Docker Compose (Recommended)

Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

1. **Configure Environment Variables**:
   Create environment files for both client and server:
   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

2. **Spin Up the Platform**:
   Build the Docker images and start up the containers:
   ```bash
   docker compose up -d --build
   ```
   *This automatically creates the PostgreSQL database, executes all SQL migrations, seeds the database with initial sneaker data, and starts up the frontend and backend.*

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```

---

### Option B: Running Locally

If you prefer to run the client and server directly on your host machine, follow these steps:

#### 1. Setup PostgreSQL Database
Make sure you have PostgreSQL running locally.
- Create a database named `sneaker_drop`.
- Get your PostgreSQL connection URI. Format: `postgres://<username>:<password>@localhost:5432/sneaker_drop`

#### 2. Configure Environment Variables
- Copy the environment templates:
  ```bash
  cp client/.env.example client/.env
  cp server/.env.example server/.env
  ```
- Edit `server/.env` and replace `DATABASE_URL` with your local database URI:
  ```env
  DATABASE_URL=postgres://postgres:your_password@localhost:5432/sneaker_drop
  PORT=5001
  JWT_SECRET=super_secure_secret_key_123!
  NODE_ENV=development
  ```

#### 3. Run SQL Schema Setup & Migrations
The database schema is managed using **Sequelize CLI**. Inside the `server` directory, run:
```bash
cd server
npm install

# Run database migrations to construct the SQL schema tables
npx sequelize-cli db:migrate

# Seed the database with initial merch drops and sneakers
npx sequelize-cli db:seed:all
```

To reset the database schema and re-run all migrations/seeds:
```bash
npm run db:reset
```

#### 4. Start the Backend API Server
With dependencies installed and the schema configured:
```bash
npm run dev
```
*The server will run on `http://localhost:5001`.*

#### 5. Start the React Frontend Client
In a new terminal window, navigate to the `client` directory:
```bash
cd client
npm install
npm run dev
```
*The frontend React application will start on `http://localhost:5173`.*

---

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
  }
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
