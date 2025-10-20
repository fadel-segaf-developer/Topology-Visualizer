@echo off
setlocal ENABLEDELAYEDEXPANSION

rem Minimal issue exporter for topology ingestion (includes issue body + comments).
rem Wraps scripts/export-gitea-minimal.mjs and stores output under RepoExtractor/exports/minimal/.

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "OUT_DIR=%SCRIPT_DIR%exports\minimal"
set "NODE_BIN=node"

where %NODE_BIN% >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found in PATH.
  exit /b 1
)

set "USER_ARGS=%*"
if defined USER_ARGS goto :run_export

if not defined GITEA_TOKEN (
  set "LATEST_ISSUES="
  if exist "%SCRIPT_DIR%gitea-api" (
    for /f "delims=" %%D in ('dir /b /ad /o:-d "%SCRIPT_DIR%gitea-api" 2^>nul') do (
      if exist "%SCRIPT_DIR%gitea-api\%%D\issues.json" (
        set "LATEST_ISSUES=%SCRIPT_DIR%gitea-api\%%D\issues.json"
        goto :found_latest
      )
    )
  )
  :found_latest
  if defined LATEST_ISSUES (
    echo INFO: Using existing export "%LATEST_ISSUES%" as source.
    set "DEFAULT_SOURCE=%LATEST_ISSUES%"
    goto :run_with_source
  )
  echo INFO: No cached issues.json found; GITEA_TOKEN required for live export.
)

goto :run_export

:run_with_source
node "%ROOT_DIR%\scripts\export-gitea-minimal.mjs" --outdir "%OUT_DIR%" --source "%DEFAULT_SOURCE%"
goto :done

:run_export
node "%ROOT_DIR%\scripts\export-gitea-minimal.mjs" --outdir "%OUT_DIR%" %USER_ARGS%

:done
if errorlevel 1 (
  echo FAILED: minimal export encountered an error.
  exit /b 1
)

echo DONE: minimal issues written under "%OUT_DIR%".
endlocal
