@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
title POPUPS Training v1 - Reemplazo controlado de main
color 0C
set "REPO=https://github.com/Somospopups/mi-entrenador.git"
set "EXPECTED_OLD=98c7263b5388729436ac3891f316ad262e3b4f42"
set "BUNDLE=%~dp0popups-training-v1.bundle"
set "REFS=%TEMP%\popups-v1-refs-%RANDOM%-%RANDOM%.txt"
set "WORK=%TEMP%\popups-v1-publish-%RANDOM%-%RANDOM%"
echo.
echo  =====================================================
echo    POPUPS TRAINING v1 - REEMPLAZO DE HISTORIA DE MAIN
echo  =====================================================
echo.
echo AVISO: esta operacion reemplaza la historia publicada de main.
echo No se modificaran otras ramas ni etiquetas; si aparecen, el BAT se detiene.
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo No encuentro Git. Instala Git for Windows desde https://git-scm.com/download/win
  goto :fail
)
if not exist "%BUNDLE%" (
  echo Falta popups-training-v1.bundle. Extrae el ZIP completo y vuelve a intentarlo.
  goto :fail
)
echo [1/6] Consultando ramas y etiquetas remotas...
git ls-remote --heads --tags "%REPO%" > "%REFS%" 2>nul
if errorlevel 1 (
  echo No pude consultar GitHub. Revisa internet, URL y permisos del repositorio.
  goto :fail
)
set /a REFCOUNT=0
set "REMOTE_MAIN="
for /f "usebackq tokens=1,2" %%A in ("%REFS%") do (
  set /a REFCOUNT+=1
  if "%%B"=="refs/heads/main" set "REMOTE_MAIN=%%A"
)
del "%REFS%" >nul 2>nul
if not "%REFCOUNT%"=="1" (
  echo El remoto no tiene exactamente una referencia entre ramas y etiquetas.
  echo Se esperaba solo main. No se toca nada para no dejar historial alternativo.
  goto :fail
)
if not defined REMOTE_MAIN (
  echo No encontre la rama main. El BAT no inicializa ni recrea repositorios.
  goto :fail
)
for /f "tokens=1" %%H in ('git bundle list-heads "%BUNDLE%" refs/heads/main') do set "BUNDLE_SHA=%%H"
if not defined BUNDLE_SHA (
  echo No pude leer la referencia main del bundle.
  goto :fail
)
if "%REMOTE_MAIN%"=="%BUNDLE_SHA%" (
  echo Esta version ya esta publicada: %BUNDLE_SHA%
  pause
  exit /b 0
)
if not "%REMOTE_MAIN%"=="%EXPECTED_OLD%" (
  echo main ya no apunta al commit esperado:
  echo Esperado: %EXPECTED_OLD%
  echo Actual:   %REMOTE_MAIN%
  echo Se detiene sin sobrescribir cambios nuevos.
  goto :fail
)
echo [2/6] Reconstruyendo la nueva raiz v1 desde el bundle...
git init "%WORK%" >nul 2>nul
if errorlevel 1 goto :fail
pushd "%WORK%"
git fetch --no-tags "%BUNDLE%" refs/heads/main
if errorlevel 1 goto :fail_pop
git checkout -B main FETCH_HEAD
if errorlevel 1 goto :fail_pop
for /f "delims=" %%H in ('git rev-parse HEAD') do set "NEW_SHA=%%H"
if not defined NEW_SHA goto :fail_pop
if "%REMOTE_MAIN%"=="%NEW_SHA%" (
  echo Esta version ya esta publicada: %NEW_SHA%
  popd
  rmdir /s /q "%WORK%" >nul 2>nul
  pause
  exit /b 0
)
git remote add origin "%REPO%"
if errorlevel 1 goto :fail_pop
echo.
echo Commit anterior: %REMOTE_MAIN%
echo Nueva raiz v1:  %NEW_SHA%
echo.
echo Esta accion reemplazara main con un historial nuevo y desconectado.
echo Revisa que sea el repositorio correcto antes de confirmar.
choice /C SN /N /M "Confirmas el reemplazo destructivo? [S/N] "
if errorlevel 2 goto :cancel_pop
echo [3/6] Enviando con force-with-lease al SHA anterior exacto...
git push --force-with-lease=refs/heads/main:%EXPECTED_OLD% origin HEAD:refs/heads/main
if errorlevel 1 goto :fail_pop
echo [4/6] Verificando el SHA publicado en GitHub...
set "CHECK_SHA="
for /f "tokens=1" %%H in ('git ls-remote origin refs/heads/main') do set "CHECK_SHA=%%H"
if not defined CHECK_SHA goto :fail_pop
if not "%CHECK_SHA%"=="%NEW_SHA%" goto :fail_pop
echo.
echo [5/6] PUBLICACION CONFIRMADA: %CHECK_SHA%
echo Repo: https://github.com/Somospopups/mi-entrenador
popd
rmdir /s /q "%WORK%" >nul 2>nul
echo [6/6] Listo. La rama main apunta a POPUPS Training v1.
pause
exit /b 0

:cancel_pop
echo Cancelado. No se publico ningun cambio.
popd
rmdir /s /q "%WORK%" >nul 2>nul
pause
exit /b 0

:fail_pop
popd
:fail
echo.
echo NO se confirmo el reemplazo. Revisa el error anterior; no se informa exito.
if exist "%REFS%" del "%REFS%" >nul 2>nul
if exist "%WORK%" rmdir /s /q "%WORK%" >nul 2>nul
pause
exit /b 1
