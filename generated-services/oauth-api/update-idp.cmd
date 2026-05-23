@echo off
set IDP_URL=%1
if "%IDP_URL%"=="" set IDP_URL=http://localhost:3000
for /f "tokens=*" %%i in ('terraform -chdir=terraform output -raw app_url') do curl -X POST -H "Content-Type: application/json" -d "{\"awsUrl\":\"%%i\"}" %IDP_URL%/api/service/oauth-api/aws-url
