resource "aws_ecs_service" "tutoragent-service" {
  name                = "tutoragent-service"
  cluster             = aws_ecs_cluster.ecs-cluster-one.id
  task_definition     = aws_ecs_task_definition.tutoragent-task.arn
  launch_type         = "FARGATE"
  scheduling_strategy = "REPLICA"
  desired_count       = 1

  network_configuration {
    subnets          = [aws_default_subnet.ecs_az1.id, aws_default_subnet.ecs_az2.id, aws_default_subnet.ecs_az3.id]
    assign_public_ip = true
    security_groups  = [aws_security_group.tutoragent-sg.id]
  }
}