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

## 4. Pipeline Improvements Implemented

Previous architectural gaps in the pipeline have been resolved:

### 4.1. Artifact Sharing Added
- The `iac.yaml` workflow now uses `actions/upload-artifact@v4` to upload the `tutoragent-task-definition.json` file.
- The `build-and-deploy` job in `cicdwf.yaml` uses `actions/download-artifact@v4` to successfully retrieve it across job boundaries.

### 4.2. Container Name Mismatch Resolved
- The container name is now correctly aligned as `tutoragent-task` in both `cicdwf.yaml` and the `taskdefinition.tf` Terraform configuration.

### 4.3. `terraform apply` Included
- The `iac.yaml` workflow now properly executes `terraform apply -auto-approve tfplan-output.json` to automatically provision new infrastructure upon code merge.
