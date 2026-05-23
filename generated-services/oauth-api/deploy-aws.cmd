@echo off
if "%DOCKERHUB_USER%"=="" set DOCKERHUB_USER=shadowger107
docker build -t oauth-api:local .
docker tag oauth-api:local %DOCKERHUB_USER%/oauth-api:latest
docker push %DOCKERHUB_USER%/oauth-api:latest
terraform -chdir=terraform init
terraform -chdir=terraform apply -auto-approve -var "dockerhub_user=%DOCKERHUB_USER%"
update-idp.cmd http://localhost:3000
