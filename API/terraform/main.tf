terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

# Enable Cloud Resource Manager API (required for other APIs)
resource "google_project_service" "cloudresourcemanager_api" {
  project            = var.project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# Enable required APIs
resource "google_project_service" "places_api" {
  project            = var.project_id
  service            = "places-backend.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

resource "google_project_service" "generativeai_api" {
  project            = var.project_id
  service            = "generativelanguage.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

resource "google_project_service" "apikeys_api" {
  project            = var.project_id
  service            = "apikeys.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

# Create API key for Places API
resource "google_apikeys_key" "places_api_key" {
  name         = "restaurant-identifier-places-key"
  display_name = "Restaurant Identifier Places API Key"
  
  restrictions {
    api_targets {
      service = "places-backend.googleapis.com"
    }
  }
  
  depends_on = [google_project_service.places_api, google_project_service.apikeys_api]
}

# Create API key for Gemini AI
resource "google_apikeys_key" "gemini_api_key" {
  name         = "restaurant-identifier-gemini-key"
  display_name = "Restaurant Identifier Gemini API Key"
  
  restrictions {
    api_targets {
      service = "generativelanguage.googleapis.com"
    }
  }
  
  depends_on = [google_project_service.generativeai_api, google_project_service.apikeys_api]
}

# Enable Cloud Run API
resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

# Enable Artifact Registry (for container images)
resource "google_project_service" "artifactregistry_api" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

# Enable Cloud Build (for building Docker images)
resource "google_project_service" "cloudbuild_api" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
  depends_on         = [google_project_service.cloudresourcemanager_api]
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "restaurant_api" {
  name     = "restaurant-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    # Force new revision on every deployment by adding annotation with timestamp
    annotations = {
      "deployment-timestamp" = timestamp()
    }
    
    containers {
      # Use the image variable - you'll build and push this manually
      image = var.docker_image

      # Set environment variables directly (no Secret Manager!)
      env {
        name  = "GOOGLE_MAPS_API_KEY"
        value = google_apikeys_key.places_api_key.key_string
      }

      env {
        name  = "GEMINI_API_KEY"
        value = google_apikeys_key.gemini_api_key.key_string
      }

      # Resource limits
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Port configuration (matches Dockerfile)
      ports {
        container_port = 8080
      }
    }

    # Scaling configuration
    scaling {
      max_instance_count = 3
      min_instance_count = 0  # Scale to zero when idle
    }
  }

  depends_on = [
    google_project_service.run_api,
    google_apikeys_key.places_api_key,
    google_apikeys_key.gemini_api_key
  ]
}

# Allow public access (no authentication required)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.restaurant_api.name
  location = google_cloud_run_v2_service.restaurant_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
