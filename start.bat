@echo off
echo ========================================
echo   EduAssistSys - Educational Analytics System
echo ========================================
echo.

echo Activating conda environment: EduAssistSys...
call conda activate EduAssistSys
if %errorlevel% neq 0 (
    echo Error: Failed to activate conda environment 'EduAssistSys'
    echo Please make sure the environment exists and conda is properly installed.
    pause
    exit /b 1
)

echo Environment activated successfully!
echo.



echo Starting backend server...
cd backend
start "Backend Server" cmd /k "echo Backend server is starting... && python app.py"
if %errorlevel% neq 0 (
    echo Error: Failed to start backend server
    pause
    exit /b 1
)

echo Backend server started in new window.
echo.

echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting frontend development server...
cd ../frontend
echo Setting Node.js legacy OpenSSL provider...



echo Starting frontend server in new terminal...
start "Frontend Server" cmd /k "set NODE_OPTIONS=--openssl-legacy-provider && echo Frontend server is starting... && npm start"
if %errorlevel% neq 0 (
    echo Error: Failed to start frontend server
    pause
    exit /b 1
)

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Both servers are running in separate windows.
echo Close this window or press Ctrl+C to stop monitoring.
echo To stop servers, close their respective windows.
echo ========================================