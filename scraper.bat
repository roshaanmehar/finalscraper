@echo off
setlocal enabledelayedexpansion

:: Set title and colors
title Web Scraper - Setup
color 0A

:: Define paths
set "CURRENT_DIR=%~dp0"
set "NODE_INSTALLER=%TEMP%\node-installer.msi"

:: Display welcome message
echo ======================================================
echo    WEB SCRAPER - SETUP
echo ======================================================
echo.
echo  This script will set up everything needed for the Web Scraper:
echo  1. Install Node.js if not present
echo  2. Install all dependencies from package.json
echo  3. Create environment file if needed
echo  4. Start the server
echo.
echo  Installation directory: %CURRENT_DIR%
echo.
echo  Press any key to continue or CTRL+C to cancel...
pause > nul

:: Check if package.json exists
if not exist "package.json" (
    echo.
    echo ERROR: package.json not found in the current directory.
    echo Please make sure you have all the code files in this directory.
    goto error_exit
)

:: Check if Node.js is installed
echo.
echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js not found. Installing Node.js...
    echo.
    
    :: Download Node.js installer
    echo Downloading Node.js installer...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi' -OutFile '%NODE_INSTALLER%'}"
    if %errorlevel% neq 0 (
        echo Failed to download Node.js installer. Please check your internet connection.
        goto error_exit
    )
    
    :: Install Node.js
    echo Installing Node.js...
    start /wait msiexec /i "%NODE_INSTALLER%" /qn
    
    :: Verify installation
    echo Verifying Node.js installation...
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Failed to install Node.js. Please install it manually from https://nodejs.org/
        goto error_exit
    ) else (
        echo Node.js installed successfully!
    )
    
    :: Clean up
    del "%NODE_INSTALLER%"
) else (
    echo Node.js is already installed.
)

:: Create a .npmrc file to use legacy-peer-deps by default
echo.
echo Creating .npmrc file...
echo legacy-peer-deps=true > .npmrc
echo Created .npmrc file with legacy-peer-deps=true

:: Install dependencies
echo.
echo Installing Node.js dependencies...
echo This may take a few minutes...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Failed with --legacy-peer-deps, trying with --force...
    call npm install --force
    if %errorlevel% neq 0 (
        echo All installation methods failed.
        goto error_exit
    ) else (
        echo Node.js dependencies installed successfully with --force!
    )
) else (
    echo Node.js dependencies installed successfully!
)

:: Create a .env file if it doesn't exist
if not exist ".env" (
    echo.
    echo Creating .env file...
    echo MONGODB_URI=mongodb+srv://roshaanatck:DOcnGUEEB37bQtcL@scraper-db-cluster.88kc14b.mongodb.net/?retryWrites=true^&w=majority^&appName=scraper-db-cluster > .env
    echo .env file created successfully!
)

:: Start the Next.js server
echo.
echo ======================================================
echo    SETUP COMPLETED SUCCESSFULLY!
echo ======================================================
echo.
echo Starting Next.js server...
echo.
echo NOTE: The first startup may take a few minutes while Next.js builds the application.
echo If the server appears to hang during compilation, press any key in this window.
echo This is a known quirk with Next.js development server.
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

:: Run the Next.js server
echo Starting the server with "npm run dev"...
echo.
echo If the window closes immediately, you can run the server manually by:
echo 1. Opening a command prompt in this directory
echo 2. Running the command: npm run dev
echo.
start /wait cmd /k "npm run dev"

:: This line is never reached while the server is running
echo.
echo Server has been stopped.
echo Press any key to exit...
pause > nul
exit /b
