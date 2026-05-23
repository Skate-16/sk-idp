variable "aws_region" {
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
