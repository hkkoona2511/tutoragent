resource "aws_ecr_repository" "tutoragent" {
  name = "tutoragent"
  tags = {
    Name="tutoragent"
  }
}