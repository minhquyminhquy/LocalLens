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

# Enable required APIs
resource "google_project_service" "places_api" {
  project = var.project_id
  service = "places-backend.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "generativeai_api" {
  project = var.project_id
  service = "generativelanguage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "apikeys_api" {
  project = var.project_id
  service = "apikeys.googleapis.com"
  disable_on_destroy = false
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
