@echo off
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════╗
echo ║        PayrollOS — Setup (Windows)   ║
echo ╚══════════════════════════════════════╝
echo.

:: ── Check Node.js ────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required. Download from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node %%v found

echo.
echo [INFO] Database configuration
echo       Press Enter to use the default shown in brackets
echo.

set /p PG_HOST="  PostgreSQL host [localhost]: "
if "!PG_HOST!"=="" set PG_HOST=localhost

set /p PG_PORT="  PostgreSQL port [5432]: "
if "!PG_PORT!"=="" set PG_PORT=5432

set /p PG_USER="  PostgreSQL user [postgres]: "
if "!PG_USER!"=="" set PG_USER=postgres

set /p PG_PASS="  PostgreSQL password: "

set /p PG_DB="  Database name [payrollos]: "
if "!PG_DB!"=="" set PG_DB=payrollos

echo.

set DATABASE_URL=postgresql://!PG_USER!:!PG_PASS!@!PG_HOST!:!PG_PORT!/!PG_DB!
set JWT_SECRET=payrollos-jwt-secret-change-in-production
set JWT_REFRESH_SECRET=payrollos-refresh-secret-change-in-production

:: ── Write backend .env ───────────────────────────────────────
(
echo DATABASE_URL=!DATABASE_URL!
echo REDIS_URL=
echo JWT_SECRET=!JWT_SECRET!
echo JWT_REFRESH_SECRET=!JWT_REFRESH_SECRET!
echo JWT_EXPIRES_IN=15m
echo JWT_REFRESH_EXPIRES_IN=7d
echo PORT=3001
echo NODE_ENV=development
) > backend\.env

echo [OK] backend\.env created

:: ── Write frontend .env.local ────────────────────────────────
(
echo NEXT_PUBLIC_API_URL=http://localhost:3001
) > frontend\.env.local

echo [OK] frontend\.env.local created
echo.

:: ── Create the PostgreSQL database ───────────────────────────
echo [INFO] Attempting to create database '!PG_DB!'...
set PGPASSWORD=!PG_PASS!
psql -h !PG_HOST! -p !PG_PORT! -U !PG_USER! -c "CREATE DATABASE !PG_DB!;" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Database created
) else (
    echo [INFO] Database may already exist — continuing
)
echo.

:: ── Install backend ──────────────────────────────────────────
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed in backend & pause & exit /b 1 )
echo [OK] Backend dependencies installed
echo.

echo [INFO] Running Prisma migrations...
call npx prisma generate
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Prisma migration failed.
    echo         Make sure PostgreSQL is running and the credentials are correct.
    echo         Then run manually: cd backend ^&^& npx prisma migrate dev --name init
    pause & exit /b 1
)
echo [OK] Database schema applied
cd ..
echo.

:: ── Install frontend ─────────────────────────────────────────
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed in frontend & pause & exit /b 1 )
echo [OK] Frontend dependencies installed
cd ..
echo.

echo ══════════════════════════════════════════════════
echo  Setup complete!
echo.
echo  Open TWO separate terminals and run:
echo.
echo    Terminal 1:  cd backend   ^&^& npm run start:dev
echo    Terminal 2:  cd frontend  ^&^& npm run dev
echo.
echo  App:  http://localhost:3000
echo  API:  http://localhost:3001/api/v1
echo ══════════════════════════════════════════════════
echo.
pause
