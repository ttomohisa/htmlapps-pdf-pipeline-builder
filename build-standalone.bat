@echo off
setlocal
where node >nul 2>nul || (echo Node.js was not found.& exit /b 1)
node "%~dp0build.mjs"
