const path = require('path');
const { generatedDir } = require('../config/paths');
const fileStore = require('../utils/fileStore');

function writeFile(filePath, content) {
  fileStore.writeText(filePath, content);
}

function createServiceFiles(service) {
  const dir = path.join(generatedDir, service.name);
  const k8sDir = path.join(dir, 'k8s');
  const tfDir = path.join(dir, 'terraform');
  fileStore.ensureDir(k8sDir);
  fileStore.ensureDir(tfDir);

  writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: service.name,
    version: '1.0.0',
    main: 'index.js',
    scripts: { start: 'node index.js' },
    dependencies: { express: '^4.21.2' }
  }, null, 2));

  writeFile(path.join(dir, 'index.js'), `const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.json({ service: '${service.name}', env: process.env.APP_ENV || '${service.env}', ok: true }));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(port, () => console.log('${service.name} listening on ' + port));
`);

  writeFile(path.join(dir, 'Dockerfile'), `FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
`);

  writeFile(path.join(k8sDir, 'deployment.yaml'), `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service.name}
  labels:
    app: ${service.name}
    owner: ${service.ownerLabel}
spec:
  replicas: ${service.replicas}
  selector:
    matchLabels:
      app: ${service.name}
  template:
    metadata:
      labels:
        app: ${service.name}
    spec:
      containers:
        - name: ${service.name}
          image: ${service.name}:local
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: APP_ENV
              value: ${service.env}
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
`);

  writeFile(path.join(k8sDir, 'service.yaml'), `apiVersion: v1
kind: Service
metadata:
  name: ${service.name}
spec:
  type: NodePort
  selector:
    app: ${service.name}
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      nodePort: ${service.nodePort}
`);

  writeFile(path.join(tfDir, 'main.tf'), `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "app_sg" {
  name        = "\${var.project_prefix}-${service.name}-sg"
  description = "Allow HTTP for ${service.name}"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Service = "${service.name}"
    Owner   = "${service.owner}"
    Env     = "${service.env}"
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker
    systemctl enable docker
    systemctl start docker
    docker pull \${var.dockerhub_user}/${service.name}:latest
    docker rm -f ${service.name} || true
    docker run -d --restart always --name ${service.name} -p 80:8080 -e APP_ENV=${service.env} \${var.dockerhub_user}/${service.name}:latest
  EOF

  tags = {
    Name    = "\${var.project_prefix}-${service.name}"
    Service = "${service.name}"
    Owner   = "${service.owner}"
    Env     = "${service.env}"
  }
}

output "app_url" {
  value = "http://\${aws_instance.app.public_ip}"
}
`);

  writeFile(path.join(tfDir, 'variables.tf'), `variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_prefix" {
  type    = string
  default = "sk-idp"
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "dockerhub_user" {
  type        = string
  description = "Docker Hub username that owns the pushed image."
}
`);

  writeFile(path.join(dir, 'Jenkinsfile'), `pipeline {
  agent any
  parameters {
    choice(name: 'DEPLOY_TARGET', choices: ['kind', 'aws-ec2'], description: 'kind deploys locally, aws-ec2 pushes to Docker Hub and deploys EC2 with Terraform')
    string(name: 'DOCKERHUB_USER', defaultValue: '${service.dockerHubUser}', description: 'Docker Hub username')
    string(name: 'IDP_URL', defaultValue: 'http://localhost:3000', description: 'Running IDP URL for status callback')
  }
  environment {
    IMAGE_NAME = '${service.name}:local'
  }
  stages {
    stage('Install') {
      steps { bat 'npm install' }
    }
    stage('Build Image') {
      steps { bat 'docker build -t %IMAGE_NAME% .' }
    }
    stage('Deploy to kind') {
      when { expression { params.DEPLOY_TARGET == 'kind' } }
      steps {
        bat 'kind load docker-image ${service.name}:local --name sk-idp'
        bat 'kubectl apply -f k8s'
        bat 'kubectl rollout status deployment/${service.name} --timeout=60s'
      }
    }
    stage('Push to Docker Hub') {
      when { expression { params.DEPLOY_TARGET == 'aws-ec2' } }
      steps {
        withCredentials([string(credentialsId: 'dockerhub-token', variable: 'DOCKERHUB_TOKEN')]) {
          bat 'docker login -u %DOCKERHUB_USER% -p %DOCKERHUB_TOKEN%'
          bat 'docker tag %IMAGE_NAME% %DOCKERHUB_USER%/${service.name}:latest'
          bat 'docker push %DOCKERHUB_USER%/${service.name}:latest'
        }
      }
    }
    stage('Terraform AWS EC2') {
      when { expression { params.DEPLOY_TARGET == 'aws-ec2' } }
      steps {
        bat 'terraform -chdir=terraform init'
        bat 'terraform -chdir=terraform apply -auto-approve -var "dockerhub_user=%DOCKERHUB_USER%"'
      }
    }
    stage('Update IDP AWS URL') {
      when { expression { params.DEPLOY_TARGET == 'aws-ec2' } }
      steps {
        bat 'update-idp.cmd %IDP_URL%'
      }
    }
  }
}
`);

  writeFile(path.join(dir, 'deploy-kind.cmd'), `@echo off
where kind >nul 2>nul
if errorlevel 1 (
  echo kind.exe was not found in PATH.
  echo Install with: winget install Kubernetes.kind
  echo Or move kind.exe to a PATH folder such as C:\\Users\\HP\\AppData\\Local\\Microsoft\\WindowsApps
  exit /b 1
)
where kubectl >nul 2>nul
if errorlevel 1 (
  echo kubectl.exe was not found in PATH.
  echo Docker Desktop usually provides kubectl, or install with: winget install Kubernetes.kubectl
  exit /b 1
)
kind get clusters | findstr /R /C:"^sk-idp$" >nul
if errorlevel 1 (
  kind create cluster --config ..\\..\\kind\\cluster.yaml
)
docker build -t ${service.name}:local .
kind load docker-image ${service.name}:local --name sk-idp
kubectl apply -f k8s
kubectl rollout status deployment/${service.name} --timeout=60s
kubectl get pods
echo Open http://localhost:${service.nodePort}
echo Health http://localhost:${service.nodePort}/health
`);

  writeFile(path.join(dir, 'deploy-aws.cmd'), `@echo off
if "%DOCKERHUB_USER%"=="" set DOCKERHUB_USER=${service.dockerHubUser}
docker build -t ${service.name}:local .
docker tag ${service.name}:local %DOCKERHUB_USER%/${service.name}:latest
docker push %DOCKERHUB_USER%/${service.name}:latest
terraform -chdir=terraform init
terraform -chdir=terraform apply -auto-approve -var "dockerhub_user=%DOCKERHUB_USER%"
update-idp.cmd http://localhost:3000
`);

  writeFile(path.join(dir, 'update-idp.cmd'), `@echo off
set IDP_URL=%1
if "%IDP_URL%"=="" set IDP_URL=http://localhost:3000
for /f "tokens=*" %%i in ('terraform -chdir=terraform output -raw app_url') do curl -X POST -H "Content-Type: application/json" -d "{\\"awsUrl\\":\\"%%i\\"}" %IDP_URL%/api/service/${service.name}/aws-url
`);

  writeFile(path.join(dir, 'README.md'), `# ${service.name}

Generated by SK IDP.

Run locally:
\`\`\`cmd
npm install
npm start
\`\`\`

Deploy to kind:
\`\`\`cmd
deploy-kind.cmd
\`\`\`

Open:
\`\`\`text
http://localhost:${service.nodePort}
\`\`\`

Deploy to AWS EC2 using Docker Hub:
\`\`\`cmd
set DOCKERHUB_USER=${service.dockerHubUser}
deploy-aws.cmd
\`\`\`

Jenkins can run DEPLOY_TARGET=kind for local Kubernetes or DEPLOY_TARGET=aws-ec2 for Docker Hub plus AWS EC2.
`);
}

module.exports = { createServiceFiles };
