@echo off
setlocal ENABLEDELAYEDEXPANSION

rem ====== CONFIG (change if needed) ======
set "BASE=https://git.frys.co.id"
set "OWNER=FRYS-DEV"
set "REPO=UE_FDS3"
set "OUTROOT=exports"
set "LIMIT=50"

rem ====== Ensure Git is available ======
where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git not found in PATH. Install Git for Windows and try again.
  exit /b 1
)

rem ====== Timestamp (UTC) for folder ======
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')"`) do set "TS=%%i"

set "OUTDIR=%OUTROOT%\%OWNER%_%REPO%_%TS%"
mkdir "%OUTDIR%" >nul 2>nul

rem ====== Token: use %GITEA_TOKEN% if already set; else prompt (hidden) ======
if not defined GITEA_TOKEN (
  for /f "usebackq delims=" %%t in (`
    powershell -NoProfile -Command ^
      "$p = Read-Host 'Enter Gitea token' -AsSecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}"
  `) do set "GITEA_TOKEN=%%t"
)
if not defined GITEA_TOKEN (
  echo ERROR: No token provided. Set GITEA_TOKEN env var or re-run and enter the token.
  exit /b 1
)

echo === 1) Git mirror clone...
git clone --mirror "%BASE%/%OWNER%/%REPO%.git" "%OUTDIR%\git-mirror"
if errorlevel 1 echo WARN: git mirror failed (check URL/permissions).

rem Optional: clone wiki mirror if exists
echo === 1a) Wiki mirror (if repository has a wiki)...
git ls-remote "%BASE%/%OWNER%/%REPO%.wiki.git" >nul 2>nul
if not errorlevel 1 (
  git clone --mirror "%BASE%/%OWNER%/%REPO%.wiki.git" "%OUTDIR%\wiki-mirror"
) else (
  echo NOTE: No wiki repo detected or access denied; skipping wiki mirror.
)

rem Optional: Git LFS fetch (if git-lfs installed)
where git-lfs >nul 2>nul
if not errorlevel 1 (
  echo === 1b) Fetching all Git LFS objects...
  git -C "%OUTDIR%\git-mirror" lfs fetch --all
) else (
  echo NOTE: git-lfs not found; skipping LFS fetch.
)

echo === 2) API export to JSON (this may take a bit)...

