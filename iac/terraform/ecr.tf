resource "aws_ecr_repository" "tutoragent" {
  name = var.app_name  
  tags = {
    Name=var.app_name
  }
}