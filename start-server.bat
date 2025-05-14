@echo off
setlocal enabledelayedexpansion

:: Set title and colors
title Veda Scraper - Start Server
color 0A

:: Configuration
SET WAIT_TIME=10
SET APP_URL=http://localhost:3000

:: Display welcome message
echo ======================================================
echo    VEDA SCRAPER - STARTING SERVER
echo ======================================================
echo.

:: Check if Node.js is installed
echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please run setup-dependencies.bat first to install Node.js.
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

:: Start the Next.js development server
echo Starting the Next.js development server...
echo.
echo The browser will open automatically in %WAIT_TIME% seconds.
echo.
echo Press CTRL+C to stop the server when you're done.
echo.

:: Start the Next.js server in a new window
start "Veda Scraper Server" cmd /c "npm run dev"

:: Show a progress bar while waiting
echo Waiting for server to initialize...
echo [          ] 0%%
for /L %%i in (1,1,%WAIT_TIME%) do (
    timeout /t 1 /nobreak > nul
    set /a percent=%%i*100/%WAIT_TIME%
    set "progressbar="
    
    for /L %%j in (1,1,10) do (
        if %%j LEQ %%i (
            set "progressbar=!progressbar!#"
        ) else (
            set "progressbar=!progressbar! "
        )
    )
    
    echo [!progressbar!] !percent!%%
)

:: Open the browser
echo.
echo Opening browser at %APP_URL%...
start "" "%APP_URL%"

echo.
echo ======================================================
echo    SERVER STARTED SUCCESSFULLY
echo ======================================================
echo.
echo Your application is now running at: %APP_URL%
echo The browser window should open automatically.
echo.
echo If the browser didn't open, please manually navigate to:
echo %APP_URL%
echo.
echo To stop the server, close the server command window or press CTRL+C.
echo.
echo Press any key to exit this window (the server will continue running)...
pause > nul
exit /b 0