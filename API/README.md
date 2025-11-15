# Restaurant Identification API

AI-powered restaurant identification service built for **Snapchat Spectacles Lens** at **Junction 2025** in Espoo, Finland. Upload a restaurant photo with GPS coordinates to get instant identification, reviews, ratings, and AI-generated summaries using Google Gemini Vision and Google Places API.

**Live API**: `https://restaurant-api-xztpop2o2q-lz.a.run.app`

## Features

- **AI-Powered**: Google Gemini 2.0 Flash for intelligent visual recognition
- **Location-Aware**: GPS + visual analysis for accurate matching
- **Rich Data**: Ratings, reviews, hours, contact info, AI summaries
- **Auto-Scaling**: Serverless (0-3 instances), ~6-8s response time

## Quick Start

### Identify Restaurant
```bash
curl -X POST "https://restaurant-api-xztpop2o2q-lz.a.run.app/identify-restaurant" \
  -F "file=@restaurant.jpg" \
  -F "latitude=60.1557" \
  -F "longitude=24.6314" | jq
```

### Response
```json
{
  "identified_restaurant": {
    "name": "Ravintola Nepal",
    "address": "Kivenlahdenkatu 1, Espoo",
    "rating": 4.5,
    "phone": "09 3489009",
    "website": "http://www.ravintolanepal.fi/",
    "total_ratings": 826,
    "opening_hours": ["Monday: Closed", "Tuesday: 11:00 AM – 9:00 PM", "..."],
    "review_summary": "Well-regarded Nepalese restaurant praised for chicken chili..."
  },
  "confidence": 99,
  "reasoning": "Sign reads 'Ravintola Nepal'...",
  "visible_clues": ["Ravintola Nepal sign", "K Market sign"],
  "reviews": [...],
  "message": "Success"
}
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and version |
| `/health` | GET | Health check with service status |
| `/identify-restaurant` | POST | Identify restaurant from image + GPS |

**Parameters** (POST `/identify-restaurant`):
- `file`: Image file (JPEG/PNG)
- `latitude`: GPS latitude (float)
- `longitude`: GPS longitude (float)

## Tech Stack

- **FastAPI** 0.115.0 + **Python** 3.13 + **uv** package manager
- **Google Gemini** 2.0 Flash (vision AI)
- **Google Places API** (location data)
- **Google Cloud Run** (serverless) + **Terraform** (IaC)
- **Docker** multi-stage builds

## Deployment

```bash
# Quick deploy
cd API
./deploy.sh
```

**Prerequisites**: `gcloud`, Terraform, Docker, enabled APIs (Gemini, Places, Cloud Run, Cloud Build)

**Setup**: Edit `terraform/terraform.tfvars` and set your `project_id`

## Configuration

**Cloud Run**: 1 vCPU, 512 MiB, 0-3 instances, 300s timeout, 80 concurrency  
**Region**: europe-north1  
**Env Vars**: `GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY` (set in `terraform/main.tf`)

## Testing

```bash
# Health
curl https://restaurant-api-xztpop2o2q-lz.a.run.app/health

# Identify
curl -X POST "https://restaurant-api-xztpop2o2q-lz.a.run.app/identify-restaurant" \
  -F "file=@test.jpg" -F "latitude=60.206" -F "longitude=24.637" | jq
```

---

**Built for Junction 2025** | [GitHub](https://github.com/minhquyminhquy/Junction2025)
