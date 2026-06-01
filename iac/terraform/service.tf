resource "aws_ecs_service" "tutoragent_service" {
  name              = "tutoragent-service"
  cluster           = aws_ecs_cluster.ecs-cluster-one.id
  task_definition   = aws_ecs_task_definition.taskdefone.arn
  launch_type       = "FARGATE"
  scheduling_strategy = "REPLICA"
  desired_count     = 1

  network_configuration {
    subnets          = [aws_default_subnet.ecs_az1.id]
    assign_public_ip = false
  }
}