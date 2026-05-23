# SK IDP

Mini internal developer platform built with HTML, CSS, JavaScript, EJS, Node and Express.

The platform itself runs simply with Node. Docker, Kubernetes kind, Jenkins and Terraform are used only for the developer services created from the platform.

## What it does

- Shows a platform catalog of provisioned services.
- Provides a self-service form for developers.
- Generates a real Node API service.
- Adds Dockerfile, Kubernetes YAML, Jenkinsfile, Docker Hub deploy script and Terraform EC2 setup to each generated service.
- Applies governance checks before a service is created.
- Shows API gateway route design for each generated service.
- Records platform events for basic observability.

## Folder layout

```text
server.js                 Express startup only
routes/                   Route definitions
controllers/              Request handlers
services/                 Business logic
models/                   Catalog and event data access
generators/               Generated app file writer
config/                   Shared paths
utils/                    Small helpers and file storage wrapper
views/                    EJS pages
public/                   CSS and browser JavaScript
data/                     Catalog and event log
generated-services/       Developer services created by the IDP
kind/cluster.yaml         Local kind config for generated services
scripts/                  CMD helper scripts
```

## Run The IDP Platform

Open Windows CMD:

```cmd
cd C:\Users\HP\Desktop\sk-idp
npm install
npm start
```

Open:

```text
http://localhost:3000
```

This is the IDP platform. It does not need Docker, Kubernetes, Jenkins or Terraform to run.

## Create A Developer API

1. Open `http://localhost:3000/provision`.
2. Enter a service name like `payment-api`.
3. Enter owner email, Docker Hub username, environment and replicas.
4. Submit the form.

The IDP creates:

```text
generated-services\payment-api
```

Inside that service you get:

```text
index.js
package.json
Dockerfile
Jenkinsfile
README.md
deploy-kind.cmd
deploy-aws.cmd
update-idp.cmd
k8s\deployment.yaml
k8s\service.yaml
terraform\main.tf
terraform\variables.tf
```

## Run The Generated API Locally

```cmd
cd C:\Users\HP\Desktop\sk-idp\generated-services\payment-api
npm install
npm start
```

Open:

```text
http://localhost:8080
```

## Deploy The Generated API To kind

Start Docker Desktop first. Then run:

```cmd
cd C:\Users\HP\Desktop\sk-idp\generated-services\payment-api
deploy-kind.cmd
```

Open the URL shown by the script, for example:

```text
http://localhost:31000
```

The kind cluster is only for generated developer services.

After the API is deployed, go back to the IDP:

```text
http://localhost:3000/catalog
```

The catalog checks:

```text
http://localhost:31000/health
```

and shows `running` if the generated API is healthy. If the app is not deployed or the health URL fails, it shows `not running`.

## Docker Hub And AWS EC2 For A Generated Service

Each generated service can also run on AWS EC2. Docker Hub stores the image, and Terraform creates the EC2 server.

```cmd
cd C:\Users\HP\Desktop\sk-idp\generated-services\payment-api
set DOCKERHUB_USER=yourdockerhubname
docker login
deploy-aws.cmd
```

This does:

- builds the Docker image
- pushes `yourdockerhubname/payment-api:latest` to Docker Hub
- runs Terraform
- creates an AWS EC2 instance
- installs Docker on EC2
- pulls the Docker Hub image
- runs the app container on port 80
- sends the EC2 URL back to the IDP

It does not deploy the Express platform.

After deployment, the IDP catalog checks:

```text
http://<ec2-public-ip>/health
```

and shows AWS as `running` or `not running`.

## Jenkins For A Generated Service

Each generated service has its own `Jenkinsfile`.

The generated pipeline does:

1. Install service dependencies.
2. Build the Docker image.
3. If `DEPLOY_TARGET=kind`, load the image into kind and apply Kubernetes YAML.
4. If `DEPLOY_TARGET=aws-ec2`, push the image to Docker Hub and run Terraform for AWS EC2.

In Jenkins, create a secret text credential:

```text
ID: dockerhub-token
Value: your Docker Hub access token
```

The Jenkins job also needs AWS credentials available on the Jenkins machine, usually through:

```cmd
aws configure
```

For real apps, the usual order is:

```text
Developer creates app in IDP
Jenkins builds the Docker image
Jenkins pushes image to Docker Hub
Terraform creates AWS EC2
EC2 pulls and runs the Docker Hub image
IDP checks kind and AWS /health URLs
```

## How Requirements Are Met

| Requirement | Implementation |
| --- | --- |
| Platform catalog | `/catalog` reads `data/catalog.json`. |
| Developer onboarding guide | This README plus each generated service README. |
| Self-service provisioning templates | `/provision` creates service files automatically. |
| Golden paths for apps | Each generated service gets app code, Dockerfile, k8s YAML, Jenkinsfile, Terraform and deploy script. |
| Terraform automation | Generated service has `terraform/` for AWS EC2 runtime creation. |
| Pipeline automation | Generated service has its own `Jenkinsfile` for kind deploy or Docker Hub plus AWS EC2 deploy. |
| Kubernetes kind | Generated service has `deploy-kind.cmd` and `k8s/` manifests. |
| API gateway design | `/gateway` shows route mapping such as `/api/payment-api`. |
| Governance automation | Form validation and `scripts/check-governance.js`. |
| Observability hooks | `/observability`, `/health`, catalog health checks, `data/events.log`, and generated service health probes. |

## Important Difference

```text
http://localhost:3000
```

is the IDP platform.

```text
http://localhost:31000
```

is a developer API after it is deployed to kind.
