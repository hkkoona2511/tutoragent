output "ecr_url" {
  description = "The URL of the AWS ECR Repository"
  value       = aws_ecr_repository.tutoragent.repository_url
}

output "ecs_task_definition_json" {
  description = "Full ECS Task Definition formatted as a standard AWS JSON document."
  value = jsonencode({
    family                  = aws_ecs_task_definition.taskdefone.family
    networkMode             = aws_ecs_task_definition.taskdefone.network_mode
    requiresCompatibilities = aws_ecs_task_definition.taskdefone.requires_compatibilities
    cpu                     = aws_ecs_task_definition.taskdefone.cpu
    memory                  = aws_ecs_task_definition.taskdefone.memory
    executionRoleArn        = aws_ecs_task_definition.taskdefone.execution_role_arn
    taskRoleArn             = aws_ecs_task_definition.taskdefone.task_role_arn
    containerDefinitions    = jsondecode(aws_ecs_task_definition.taskdefone.container_definitions)
  })
}