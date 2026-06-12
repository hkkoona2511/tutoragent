resource "aws_ecr_repository" "tutoragent_ecr_repository" {
  name         = "tutoragent_ecr_repository"
  force_delete = true
  tags = {
    Name = "tutoragent_ecr_repository"
  }
}