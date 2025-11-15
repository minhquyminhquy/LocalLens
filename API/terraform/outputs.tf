output "project_id" {
  description = "The project ID"
  value       = var.project_id
}

output "places_api_key" {
  description = "Places API key"
  value       = google_apikeys_key.places_api_key.key_string
  sensitive   = true
}

output "gemini_api_key" {
  description = "Gemini AI API key"
  value       = google_apikeys_key.gemini_api_key.key_string
  sensitive   = true
}
