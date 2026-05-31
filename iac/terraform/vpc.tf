resource "aws_default_vpc" "ecs-vpc-one" {
  tags = {
    Name = "ECS-VPC-ONE"
  }
}

resource "aws_default_subnet" "ecs_az1" {
  availability_zone = "ap-south-1a"

  tags = {
    Name = "Default subnet for ap-south-1a"
  }
}

resource "aws_default_subnet" "ecs_az2" {
  availability_zone = "ap-south-1b"

  tags = {
    Name = "Default subnet for ap-south-1b"
  }
}

resource "aws_default_subnet" "ecs_az3" {
  availability_zone = "ap-south-1c"

  tags = {
    Name = "Default subnet for ap-south-1c"
  }
}