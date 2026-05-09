@echo off
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
if %errorlevel% neq 0 (
    echo ERREUR : le demarrage a echoue.
    pause
    exit /b %errorlevel%
)
echo.
echo Application demarree sur http://localhost:8081/?config=apps/cnig_accessibilite.xml
echo Backend Flask sur http://localhost:8000
echo.
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
