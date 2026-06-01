output "ecr_url" {
  description = "The URL of the AWS ECR Repository"
  value       = aws_ecr_repository.tutoragent.repository_url
}