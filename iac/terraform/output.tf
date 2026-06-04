output "ecr_url" {
  description = "The URL of the AWS ECR Repository"
  value       = aws_ecr_repository.tutoragent.repository_url
}

output "ecs_task_definition_json" {
  description = "Full ECS Task Definition formatted as a standard AWS JSON document."
  value = jsonencode({
    family                  = aws_ecs_task_definition.tutoragent.family
    networkMode             = aws_ecs_task_definition.tutoragent.network_mode
    requiresCompatibilities = aws_ecs_task_definition.tutoragent.requires_compatibilities
    cpu                     = aws_ecs_task_definition.tutoragent.cpu
    memory                  = aws_ecs_task_definition.tutoragent.memory
    executionRoleArn        = aws_ecs_task_definition.tutoragent.execution_role_arn
    taskRoleArn             = aws_ecs_task_definition.tutoragent.task_role_arn
    containerDefinitions    = jsondecode(aws_ecs_task_definition.tutoragent.container_definitions)
  })
}