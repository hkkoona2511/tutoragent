resource "aws_security_group" "tutoragent-sg" {
  name        = "tutoragent-sg"
  description = "Security group for tutoragent ECS task"
  vpc_id      = aws_default_vpc.ecs-vpc-one.id

  ingress {
    description = "Allow inbound on port 5500"
    from_port   = 5500
    to_port     = 5500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tutoragent-sg"
  }

  lifecycle {
    ignore_changes = [
      description,
      name,
      vpc_id
    ]
  }
}
