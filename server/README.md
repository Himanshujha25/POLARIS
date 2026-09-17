# POLARIS Server

Express + Mongoose + Socket.IO. Uses Atlas MongoDB via `MONGO_URI` in `.env`.

## Run
```
npm install
npm start          # :5000
npm run smoke      # full API verification (needs server running)
```

## First admin
If the DB is empty, create the first admin via `POST /api/v1/auth/bootstrap`
with `{ username, email, password }`, then login normally.

## Routes (`/api/v1`)
auth, expeditions, personnel, cargo, inventory, assets, alerts — see `MASTER.md`.
Automation loop runs every 60s (deadman, depletion, maintenance, cargo ETA).
