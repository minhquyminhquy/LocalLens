variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "europe-north1"
}

variable "docker_image" {
  description = "Docker image for Cloud Run (format: gcr.io/PROJECT_ID/IMAGE:TAG)"
  type        = string
  default     = ""
}
