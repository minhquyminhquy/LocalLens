import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
import { CameraImageEncoder } from "./CameraImageEncoder";
import { Location } from "./locationModule";
import { Frame } from 'SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame';

const API_BASE_URL = "https://restaurant-api-xztpop2o2q-lz.a.run.app";

export interface RestaurantInfo {
  name: string;
  rating: number;
  summary: string;
}

export interface IdentifyRestaurantParams {
  imageBase64: string;
  latitude: number;
  longitude: number;
}

@component
export class handMouseScript extends BaseScriptComponent {
  @input cameraImageEncoder: CameraImageEncoder;
  @input location: Location;

  private internetModule: InternetModule = require('LensStudio:InternetModule');

  // For the panel
  createContent() {
    const child = global.scene.createSceneObject('Child');
    child.setParent(this.sceneObject);
    const text = child.createComponent('Text');
    text.text = 'Frame!';
    text.size = 200;
    const screenTransform = child.createComponent('ScreenTransform');
    screenTransform.anchors = Rect.create(-1, 1, -1, 1);
    screenTransform.offsets.setSize(new vec2(15, 20));
    screenTransform.position = new vec3(0, 0, 0.01);
  }

  onAwake() {
    this.createEvent('OnStartEvent').bind(() => {
      this.onStart();
    });
  }

  onPressDownCallback() {
    print("Button presssed down");
  }

  private saveBase64ToLogs(base64String: string, label: string = "IMAGE_BASE64") {
    print(`========== START ${label} ==========`);
    print(`Length: ${base64String.length} characters`);
    print(`Timestamp: ${new Date().toISOString()}`);
    
    const chunkSize = 1000;
    let chunkIndex = 0;
    
    for (let i = 0; i < base64String.length; i += chunkSize) {
      const chunk = base64String.substring(i, i + chunkSize);
      print(`[${label}_CHUNK_${chunkIndex}]:${chunk}`);
      chunkIndex++;
    }
    
    print(`========== END ${label} (${chunkIndex} chunks) ==========`);
  }

