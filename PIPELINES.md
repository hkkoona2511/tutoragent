# TutorAgent — DevOps CI/CD & IaC Pipelines

This document provides a comprehensive analysis of the DevOps CI/CD and Infrastructure as Code (IaC) pipelines defined in the `.github/workflows` directory for the **TutorAgent** application.

---

## 1. Overview

The DevOps strategy utilizes **GitHub Actions** to automate both the validation of Terraform infrastructure and the deployment of the containerized application to AWS ECS. The strategy is split across two YAML files:
1. `iac.yaml`: A reusable workflow for Terraform operations.
2. `cicdwf.yaml`: The primary CI/CD workflow that orchestrates the infrastructure checks followed by the application build and ECS deployment.

Both workflows are triggered by a `push` to the `main` branch.

---

## 2. Infrastructure as Code Pipeline (`iac.yaml`)

This workflow manages the Terraform lifecycle. It acts as both a standalone workflow (on push to `main`) and a reusable workflow (`workflow_call`).

### Key Configurations:
- **Runner**: `ubuntu-latest`
- **Secrets Required**: `AWS_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY`

### Workflow Steps:
1. **Source Code Checkout**: Uses `actions/checkout@v3` to pull the repository.
2. **Install Terraform**: Uses `hashicorp/setup-terraform@v3` to enforce Terraform version `1.15.5`.
3. **Terraform Init & Plan**: Navigates to `./iac/terraform`, initializes the working directory, and generates an execution plan saved to `tfplan-output.json`.
4. **Terraform Output**: Extracts the `ecs_task_definition_json` (defined in `output.tf`) and writes it to a local file named `tutoragent-task-definition.json`.

---

## 3. Continuous Deployment Pipeline (`cicdwf.yaml`)

This is the primary workflow that handles the actual application deployment. It consists of two sequential jobs.

### Job 1: `run-iacdeploy`
- Calls the reusable `iac.yaml` workflow.
- Passes the necessary AWS secrets securely to the called workflow.

### Job 2: `build-and-deploy`
- **Dependency**: Explicitly requires `run-iacdeploy` to succeed before starting (`needs: run-iacdeploy`).
- **Runner**: `ubuntu-latest`

#### Deployment Steps:
1. **Checkout Source**: Pulls the application code.
2. **Configure AWS Credentials**: Uses `aws-actions/configure-aws-credentials@v3` targeting the `ap-south-1` region.
3. **Login to Amazon ECR**: Uses `aws-actions/amazon-ecr-login@v1` to authenticate Docker with the AWS Elastic Container Registry.
4. **Build & Push Image**: 
   - Builds the Docker image from the root `Dockerfile`.
   - Tags the image as `latest`.
   - Pushes the image to the `tutoragent` ECR repository.
   - Outputs the exact image URI for downstream steps.
5. **Update ECS Task Definition**: Uses `aws-actions/amazon-ecs-render-task-definition@v1` to dynamically inject the newly pushed Docker image URI into `tutoragent-task-definition.json`.
6. **Deploy to ECS**: Uses `aws-actions/amazon-ecs-deploy-task-definition@v1` to deploy the updated task definition to the `tutoragent-service` within `ecs-cluster-one`, forcing a new deployment rollout.

---

## 4. Pipeline Analysis & Critical Recommendations

Upon analyzing the source files, there are a few architectural gaps in the current implementation that will cause the deployment pipeline to fail. It is highly recommended to address these issues:

### 4.1. Missing Artifact Sharing
- **Issue**: The `iac.yaml` workflow generates the `tutoragent-task-definition.json` file. However, because GitHub Actions jobs run on separate, isolated runners, this file is destroyed when the `run-iacdeploy` job finishes. The `build-and-deploy` job attempts to read this file in Step 5, which will result in a "File not found" error.
- **Fix**: Use `actions/upload-artifact` at the end of `iac.yaml` to upload the JSON file, and `actions/download-artifact` at the beginning of the `build-and-deploy` job to retrieve it.

### 4.2. Container Name Mismatch
- **Issue**: In `cicdwf.yaml` Step 5, the action attempts to update a container named `tutoragent` (`container-name: tutoragent`). However, in `iac/terraform/taskdefinition.tf`, the container is named `taskone`. 
- **Fix**: Update `cicdwf.yaml` to match the Terraform configuration: `container-name: taskone`.

### 4.3. Missing `terraform apply`
- **Issue**: The `iac.yaml` workflow executes `terraform plan`, but never executes `terraform apply`. If developers add new infrastructure to the Terraform files, the CI/CD pipeline will not actually provision the new resources on AWS.
- **Fix**: Add a `terraform apply -auto-approve tfplan-output.json` step in `iac.yaml` (or create a dedicated branch/environment strategy for applying infrastructure).
