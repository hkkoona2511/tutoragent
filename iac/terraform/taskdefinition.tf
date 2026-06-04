resource "aws_ecs_task_definition" "tutoragent-task" {
  family                   = "tutoragent-task"
  container_definitions    = <<DEFINITION
[
  {
    "name": "tutoragent-task",
    "image": "${aws_ecr_repository.tutoragent_ecr_repository.repository_url}",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 5500,
        "hostPort": 5500
      }
    ],
    "memory": 1024,
    "cpu": 512,
    "networkMode": "awsvpc"
  }
]
  DEFINITION
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn
  cpu                      = 512
}