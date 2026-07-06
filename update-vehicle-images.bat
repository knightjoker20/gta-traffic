@echo off
setlocal EnableExtensions EnableDelayedExpansion

title GTA-Traffic Vehicle Image Upload

echo.
echo =====================================================
echo  GTA-Traffic.com Vehicle Image Upload
echo =====================================================
echo.

cd /d "%~dp0"

echo Repo folder:
echo %CD%
echo.

if not exist "tools\upload-vehicle-images.cjs" (
  echo ERROR: tools\upload-vehicle-images.cjs was not found.
  echo Make sure you are running this BAT from the gta-traffic repo root.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js or open this from a terminal where node works.
  echo.
  pause
  exit /b 1
)

set "DEFAULT_IMAGE_DIR=vehicle-image-upload"
set "IMAGE_DIR=%DEFAULT_IMAGE_DIR%"

echo Default image folder:
echo %DEFAULT_IMAGE_DIR%
echo.
set /p IMAGE_DIR_INPUT=Press Enter to use default, or type another folder path: 

if not "%IMAGE_DIR_INPUT%"=="" (
  set "IMAGE_DIR=%IMAGE_DIR_INPUT%"
)

if not exist "%IMAGE_DIR%" (
  echo.
  echo Folder does not exist:
  echo %IMAGE_DIR%
  echo.
  echo Creating it now...
  mkdir "%IMAGE_DIR%"
  echo.
  echo Put your .png, .jpg, .jpeg, or .webp vehicle images in:
  echo %IMAGE_DIR%
  echo.
  pause
  exit /b 0
)

echo.
echo Image folder:
echo %IMAGE_DIR%
echo.

if "%IMAGE_UPLOAD_TOKEN%"=="" (
  echo IMAGE_UPLOAD_TOKEN is not set for this terminal session.
  echo.
  set /p IMAGE_UPLOAD_TOKEN=Paste image upload token now: 
)

if "%IMAGE_UPLOAD_TOKEN%"=="" (
  echo.
  echo ERROR: No upload token provided.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting upload...
echo.

node "tools\upload-vehicle-images.cjs" "%IMAGE_DIR%"

set "UPLOAD_RESULT=%ERRORLEVEL%"

echo.
if "%UPLOAD_RESULT%"=="0" (
  echo =====================================================
  echo  Upload finished successfully.
  echo =====================================================
) else (
  echo =====================================================
  echo  Upload finished with errors. Exit code: %UPLOAD_RESULT%
  echo =====================================================
)

echo.
pause
exit /b %UPLOAD_RESULT%
