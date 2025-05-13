@echo off
title Restaurant Scraper - Development Server
color 0A

echo ======================================================
echo    RESTAURANT SCRAPER - STARTING SERVER
echo ======================================================
echo.
echo Starting the development server...
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

:: Run the Next.js development server
npm run dev

:: If the server exits with an error, keep the window open
if %errorlevel% neq 0 (
    echo.
    echo Server stopped with an error (code: %errorlevel%).
    echo.
    echo Press any key to exit...
    pause > nul
)
