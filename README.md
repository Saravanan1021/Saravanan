# Thozhil Backend

This workspace now includes a Node.js backend with a SQLite database and mobile OTP support.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

3. If you want real SMS OTP, configure Twilio values in `.env`.
   Otherwise the server will log the OTP to the console for local testing.

4. Start the server:
   ```bash
   npm start
   ```

5. Open the app in browser:
   ```
   http://localhost:3000
   ```

## Render deployment

This project can be deployed on Render as a Node web service.

1. Connect your repository to Render.
2. Use the default build command:
   ```bash
   npm install
   ```
3. Use the start command:
   ```bash
   npm start
   ```
4. Add environment variables on Render:
   - `DATA_DIR=/data`
   - `USE_TWILIO=true`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_PHONE`

The included `render.yaml` config creates a persistent `/data` disk for SQLite.

## What changed

- `server.js` serves the front-end and exposes REST APIs for OTP, users, jobs, and applications.
- SQLite database stored in `data.sqlite`.
- Front-end now calls backend OTP endpoints for mobile verification.
- New APIs:
  - `POST /api/otp/request`
  - `POST /api/otp/verify`
  - `GET /api/jobs`
  - `POST /api/jobs`
  - `GET /api/profile?phone=`
  - `POST /api/profile`
  - `POST /api/apply`
