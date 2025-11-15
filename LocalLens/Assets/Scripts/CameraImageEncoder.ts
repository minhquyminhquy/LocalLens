@component
export class CameraImageEncoder extends BaseScriptComponent {
  @input deviceCamTexture: Texture;

  private isEditor = global.deviceInfoSystem.isEditor();
  private camTexture: Texture = null;
  private camModule: CameraModule =
    require("LensStudio:CameraModule") as CameraModule;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.start.bind(this));
  }

  start() {
    // Request camera access
    var camID = this.isEditor
      ? CameraModule.CameraId.Default_Color
      : CameraModule.CameraId.Right_Color;
    var camRequest = CameraModule.createCameraRequest();
    camRequest.cameraId = camID;
    camRequest.imageSmallerDimension = this.isEditor ? 352 : 756;
    this.camTexture = this.camModule.requestCamera(camRequest);
    var camTexControl = this.camTexture.control as CameraTextureProvider;
    camTexControl.onNewFrame.add(() => {});
    
    print("Camera initialized successfully");
  }


  captureAndEncodeToBase64(
    onSuccess: (base64String: string) => void,
    onError?: () => void,
    quality: CompressionQuality = CompressionQuality.HighQuality,
    encoding: EncodingType = EncodingType.Jpg
  ) {
    if (!this.camTexture) {
      print("Error: Camera texture not initialized");
      if (onError) {
        onError();
      }
      return;
    }

    print("Capturing camera image and encoding to base64...");
    
    // Encode the camera texture to base64
    Base64.encodeTextureAsync(
      this.camTexture,
      (base64String: string) => {
        print("Image encoded to base64 successfully!");
        onSuccess(base64String);
      },
      () => {
        print("Image encoding failed!");
        if (onError) {
          onError();
        }
      },
      quality,
      encoding
    );
  }

  getBase64DataUrl(
    onSuccess: (dataUrl: string) => void,
    onError?: () => void,
    quality: CompressionQuality = CompressionQuality.HighQuality,
    encoding: EncodingType = EncodingType.Jpg
  ) {
    this.captureAndEncodeToBase64(
      (base64String: string) => {
        const mimeType = encoding === EncodingType.Jpg ? "image/jpeg" : "image/png";
        const dataUrl = `data:${mimeType};base64,${base64String}`;
        onSuccess(dataUrl);
      },
      onError,
      quality,
      encoding
    );
  }


  getCameraTexture(): Texture | null {
    return this.camTexture;
  }
}

