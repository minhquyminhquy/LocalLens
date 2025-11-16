import os
import json
import base64
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from dotenv import load_dotenv
import googlemaps
import google.generativeai as genai
from PIL import Image
import io

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="Junction 2025 -Restaurant Identifier API",
    description="Identify restaurants from images and fetch reviews",
    version="1.0.0"
)

# Initialize services
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


@app.get("/")
async def root():
    return {
        "message": "Restaurant Identifier API",
        "version": "1.0.0",
        "endpoint": "/identify-restaurant"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "google_maps": "configured" if os.getenv("GOOGLE_MAPS_API_KEY") else "not configured",
        "gemini_ai": "configured" if os.getenv("GEMINI_API_KEY") else "not configured"
    }


@app.post("/identify-restaurant")
async def identify_restaurant(
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None)
):
    logger.info(f"Received request for location: ({latitude}, {longitude})")
    
    try:
        # Validate that at least one image input is provided
        if not file and not image_base64:
            logger.error("No image provided in request")
            raise HTTPException(
                status_code=400, 
                detail="Either 'file' or 'image_base64' must be provided"
            )
        
        if file and image_base64:
            logger.error("Both file and image_base64 provided")
            raise HTTPException(
                status_code=400,
                detail="Provide either 'file' or 'image_base64', not both"
            )
        
        # Load image from either source
        if file:
            # Read uploaded file
            logger.info(f"Loading image from uploaded file: {file.filename}")
            image_data = await file.read()
        else:
            # Decode base64 string
            logger.info("Loading image from base64 string")
            try:
                # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
                if ',' in image_base64:
                    image_base64 = image_base64.split(',', 1)[1]
                image_data = base64.b64decode(image_base64)
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid base64 image data: {str(e)}"
                )
        
        # Search for nearby restaurants
        logger.info(f"Searching for restaurants within 100m of ({latitude}, {longitude})")
        places_result = gmaps.places_nearby(
            location=(latitude, longitude),
            radius=100,
            type="restaurant"
        )
        
        # Extract restaurant data
        nearby_restaurants = [
            {
                "name": place.get("name", ""),
                "address": place.get("vicinity", ""),
                "rating": place.get("rating", 0.0),
                "place_id": place.get("place_id", ""),
                "types": place.get("types", []),
                "location": place.get("geometry", {}).get("location", {}),
                "phone": "",
                "website": "",
                "total_ratings": 0,
                "opening_hours": [],
                "review_summary": ""
            }
            for place in places_result.get("results", [])
        ]
        
        logger.info(f"Found {len(nearby_restaurants)} restaurants nearby")
        
        if not nearby_restaurants:
            logger.warning("No restaurants found within 100m - using mock response")
            mock_restaurant = {
                "name": "Joe's Diner",
                "address": "123 Main Street, Downtown",
                "rating": 4.0,
                "place_id": "mock_place_id_123456",
                "types": ["restaurant", "food", "establishment"],
                "location": {"lat": latitude, "lng": longitude},
                "phone": "+1 555-123-4567",
                "website": "https://www.example-restaurant.com",
                "total_ratings": 42,
                "opening_hours": [
                    "Monday: 9:00 AM – 9:00 PM",
                    "Tuesday: 9:00 AM – 9:00 PM",
                    "Wednesday: 9:00 AM – 9:00 PM",
                    "Thursday: 9:00 AM – 9:00 PM",
                    "Friday: 9:00 AM – 10:00 PM",
                    "Saturday: 10:00 AM – 10:00 PM",
                    "Sunday: 10:00 AM – 8:00 PM"
                ],
                "review_summary": "A welcoming neighborhood spot with friendly service and comfort food. Customers appreciate the generous portions and reasonable prices."
            }
            return {
                "identified_restaurant": mock_restaurant,
                "confidence": 10,
                "reasoning": "No restaurants found within 100m. Mock response generated with placeholder data.",
                "visible_clues": ["Generic restaurant signage", "Standard storefront"],
                "reviews": [
                    {
                        "author_name": "John Doe",
                        "rating": 5,
                        "text": "Great food and excellent service! Would definitely recommend to friends and family.",
                        "time": 1699920000
                    },
                    {
                        "author_name": "Jane Smith",
                        "rating": 4,
                        "text": "Good atmosphere and tasty meals. Portions are generous.",
                        "time": 1699833600
                    },
                    {
                        "author_name": "Bob Johnson",
                        "rating": 3,
                        "text": "Decent place for a quick bite. Nothing extraordinary but solid food.",
                        "time": 1699747200
                    }
                ],
                "total_reviews": 3,
                "nearby_count": 0,
                "message": "No restaurants found - mock response"
            }
        
        # Open image using PIL
        logger.info("Opening and processing image")
        image = Image.open(io.BytesIO(image_data))
        
        # Analyze image with Gemini AI
        logger.info("Initializing Gemini AI model")
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create restaurant list for AI
        restaurant_list = "\n".join([
            f"{i+1}. {r['name']} - {r['address']}"
            for i, r in enumerate(nearby_restaurants)
        ])
        logger.info(f"Restaurant list for AI:\n{restaurant_list}")
        
        prompt = f"""Identify which restaurant from this list matches the image:

{restaurant_list}

Respond in JSON format:
{{
    "identified_restaurant": "exact name from list",
    "restaurant_id": "place_id from the list",
    "confidence_score": 0-100,
    "reasoning": "brief explanation",
    "visible_clues": ["clue1", "clue2"]
}}"""

        logger.info("Sending image to Gemini AI for analysis")
        response = model.generate_content([prompt, image])
        response_text = response.text
        logger.info(f"Gemini AI response received: {response_text[:200]}...")
        
        # Parse AI response
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            ai_result = json.loads(response_text[start_idx:end_idx])
            logger.info(f"Parsed AI result: {ai_result}")
            
            # Find matching restaurant
            identified_name = ai_result.get("identified_restaurant", "")
            identified_id = ai_result.get("restaurant_id", "")
            matched_restaurant = None
            
            if identified_name or identified_id:
                for restaurant in nearby_restaurants:
                    name_match = restaurant["name"].lower() in identified_name.lower() or \
                                 identified_name.lower() in restaurant["name"].lower()
                    id_match = restaurant["place_id"] == identified_id
                    
                    if name_match or id_match:
                        matched_restaurant = restaurant
                        logger.info(f"Matched restaurant: {restaurant['name']}")
                        break
            
            # If AI couldn't identify or no match found, use first restaurant from nearby list
            if not matched_restaurant:
                matched_restaurant = nearby_restaurants[0]
                logger.warning(f"AI couldn't identify restaurant, defaulting to first nearby: {matched_restaurant['name']}")
                ai_result["confidence_score"] = 30  # Lower confidence for fallback
                ai_result["reasoning"] = ai_result.get("reasoning", "") + " (Defaulted to nearest restaurant)"
            
            # Fetch place details and reviews
            reviews = []
            review_summary = ""
            
            if matched_restaurant and matched_restaurant.get("place_id"):
                logger.info(f"Fetching place details for: {matched_restaurant.get('name', 'Unknown')}")
                try:
                    place_details_result = gmaps.place(
                        place_id=matched_restaurant["place_id"],
                        fields=[
                            "name", "rating", "formatted_address", "formatted_phone_number",
                            "website", "opening_hours", "price_level", "reviews",
                            "user_ratings_total"
                        ]
                    )
                    
                    if place_details_result.get("status") == "OK":
                        place_details = place_details_result.get("result", {})
                        logger.info("Place details retrieved successfully")
                        
                        # Get 5 most recent reviews
                        all_reviews = place_details.get("reviews", [])
                        sorted_reviews = sorted(all_reviews, key=lambda x: x.get("time", 0), reverse=True)
                        reviews = sorted_reviews[:5]
                        logger.info(f"Retrieved {len(reviews)} reviews")
                        
                        # Generate review summary
                        if reviews:
                            logger.info("Generating review summary with AI")
                            review_texts = "\n\n".join([
                                f"Rating: {r.get('rating', 'N/A')}/5\n{r.get('text', '')}"
                                for r in reviews
                            ])
                            
                            summary_prompt = f"""Summarize these reviews in 2-3 sentences:

{review_texts}"""

                            summary_model = genai.GenerativeModel('gemini-2.0-flash')
                            summary_response = summary_model.generate_content(summary_prompt)
                            review_summary = summary_response.text.strip()
                            
                            logger.info(f"Review Summary: {review_summary}")
                            print(f"\n📝 Review Summary:\n{review_summary}\n{'='*80}\n")
                        else:
                            logger.info("No reviews available for this restaurant")
                        
                        # Add details to matched restaurant with default values
                        matched_restaurant["phone"] = place_details.get("formatted_phone_number", "")
                        matched_restaurant["website"] = place_details.get("website", "")
                        matched_restaurant["total_ratings"] = place_details.get("user_ratings_total", 0)
                        matched_restaurant["opening_hours"] = place_details.get("opening_hours", {}).get("weekday_text", [])
                        matched_restaurant["review_summary"] = review_summary if review_summary else ""
                        
                except Exception as e:
                    logger.error(f"Could not fetch place details: {e}")
                    # Add default empty values
                    matched_restaurant["phone"] = ""
                    matched_restaurant["website"] = ""
                    matched_restaurant["total_ratings"] = 0
                    matched_restaurant["opening_hours"] = []
                    matched_restaurant["review_summary"] = ""
            else:
                logger.warning("No place_id available for matched restaurant")
                # Add default empty values when no place_id
                matched_restaurant["phone"] = ""
                matched_restaurant["website"] = ""
                matched_restaurant["total_ratings"] = 0
                matched_restaurant["opening_hours"] = []
                matched_restaurant["review_summary"] = ""
            
            result = {
                "identified_restaurant": matched_restaurant,
                "confidence": ai_result.get("confidence_score", 0),
                "reasoning": ai_result.get("reasoning", ""),
                "visible_clues": ai_result.get("visible_clues", []),
                "reviews": reviews[:5] if reviews else [],
                "total_reviews": len(reviews) if reviews else 0,
                "nearby_count": len(nearby_restaurants),
                "message": "Success" if matched_restaurant else "No match found"
            }
            
            logger.info(f"Request completed successfully. Identified: {matched_restaurant.get('name', 'Unknown') if matched_restaurant else 'None'}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.info("Using fallback mode - returning first restaurant from nearby list")
            
            # Use first restaurant (already has default values from extraction)
            fallback_restaurant = nearby_restaurants[0]
            
            return {
                "identified_restaurant": fallback_restaurant,
                "confidence": 30,
                "reasoning": "AI response could not be parsed. Defaulted to nearest restaurant.",
                "visible_clues": [],
                "reviews": [],
                "total_reviews": 0,
                "nearby_count": len(nearby_restaurants),
                "message": "Fallback mode - used nearest restaurant"
            }
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

