@echo off
rem ---------------------------------------------------------------------------
rem Scheduled publication of a new empowered.vote/briefing edition.
rem
rem Driven by the Windows scheduled task "EV Briefing", Mondays and Thursdays at
rem 02:07 -- which is the small hours of Tuesday and Friday.  See the "The
rem schedule" section of briefing/README.md.
rem
rem This is deliberately thin.  All of the judgment lives in
rem briefing/SCHEDULED-EDITION.md, which is the prompt, and in briefing/README.md,
rem which that prompt tells the model to read first.  Edit those, not this file.
rem
rem The run needs the same things a human run needs: C:\EV-Accounts\backend\.env
rem for DATABASE_URL and POSTHOG_API_KEY, the sibling repos on disk, and a git
rem credential that can push to origin/main.
rem ---------------------------------------------------------------------------

setlocal
set REPO=C:\ev-landing\ev-landing-main
set LOG=%TEMP%\ev-briefing-edition.log

cd /d "%REPO%" || exit /b 1

rem Keep the previous run's log alongside the new one; one overwrite is enough to
rem lose the only record of why a night was quiet.
if exist "%LOG%" move /y "%LOG%" "%LOG%.1" >nul 2>&1

echo ========================================================= >> "%LOG%"
echo EV Briefing edition run started %DATE% %TIME%             >> "%LOG%"
echo ========================================================= >> "%LOG%"

rem --permission-mode bypassPermissions because nobody is at the keyboard to
rem approve anything; the work is confined to this repo plus read-only queries.
claude --permission-mode bypassPermissions -p "Read briefing/SCHEDULED-EDITION.md and do exactly what it says." >> "%LOG%" 2>&1
set RC=%ERRORLEVEL%

echo. >> "%LOG%"
echo EV Briefing edition run finished %DATE% %TIME% (exit %RC%) >> "%LOG%"
exit /b %RC%
