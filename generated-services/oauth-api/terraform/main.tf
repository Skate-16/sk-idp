terraform {
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
  name        = "${var.project_prefix}-oauth-api-sg"
  description = "Allow HTTP for oauth-api"

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
    Service = "oauth-api"
    Owner   = "sk@example.com"
    Env     = "dev"
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
    docker pull ${var.dockerhub_user}/oauth-api:latest
    docker rm -f oauth-api || true
    docker run -d --restart always --name oauth-api -p 80:8080 -e APP_ENV=dev ${var.dockerhub_user}/oauth-api:latest
  EOF

  tags = {
    Name    = "${var.project_prefix}-oauth-api"
    Service = "oauth-api"
    Owner   = "sk@example.com"
    Env     = "dev"
  }
}

output "app_url" {
  value = "http://${aws_instance.app.public_ip}"
}
