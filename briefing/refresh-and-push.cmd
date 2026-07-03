@echo off
rem Scheduled refresh of empowered.vote/briefing numbers.
rem Runs the DB-driven refresh; commits and pushes only if numbers changed.
cd /d C:\ev-landing\ev-landing-main
node --env-file="C:\EV-Accounts\backend\.env" briefing\refresh.mjs > "%TEMP%\ev-briefing-refresh.log" 2>&1
git diff --quiet -- briefing/index.html && exit /b 0
git add briefing/index.html
git commit -m "docs(briefing): scheduled numbers refresh" >> "%TEMP%\ev-briefing-refresh.log" 2>&1
git push origin main >> "%TEMP%\ev-briefing-refresh.log" 2>&1
