@echo off
echo ========================================================
echo GUARDIAN LIVE - Automatic GitHub Push Tool
echo Repository: https://github.com/harabanbaroo2532-source/jangsos
echo ========================================================
echo.
set /p TOKEN="Please enter your GitHub Personal Access Token: "
if "%TOKEN%"=="" (
    echo Token cannot be empty!
    pause
    exit
)

echo Pushing code to GitHub...
git push -f https://%TOKEN%@github.com/harabanbaroo2532-source/jangsos.git main

echo.
echo Complete! Render will auto-deploy https://jangsos.onrender.com in 1 minute!
pause
