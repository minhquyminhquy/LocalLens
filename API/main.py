import os
import json
import base64
from typing import Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from dotenv import load_dotenv
import googlemaps
import google.generativeai as genai
from PIL import Image
import io

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
    try:
        # Validate that at least one image input is provided
        if not file and not image_base64:
            raise HTTPException(
                status_code=400, 
                detail="Either 'file' or 'image_base64' must be provided"
            )
        
        if file and image_base64:
            raise HTTPException(
                status_code=400,
                detail="Provide either 'file' or 'image_base64', not both"
            )
        
        # Load image from either source
        if file:
            # Read uploaded file
            image_data = await file.read()
        else:
            # Decode base64 string
            try:
                # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
                if ',' in image_base64:
                    image_base64 = image_base64.split(',', 1)[1]
                image_data = base64.b64decode(image_base64)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid base64 image data: {str(e)}"
                )
        
        # Search for nearby restaurants
        places_result = gmaps.places_nearby(
            location=(latitude, longitude),
            radius=100,
            type="restaurant"
        )
        
        # Extract restaurant data
        nearby_restaurants = [
            {
                "name": place.get("name"),
                "address": place.get("vicinity", ""),
                "rating": place.get("rating"),
                "place_id": place.get("place_id"),
                "types": place.get("types", []),
                "location": place.get("geometry", {}).get("location", {})
            }
            for place in places_result.get("results", [])
        ]
        
        if not nearby_restaurants:
            return {
                "error": "No restaurants found within 100m",
                "nearby_count": 0
            }
        
        # Open image using PIL
        image = Image.open(io.BytesIO(image_data))
        
        # Analyze image with Gemini AI
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create restaurant list for AI
        restaurant_list = "\n".join([
            f"{i+1}. {r['name']} - {r['address']}"
            for i, r in enumerate(nearby_restaurants)
        ])
        
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

        response = model.generate_content([prompt, image])
        response_text = response.text
        
        # Parse AI response
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            ai_result = json.loads(response_text[start_idx:end_idx])
            
            # Find matching restaurant
            identified_name = ai_result.get("identified_restaurant", "")
            identified_id = ai_result.get("restaurant_id", "")
            matched_restaurant = None
            
            for restaurant in nearby_restaurants:
                name_match = restaurant["name"].lower() in identified_name.lower() or \
                             identified_name.lower() in restaurant["name"].lower()
                id_match = restaurant["place_id"] == identified_id
                
                if name_match or id_match:
                    matched_restaurant = restaurant
                    break
            
            # Fetch place details and reviews
            reviews = []
            review_summary = ""
            
            if matched_restaurant and matched_restaurant.get("place_id"):
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
                        
                        # Get 5 most recent reviews
                        all_reviews = place_details.get("reviews", [])
                        sorted_reviews = sorted(all_reviews, key=lambda x: x.get("time", 0), reverse=True)
                        reviews = sorted_reviews[:5]
                        
                        # Generate review summary
                        if reviews:
                            review_texts = "\n\n".join([
                                f"Rating: {r.get('rating')}/5\n{r.get('text', '')}"
                                for r in reviews
                            ])
                            
                            summary_prompt = f"""Summarize these reviews in 2-3 sentences:

{review_texts}"""

                            summary_model = genai.GenerativeModel('gemini-2.0-flash-exp')
                            summary_response = summary_model.generate_content(summary_prompt)
                            review_summary = summary_response.text.strip()
                            
                            print(f"\n📝 Review Summary:\n{review_summary}\n{'='*80}\n")
                        
                        # Add details to matched restaurant
                        matched_restaurant["phone"] = place_details.get("formatted_phone_number")
                        matched_restaurant["website"] = place_details.get("website")
                        matched_restaurant["total_ratings"] = place_details.get("user_ratings_total")
                        matched_restaurant["opening_hours"] = place_details.get("opening_hours", {}).get("weekday_text", [])
                        matched_restaurant["review_summary"] = review_summary
                        
                except Exception as e:
                    print(f"Could not fetch place details: {e}")
            
            return {
                "identified_restaurant": matched_restaurant,
                "confidence": ai_result.get("confidence_score", 0),
                "reasoning": ai_result.get("reasoning", ""),
                "visible_clues": ai_result.get("visible_clues", []),
                "reviews": reviews[:5],
                "total_reviews": len(reviews),
                "nearby_count": len(nearby_restaurants),
                "message": "Success" if matched_restaurant else "No match found"
            }
            
        except json.JSONDecodeError:
            return {
                "identified_restaurant": nearby_restaurants[0] if nearby_restaurants else None,
                "confidence": 50,
                "reasoning": response_text,
                "nearby_count": len(nearby_restaurants),
                "message": "Fallback mode"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

