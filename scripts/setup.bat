@echo off
REM Quick start script for GIS Transport Logistics with PostgreSQL + PostGIS
REM For Windows using PowerShell

echo.
echo Launching setup from PowerShell...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

pause