  private async saveBase64ToTestEndpoint(
    base64String: string,
    testEndpoint?: string
  ) {
    if (!testEndpoint) {
      // Default: just log it
      this.saveBase64ToLogs(base64String);
      return;
    }

    try {
      const requestBody = JSON.stringify({
        image_base64: base64String,
        timestamp: new Date().toISOString(),
      });

      const request = new Request(testEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      const response = await this.internetModule.fetch(request);
      if (response.status === 200) {
        print("Base64 image saved to test endpoint successfully!");
      } else {
        print(`Failed to save to test endpoint: ${response.status}`);
        // Fallback to logs
        this.saveBase64ToLogs(base64String);
      }
    } catch (error) {
      print("Error saving to test endpoint, falling back to logs");
      this.saveBase64ToLogs(base64String);
    }
  }

  /**
   * Constructs a multipart/form-data body manually
   * @param params - Form fields to include
   * @param boundary - Multipart boundary string
   * @returns Formatted multipart body string
   */
  private constructMultipartBody(
    params: { [key: string]: string | number },
    boundary: string
  ): string {
    let body = "";

    for (const key in params) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${params[key]}\r\n`;
    }

    body += `--${boundary}--\r\n`;
    return body;
  }

  /**
   * Identifies a restaurant from a base64 image and GPS coordinates
   * @param params - Base64 image string and GPS coordinates
   * @returns Restaurant name, rating, and AI-generated summary
   * @throws Error if the API request fails
   */
  async identifyRestaurant(
    params: IdentifyRestaurantParams
  ): Promise<RestaurantInfo> {
    const { imageBase64, latitude, longitude } = params;
    try {
      // Create boundary for multipart/form-data
      const boundary = `----SnapBoundary${Date.now()}`;

      // Construct multipart body
      const body = this.constructMultipartBody(
        {
          latitude: latitude,
          longitude: longitude,
          image_base64: imageBase64,
        },
        boundary
      );

      // Make API request using InternetModule
      const request = new Request(`${API_BASE_URL}/identify-restaurant`, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      });

      print("Sending API request...");
      const response = await this.internetModule.fetch(request);

      print(`Response status: ${response.status}`);

      if (response.status !== 200) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const text = await response.text();
      print("Response received: " + text.substring(0, 200)); // Print first 200 chars for debugging
      
      const data = JSON.parse(text);
      
      const restaurant = data.identified_restaurant;

      if (!restaurant) {
        throw new Error("No restaurant data found in API response");
      }

      return {
        name: restaurant.name || "Unknown Restaurant",
        rating: restaurant.rating || 0,
        summary: restaurant.review_summary || "No summary available",
      };
    } catch (error) {
      if (error instanceof Error) {
        print("Error details: " + error.message);
        throw new Error(`Failed to identify restaurant: ${error.message}`);
      }
      throw new Error("Failed to identify restaurant: Unknown error");
    }
  }

  onStart() {
    let handInputData = SIK.HandInputData;

    let leftHand = handInputData.getHand('left');
    let rightHand = handInputData.getHand('right');

    leftHand.onPinchDown.add(() => {
      // Left hand pinch handler (if needed)
      print("Left hand pinched down");

      // const frameObject = global.scene.createSceneObject('FrameTest');
      //frameObject.setParent(this.sceneObject);
  
      //const frame = new Frame();
      //frame.sceneObject = frameObject;
      //frame.initialize();
      //frame.innerSize = new vec2(15, 20);

      // this.createContent();
    });

    rightHand.onPinchDown.add(() => {
      print("Right hand pinched down");
      
      // Get location data
      let locationData = null;
      if (this.location) {
        locationData = this.location.getCurrentLocation();
        if (locationData) {
          print("Location - Latitude: " + locationData.latitude + ", Longitude: " + locationData.longitude);
        } else {
          print("Location data not available yet");
        }
      } else {
        print("Warning: Location component not assigned!");
      }
      
      // Capture and encode image
      if (this.cameraImageEncoder) {
        print("Capturing image...");
        this.cameraImageEncoder.captureAndEncodeToBase64(
          (base64String: string) => {
            print("Image captured successfully!");
            print("Base64 length: " + base64String.length + " characters");
            
            // Save base64 to logs for testing (comment out if not needed)
            //this.saveBase64ToLogs(base64String, "TEST_IMAGE");
            
            if (locationData) {
              // Send to API
              if (this.internetModule) {
                print("Sending request to restaurant identification API...");
                print("  Latitude: " + locationData.latitude);
                print("  Longitude: " + locationData.longitude);
                
                this.identifyRestaurant({
                  imageBase64: base64String,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                })
                  .then((restaurantInfo: RestaurantInfo) => {
                    print("========================================");
                    print("Restaurant identified successfully!");
                    print("  Name: " + restaurantInfo.name);
                    print("  Rating: " + restaurantInfo.rating);
                    print("  Summary: " + restaurantInfo.summary);
                    print("========================================");
                    
                    // TODO: Display restaurantInfo in AR UI
                    // You can use restaurantInfo here for further processing
                    print("Creating Restaurant Panel......");
                    this.createRestaurantPanel(restaurantInfo);
                  })
                  .catch((error: Error) => {
                    print("========================================");
                    print("ERROR identifying restaurant:");
                    print(error.message);
                    print("========================================");
                  });
              } else {
                print("Error: InternetModule not assigned!");
              }
            } else {
              print("Warning: Cannot send API request - location data not available");
            }
          },
          () => {
            print("Failed to capture and encode image");
          }
        );
      } else {
        print("Error: CameraImageEncoder not assigned!");
      }
    });

    
  }

  /**
   * Creates a popup panel displaying restaurant information
   * @param restaurantInfo - Restaurant data to display
   */
  private createRestaurantPanel(restaurantInfo: RestaurantInfo) {
    // Create main panel object
    const panelObject = global.scene.createSceneObject('RestaurantPanel');
    panelObject.setParent(this.sceneObject);
    
    // Add Frame component for the panel background
    const frame = panelObject.createComponent(Frame.getTypeName());
    frame.initialize();
    frame.innerSize = new vec2(30, 25);
    
    // Position the panel in front of the camera
    const screenTransform = panelObject.createComponent('ScreenTransform');
    screenTransform.anchors = Rect.create(-0.5, 0.5, -0.5, 0.5);
    screenTransform.offsets = Rect.create(-15, 15, -12.5, 12.5);
    screenTransform.position = new vec3(0, 0, 10);
    
    // Create restaurant name (top-left)
    const nameObject = global.scene.createSceneObject('RestaurantName');
    nameObject.setParent(panelObject);
    const nameText = nameObject.createComponent('Text') as Text;
    nameText.text = restaurantInfo.name;
    nameText.size = 60;
    nameText.horizontalAlignment = HorizontalAlignment.Left;
    nameText.verticalAlignment = VerticalAlignment.Top;
    
    const nameTransform = nameObject.createComponent('ScreenTransform');
    nameTransform.anchors = Rect.create(-1, 1, 0, 1);
    nameTransform.offsets = Rect.create(1, 14, -3, -1);
    nameTransform.position = new vec3(0, 0, 0.01);
    
    // Create rating (top-right)
    const ratingObject = global.scene.createSceneObject('RestaurantRating');
    ratingObject.setParent(panelObject);
    const ratingText = ratingObject.createComponent('Text') as Text;
    ratingText.text = '⭐ ' + restaurantInfo.rating.toFixed(1);
    ratingText.size = 60;
    ratingText.horizontalAlignment = HorizontalAlignment.Right;
    ratingText.verticalAlignment = VerticalAlignment.Top;
    
    const ratingTransform = ratingObject.createComponent('ScreenTransform');
    ratingTransform.anchors = Rect.create(0, 1, 0, 1);
    ratingTransform.offsets = Rect.create(-14, -1, -3, -1);
    ratingTransform.position = new vec3(0, 0, 0.01);
    
    // Create summary (below name/rating, expanding downward)
    const summaryObject = global.scene.createSceneObject('RestaurantSummary');
    summaryObject.setParent(panelObject);
    const summaryText = summaryObject.createComponent('Text') as Text;
    summaryText.text = restaurantInfo.summary;
    summaryText.size = 45;
    summaryText.horizontalAlignment = HorizontalAlignment.Left;
    summaryText.verticalAlignment = VerticalAlignment.Top; // top align so text expands downward
    summaryText.horizontalOverflow = HorizontalOverflow.Wrap;
    
    const summaryTransform = summaryObject.createComponent('ScreenTransform');
    summaryTransform.anchors = Rect.create(-1, 1, 0, -1); 
    summaryTransform.offsets = Rect.create(1, -1, -2, -1); 
    summaryTransform.position = new vec3(0, 0, 0.01);
    
    print("Restaurant panel created successfully!");
  }
}