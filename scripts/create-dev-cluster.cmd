@echo off
kind get clusters | findstr /R /C:"^sk-idp$" >nul
if errorlevel 1 (
  kind create cluster --config kind\cluster.yaml
) else (
  echo kind cluster sk-idp already exists
)
kubectl cluster-info
