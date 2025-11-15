#!/bin/bash
set -e

if [ -f "terraform/terraform.tfvars" ]; then
  PROJECT_ID=$(grep project_id terraform/terraform.tfvars | cut -d'"' -f2)
else
  echo "Error: terraform/terraform.tfvars not found"
  exit 1
fi

IMAGE="gcr.io/${PROJECT_ID}/restaurant-api:latest"

echo "Building Docker image..."
cd "$(dirname "$0")"
gcloud builds submit --project=$PROJECT_ID --tag=$IMAGE .

echo "Deploying with Terraform..."
cd terraform
[ ! -d ".terraform" ] && terraform init
terraform apply -var="docker_image=$IMAGE" -auto-approve

echo ""
echo "Deployment complete!"
echo "API URL: $(terraform output -raw cloud_run_url)"
echo ""

