resource "aws_ecr_repository" "tutoragent_ecr_repository" {
  name = "tutoragent_ecr_repository"
  tags = {
    Name = "tutoragent_ecr_repository"
  }
}