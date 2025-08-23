# RakshaSutra Honeypot (Cowrie + Flask)

Services:
- Cowrie (SSH/Telnet) on ports 2222/2223
- Flask web honeypot on http://:8081/bank/login
- Shipper tailing Cowrie logs and POSTing to FastAPI

## Env
Copy `.env.example` to `.env` and set:
- BACKEND_API_BASE
- INGEST_TOKEN
- HONEYPOT_AREA (optional)

## Run
