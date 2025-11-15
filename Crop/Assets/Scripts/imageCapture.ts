import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
import { CameraService } from "./CameraService";

@component
export class imageCapture extends BaseScriptComponent {
    @input cameraService?: CameraService;
    @input cameraTexture?: Texture;

    private ImageQuality = CompressionQuality.HighQuality;
    private ImageEncoding = EncodingType.Jpg;
    private isEditor = global.deviceInfoSystem.isEditor();

    onAwake() {
        print("captureImage awake.");
    }

    onStart() {
      let handInputData = SIK.HandInputData;
      let leftHand = handInputData.getHand('left');
      let rightHand = handInputData.getHand('right');

      rightHand.onPinchDown.add(() => {
        // NOTE: Right hand pinch here
        this.captureFullScreen();
      });
    }

    private getCameraTexture(): Texture {
        // First, try to use the provided camera texture input
        if (this.cameraTexture) {
            return this.cameraTexture;
        }
        
        // Otherwise, try to get it from CameraService
        if (this.cameraService && this.cameraService.deviceCamTexture) {
            return this.cameraService.deviceCamTexture;
        }
        
        return null;
    }

    captureFullScreen() {
        const texture = this.getCameraTexture();
        
        if (!texture) {
            print("Error: Camera texture not available! Please assign cameraTexture input or cameraService.");
            return;
        }

        print("Capturing full-screen image...");

        // Encode texture to base64
        Base64.encodeTextureAsync(
            texture,
            (base64String: string) => {
                print("Full-screen image captured and encoded to base64!");
                print("Base64 length: " + base64String.length);
                print("Preview (first 100 chars): " + base64String.substring(0, 100) + "...");
                
                // TODO: Save base64String locally if needed
                // You can use PersistentStorageSystem or other storage methods here
                this.onImageCaptured(base64String);
            },
            () => {
                print("Failed to encode camera texture to base64!");
            },
            this.ImageQuality,
            this.ImageEncoding
        );
    }

    private onImageCaptured(base64String: string) {
        // Callback when image is successfully captured
        // Override this method or add additional logic here
        print("Image captured successfully. Base64 string is ready.");
        
        // Example: You could save to persistent storage here
        // PersistentStorageSystem.store("capturedImage", base64String);
    }
}