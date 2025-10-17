@echo off
setlocal enabledelayedexpansion

:: Serve the topology app from this directory on http://localhost:5500
pushd "%~dp0"

set "PY_CMD="
set "PY_ARGS="

for /f "delims=" %%I in ('where python 2^>nul') do (
  set "PY_CMD=python"
  goto :found
)
for /f "delims=" %%I in ('where python3 2^>nul') do (
  set "PY_CMD=python3"
  goto :found
)
for /f "delims=" %%I in ('where py 2^>nul') do (
  set "PY_CMD=py"
  set "PY_ARGS=-3"
  goto :found
)

:found
if not defined PY_CMD (
  echo Python interpreter not found. Install Python 3 and try again.
  goto :end
)

echo Serving FDS TMS topology on http://localhost:5500
echo Press CTRL+C to stop the server.

if defined PY_ARGS (
  %PY_CMD% %PY_ARGS% -m http.server 5500 --bind 127.0.0.1
) else (
  %PY_CMD% -m http.server 5500 --bind 127.0.0.1
)

:end
popd
endlocal
