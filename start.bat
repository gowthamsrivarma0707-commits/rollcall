@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if not errorlevel 1 (
    py -3 app.py --open %*
    goto finished
)

where python >nul 2>nul
if not errorlevel 1 (
    python app.py --open %*
    goto finished
)

echo.
echo RollCall needs Python 3.10 or newer, but Python was not found.
echo Install it from https://www.python.org/downloads/ and tick
echo "Add python.exe to PATH" during installation.
echo.
pause
exit /b 1

:finished
echo.
echo RollCall has stopped.
pause
