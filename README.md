# LocalSpot (MERN) - Dockerized Skeleton

This project is a starting scaffold for LocalSpot:
- React frontend
- Express backend (JWT auth)
- MongoDB (Mongoose models)
- Docker Compose for local development

## Prerequisites
- Docker Desktop installed
- Docker Compose available

## Run everything
From inside `localspot-app/`:
```bash
docker compose up --build
```

## URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

## MongoDB connection
Backend uses `MONGO_URL` (see `docker-compose.yml`).
The default database name is `localspot`.

