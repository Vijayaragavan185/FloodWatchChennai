@echo off
setlocal
title FloodWatch Chennai - launcher
cd /d "%~dp0"
echo ============================================================
echo   FloodWatch Chennai - starting the full stack
echo ============================================================

REM ---------- 1. Java: use JAVA_HOME, else the JDK IntelliJ installed in %USERPROFILE%\.jdks ----------
if not defined JAVA_HOME (
  if exist "%USERPROFILE%\.jdks" (
    for /d %%D in ("%USERPROFILE%\.jdks\*") do if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
  )
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
where java >nul 2>nul
if errorlevel 1 (
  echo [X] Java was not found. Install JDK 17 or newer, or set JAVA_HOME, then run this file again.
  pause & exit /b 1
)
echo [OK] Java found %JAVA_HOME%

REM ---------- 2. Node.js ----------
where npm >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js was not found. Install Node.js LTS from https://nodejs.org then run this file again.
  pause & exit /b 1
)
echo [OK] Node.js found

REM ---------- Database credentials are supplied locally, never stored in source ----------
if not defined DB_PASSWORD (
  echo [X] DB_PASSWORD is not set. In this Command Prompt run:
  echo     set "DB_USER=root"
  echo     set "DB_PASSWORD=your-local-mysql-password"
  echo Then run start-windows.bat from the same Command Prompt.
  pause & exit /b 1
)

REM ---------- 3. MySQL must be listening on 3306 ----------
call :port_open 3306
if errorlevel 1 (
  echo [X] MySQL is not running on port 3306. Start the MySQL service ^(services.msc^) or MySQL Workbench, then run this file again.
  pause & exit /b 1
)
echo [OK] MySQL is running

REM ---------- 4. Ports used by FloodWatch must be free ----------
for %%P in (8081 8082 5173) do (
  call :port_open %%P
  if not errorlevel 1 (
    echo [X] Port %%P is already in use. Close the other app using it ^(for example a tutorial project^) and run this file again.
    pause & exit /b 1
  )
)
echo [OK] Ports 8081, 8082 and 5173 are free

REM ---------- 5. Maven wrapper settings (same as the Spring Initializr tutorials) ----------
for %%S in (report-service alert-service) do (
  if not exist "%%S\.mvn\wrapper\maven-wrapper.properties" (
    mkdir "%%S\.mvn\wrapper" 2>nul
    > "%%S\.mvn\wrapper\maven-wrapper.properties" (
      echo wrapperVersion=3.3.4
      echo distributionType=only-script
      echo distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.10.0/apache-maven-3.10.0-bin.zip
    )
  )
)
echo [OK] Maven wrapper ready

REM ---------- 6. Start report-service and wait until it answers ----------
echo.
echo Starting report-service on 8081 ^(the first run downloads libraries and can take a few minutes^)...
start "report-service :8081" /d "%~dp0report-service" cmd /k "mvnw.cmd spring-boot:run"
call :wait_http http://127.0.0.1:8081/api/stats report-service || goto failed
echo [OK] report-service is ready

REM ---------- 7. Start alert-service and wait ----------
echo Starting alert-service on 8082...
start "alert-service :8082" /d "%~dp0alert-service" cmd /k "mvnw.cmd spring-boot:run"
call :wait_http http://127.0.0.1:8082/api/alerts alert-service || goto failed
echo [OK] alert-service is ready

REM ---------- 8. Start the React client ----------
echo Starting the React client on 5173...
start "frontend :5173" /d "%~dp0frontend" cmd /k "(if not exist node_modules npm install) & npm run dev"
call :wait_http http://127.0.0.1:5173/ frontend || goto failed
echo [OK] frontend is ready
start "" http://localhost:5173
echo.
echo FloodWatch Chennai is running at http://localhost:5173
echo Keep the three service windows open. Close them to stop the app.
pause
exit /b 0

:failed
echo.
echo [X] %FAILED% did not start within 10 minutes. Look at its window for the error message.
pause
exit /b 1

REM ---------- helpers ----------
:port_open
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %1); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:wait_http
set "FAILED=%2"
for /l %%i in (1,1,200) do (
  curl -s -f -o nul "%1" >nul 2>nul && exit /b 0
  timeout /t 3 /nobreak >nul
)
exit /b 1
