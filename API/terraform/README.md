# Terraform Setup

## Prerequisites

1. Terraform installed
   ```bash
    terraform --version
    ```
2. Create a Google Cloud project and enable billing. 
3. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```
4. **Enable Cloud Resource Manager API** (required for Terraform to manage other APIs):
   ```bash
   gcloud services enable cloudresourcemanager.googleapis.com --project=YOUR_PROJECT_ID
   ```

## What This Creates

1. Enables Places API (`places-backend.googleapis.com`)
2. Enables Generative AI API (`generativelanguage.googleapis.com`) for Gemini
3. Enables API Keys API (`apikeys.googleapis.com`)
4. Creates a restricted API key for Places API
5. Creates a restricted API key for Gemini AI
6. Enables Cloud Run API (`run.googleapis.com`)
7. Enables Artifact Registry (`artifactregistry.googleapis.com`)
8. Enables Cloud Build (`cloudbuild.googleapis.com`)
9. **Deploys FastAPI application to Cloud Run**
10. **Provides public HTTPS URL**  

## Setup

1. Setup the variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and set your project_id
```

2. Initialize Terraform
```bash
terraform init
```

3. Review Plan
```bash
terraform plan
```

4. Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted.

## Deploy to Cloud Run

```bash
cd ..
./deploy.sh
```

Get your URL:
```bash
cd terraform
terraform output -raw cloud_run_url
```

## Extract API Keys (For Local Development)

After Terraform finishes, run the setup script to automatically create your `.env` file:

```bash
chmod +x setup-env.sh
./setup-env.sh
```

This script will:
- Extract both API keys from Terraform outputs
- Create a `.env` file in the API directory with both keys
- Create individual key files for reference

Alternatively, you can manually extract the keys:

```bash
# Save Places API key
terraform output -raw places_api_key > places-api-key.txt

# Save Gemini API key
terraform output -raw gemini_api_key > gemini-api-key.txt
```



## Cleanup

When you're finished with the project and want to remove all infrastructure:

```bash
terraform destroy
```

Type `yes` when prompted.

## Security Notes

⚠️ **IMPORTANT**: Never commit the following files to version control:
- `terraform.tfvars` (contains your project ID)
- `.env` (contains API keys)
- `places-api-key.txt` (contains API key)
- `gemini-api-key.txt` (contains API key)
- `.terraform/` directory
- `*.tfstate` files

These should be included in `.gitignore`.

