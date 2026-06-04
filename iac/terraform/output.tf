output "ecr_url" {
  description = "The URL of the AWS ECR Repository"
  value       = aws_ecr_repository.tutoragent_ecr_repository.repository_url
}

output "ecs_task_definition_json" {
  description = "Full ECS Task Definition formatted as a standard AWS JSON document."
  value = jsonencode({
    family                  = aws_ecs_task_definition.tutoragent-task.family
    networkMode             = aws_ecs_task_definition.tutoragent-task.network_mode
    requiresCompatibilities = aws_ecs_task_definition.tutoragent-task.requires_compatibilities
    cpu                     = aws_ecs_task_definition.tutoragent-task.cpu
    memory                  = aws_ecs_task_definition.tutoragent-task.memory
    executionRoleArn        = aws_ecs_task_definition.tutoragent-task.execution_role_arn
    taskRoleArn             = aws_ecs_task_definition.tutoragent-task.task_role_arn
    containerDefinitions    = jsondecode(aws_ecs_task_definition.tutoragent-task.container_definitions)
  })
}