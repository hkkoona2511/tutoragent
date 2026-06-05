# TutorAgent — Infrastructure Provisioning Guide

This document outlines the infrastructure architecture and provisioning strategy for the **TutorAgent** application using HashiCorp Terraform on AWS. The infrastructure is defined as code within the `iac/terraform/` directory.

---

## 1. Overview

TutorAgent is deployed on AWS using **Amazon Elastic Container Service (ECS)** with the serverless **Fargate** compute engine. The setup is designed to be lightweight, secure, and isolated within an AWS VPC.

The deployment relies on the following core AWS services:
- **Amazon Elastic Container Registry (ECR)**: To store and manage the Docker container images for the TutorAgent application.
- **Amazon Elastic Container Service (ECS)**: To orchestrate and run the Docker containers.
- **AWS Fargate**: To provide serverless compute for the ECS tasks without the need to manage underlying EC2 instances.
- **Amazon Virtual Private Cloud (VPC)**: To provide an isolated network for the ECS services.
- **AWS Identity and Access Management (IAM)**: To govern the permissions necessary for ECS to execute tasks.

---

## 2. Infrastructure Components

### 2.1. Provider & Variables (`provider.tf`, `variables.tf`)
- **Provider**: The configuration uses the `hashicorp/aws` provider (version `6.47.0`).
- **Region**: Defaults to `ap-south-1` (Mumbai), configurable via the `aws_region` variable.
- **Application Name**: Standardized as `tutoragent` via the `app_name` variable.

### 2.2. Network (`vpc.tf`, `sg.tf`)
- **VPC**: Uses the default AWS VPC, tagged as `ECS-VPC-ONE`.
- **Subnets**: Relies on default subnets across three availability zones (`ap-south-1a`, `ap-south-1b`, `ap-south-1c`) to ensure high availability. 
- **Security Group**: The `tutoragent-sg` allows inbound TCP traffic on port 5500 and all outbound traffic.

### 2.3. IAM Roles (`iam.tf`)
- **ECS Task Execution Role (`ecsTaskExecutionRole`)**: An IAM role specifically created to allow the ECS service to pull container images from ECR and execute tasks securely. It uses the `sts:AssumeRole` policy for the `ecs-tasks.amazonaws.com` service principal.

### 2.4. Container Registry (`ecr.tf`)
- **ECR Repository**: A private ECR repository named `tutoragent` is provisioned to hold the application's Docker images.

### 2.5. Compute & Orchestration (`ecs.tf`, `taskdefinition.tf`, `service.tf`)
- **Cluster**: An ECS cluster named `ecs-cluster-one` is provisioned as the logical grouping for the tasks.
- **Task Definition (`tutoragent-task`)**:
  - **Launch Type**: Fargate (`requires_compatibilities = ["FARGATE"]`).
  - **Resources**: Lightweight resource allocation with 0.5 vCPU (`cpu = 512`) and 1.0 GB RAM (`memory = 1024`).
  - **Network Mode**: `awsvpc` (required for Fargate).
  - **Container Setup**: Pulls the `tutoragent` image from the provisioned ECR repository and exposes port `5500` (container and host).
- **Service (`tutoragent-service`)**:
  - Runs exactly 1 replica (`desired_count = 1`) of the task definition.
  - Deployed across multiple subnets (`ecs_az1`, `ecs_az2`, `ecs_az3`) for high availability.
  - **Security**: The container has a public IP assigned (`assign_public_ip = true`) and is attached to the `tutoragent-sg` Security Group.

### 2.6. Outputs (`output.tf`)
Upon a successful `terraform apply`, the module outputs:
1. **`ecr_url`**: The URL of the ECR repository, required for the CI/CD pipeline or developer machine to tag and push the Docker image.
2. **`ecs_task_definition_json`**: The complete Task Definition output formatted as a standard AWS JSON document, which can be useful for debugging or integrating with deployment systems.

---

## 3. Provisioning Instructions

To provision this infrastructure, ensure you have the [AWS CLI](https://aws.amazon.com/cli/) configured and [Terraform](https://www.terraform.io/) installed.

1. **Initialize Terraform**:
   Navigate to the `iac/terraform` directory and initialize the providers:
   ```bash
   cd iac/terraform
   terraform init
   ```

2. **Validate the Configuration**:
   Ensure all configurations are syntactically correct:
   ```bash
   terraform validate
   ```

3. **Plan the Deployment**:
   Preview the AWS resources that will be created:
   ```bash
   terraform plan
   ```

4. **Apply the Infrastructure**:
   Execute the plan to create the resources on AWS:
   ```bash
   terraform apply
   ```
   *(Confirm with `yes` when prompted)*

## 4. Post-Provisioning Workflow

Once Terraform has successfully provisioned the infrastructure, you must build and push the Docker image to ECR before the ECS service can start successfully:

1. **Authenticate Docker to ECR**:
   Use the AWS CLI to retrieve an authentication token and authenticate your Docker client to your registry.
2. **Build your Docker image**:
   Run `docker build -t tutoragent .` from the project root.
3. **Tag your image**:
   Tag the image with the `ecr_url` provided in the Terraform output.
4. **Push the image**:
   Run `docker push <ecr_url>:latest`.

Once the image is in ECR, the ECS Fargate service will be able to pull it and start the `tutoragent` container.