rem ---- Call PowerShell to do all JSON/pagination work ----
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$base='%BASE%'; $owner='%OWNER%'; $repo='%REPO%'; $token='%GITEA_TOKEN%'; $outdir='%OUTDIR%'; $limit=%LIMIT%; " ^
  "mkdir -Force $outdir | Out-Null; " ^
  "function Invoke-Api([string]\$path,[string]\$query){ " ^
  "  \$headers=@{ Authorization='token ' + \$token; Accept='application/json'}; " ^
  "  if([string]::IsNullOrEmpty(\$query)){ \$uri = \"\$base/api/v1\$path\" } else { \$uri = \"\$base/api/v1\$path?\$query\" } " ^
  "  return Invoke-RestMethod -Headers \$headers -Uri \$uri -Method Get " ^
  "} " ^
  "function Fetch-Array([string]\$relPath,[string]\$fname,[string]\$extraQuery=''){ " ^
  "  \$page=1; \$pages=@(); " ^
  "  while(\$true){ " ^
  "    \$q = (\$extraQuery -ne '' ? (\$extraQuery + '&') : '') + ('page='+\$page+'&limit='+$limit); " ^
  "    \$uriPath = \"/repos/\$owner/\$repo/\$relPath\"; " ^
  "    try{ \$resp = Invoke-Api \$uriPath \$q } catch { " ^
  "      Write-Warning \"Request failed: \$uriPath page \$page`; \$($_.Exception.Message)\"; break " ^
  "    } " ^
  "    \$outfile = Join-Path \$outdir (\"\$fname-page\$page.json\"); " ^
  "    (\$resp | ConvertTo-Json -Depth 50) | Out-File -Encoding utf8 \$outfile; " ^
  "    if(-not (\$resp -is [System.Array])){ Write-Warning \"Non-array returned for \$relPath page \$page\"; break } " ^
  "    \$count = \$resp.Count; \$pages += \$outfile; " ^
  "    if(\$count -lt $limit){ break } " ^
  "    \$page++ " ^
  "  } " ^
  "  if(\$pages.Count -gt 0){ " ^
  "    \$merged = @(); foreach(\$p in \$pages){ \$merged += (Get-Content \$p -Raw | ConvertFrom-Json) } " ^
  "    \$merged | ConvertTo-Json -Depth 50 | Out-File -Encoding utf8 (Join-Path \$outdir (\"\$fname.json\")) " ^
  "  } else { '[]' | Out-File -Encoding utf8 (Join-Path \$outdir (\"\$fname.json\")) } " ^
  "} " ^
  "Write-Host '... repo metadata'; " ^
  "try{ (Invoke-Api \"/repos/\$owner/\$repo\" '') | ConvertTo-Json -Depth 50 | Out-File -Encoding utf8 (Join-Path \$outdir 'repo.json') } catch { '{}' | Out-File -Encoding utf8 (Join-Path \$outdir 'repo.json') } ; " ^
  "Write-Host '... issues / pulls / milestones / labels / releases / tags / branches / hooks / collaborators'; " ^
  "Fetch-Array 'issues'      'issues'      'state=all&sort=created&direction=asc'; " ^
  "Fetch-Array 'pulls'       'pulls'       'state=all&sort=created&direction=asc'; " ^
  "Fetch-Array 'milestones'  'milestones'  ''; " ^
  "Fetch-Array 'labels'      'labels'      ''; " ^
  "Fetch-Array 'releases'    'releases'    ''; " ^
  "Fetch-Array 'tags'        'tags'        ''; " ^
  "Fetch-Array 'branches'    'branches'    ''; " ^
  "try{ Fetch-Array 'hooks'         'hooks'         '' } catch { Write-Warning 'hooks export failed (needs admin rights)' } ; " ^
  "try{ Fetch-Array 'collaborators' 'collaborators' '' } catch { Write-Warning 'collaborators export failed (needs admin rights)' } ; " ^
  "Write-Host '... issue comments'; " ^
  "if(Test-Path (Join-Path \$outdir 'issues.json')){ " ^
  "  \$issues = Get-Content (Join-Path \$outdir 'issues.json') -Raw | ConvertFrom-Json; " ^
  "  if(\$issues){ New-Item -ItemType Directory -Force -Path (Join-Path \$outdir 'issue_comments') | Out-Null; " ^
  "    foreach(\$it in \$issues){ if(\$it.number -ne \$null){ Fetch-Array \"issues/\$([int]\$it.number)/comments\" (\"issue_comments\\issue_\$([int]\$it.number)_comments\") '' } } " ^
  "  } " ^
  "} " ^
  "Write-Host '... pull request comments + reviews'; " ^
  "if(Test-Path (Join-Path \$outdir 'pulls.json')){ " ^
  "  \$pulls = Get-Content (Join-Path \$outdir 'pulls.json') -Raw | ConvertFrom-Json; " ^
  "  if(\$pulls){ New-Item -ItemType Directory -Force -Path (Join-Path \$outdir 'pull_comments') | Out-Null; " ^
  "              New-Item -ItemType Directory -Force -Path (Join-Path \$outdir 'pull_reviews')  | Out-Null; " ^
  "    foreach(\$pr in \$pulls){ if(\$pr.number -ne \$null){ " ^
  "      try{ Fetch-Array \"pulls/\$([int]\$pr.number)/comments\" \"pull_comments\\pull_\$([int]\$pr.number)_comments\" '' } catch { Write-Warning \"pull comments failed for #\$([int]\$pr.number)\" } ; " ^
  "      try{ Fetch-Array \"pulls/\$([int]\$pr.number)/reviews\"  \"pull_reviews\\pull_\$([int]\$pr.number)_reviews\"  '' } catch { Write-Warning \"pull reviews failed for #\$([int]\$pr.number) (endpoint may not exist in your Gitea)\" } " ^
  "    } } " ^
  "  } " ^
  "} " ^
  "Write-Host '... writing manifest'; " ^
  "\$manifest = [ordered]@{ exported_at_utc = '%TS%'; base=\$base; owner=\$owner; repo=\$repo; limit=$limit; paths = @{ git_mirror = (Join-Path \$outdir 'git-mirror'); repo_json = (Join-Path \$outdir 'repo.json') } }; " ^
  "\$manifest | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 (Join-Path \$outdir 'manifest.json'); " ^
  "Write-Host 'API export complete.' "

if errorlevel 1 (
  echo ERROR: API export failed. Check your token/permissions or network.
  exit /b 1
)

echo === DONE ===
echo Export saved in: "%OUTDIR%"
echo.
echo Tip: Set GITEA_TOKEN permanently for your user with:
echo     setx GITEA_TOKEN "YOUR_TOKEN_HERE"
echo (then open a NEW cmd window before running again)
echo.

endlocal
