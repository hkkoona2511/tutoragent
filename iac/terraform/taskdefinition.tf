resource "aws_ecs_task_definition" "taskdefone" {
  family                    = "taskdefone"
  container_definitions     = <<DEFINITION
[
  {
    "name": "taskone",
    "image": "${aws_ecr_repository.tutoragent.repository_url}",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 5500,
        "hostPort": 5500
      }
    ],
    "memory": 512,
    "cpu": 256,
    "networkMode": "awsvpc"
  }
]
  DEFINITION
  requires_compatibilities  = ["FARGATE"]
  network_mode              = "awsvpc"
  memory                    = 512
  execution_role_arn        = aws_iam_role.ecsTaskExecutionRole.arn
  cpu                       = 256
}