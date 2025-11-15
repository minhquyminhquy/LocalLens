require('LensStudio:RawLocationModule');

@component
export class LocationExample extends BaseScriptComponent {
  latitude: number;
  longitude: number;
  altitude: number;
  horizontalAccuracy: number;
  verticalAccuracy: number;
  timestamp: Date;
  locationSource: string;

  private repeatUpdateUserLocation: DelayedCallbackEvent;
  private locationService: LocationService;
  onAwake() {
    this.createEvent('OnStartEvent').bind(() => {
      this.createAndLogLocationAndHeading();
    });

    this.repeatUpdateUserLocation = this.createEvent('DelayedCallbackEvent');
    this.repeatUpdateUserLocation.bind(() => {
      this.locationService.getCurrentPosition(
        function (geoPosition) {
          if (
            this.timestamp === undefined ||
            this.timestamp.getTime() != geoPosition.timestamp.getTime()
          ) {
            this.latitude = geoPosition.latitude;
            this.longitude = geoPosition.longitude;
            this.horizontalAccuracy = geoPosition.horizontalAccuracy;
            this.verticalAccuracy = geoPosition.verticalAccuracy;
            print('long: ' + this.longitude);
            print('lat: ' + this.latitude);
            this.timestamp = geoPosition.timestamp;
          }
        },
        function (error) {
          print(error);
        }
      );
      this.repeatUpdateUserLocation.reset(1.0);
    });
  }
  createAndLogLocationAndHeading() {
    this.locationService = GeoLocation.createLocationService();
    this.locationService.accuracy = GeoLocationAccuracy.Navigation;

    var onOrientationUpdate = function (northAlignedOrientation) {
      let heading = GeoLocation.getNorthAlignedHeading(northAlignedOrientation);
      //print('Heading orientation: ' + heading.toFixed(3));
      var rotation = (heading * Math.PI) / 180;
      //print('Screen transform rotation: ' + quat.fromEulerAngles(0, 0, rotation));
    };
    this.locationService.onNorthAlignedOrientationUpdate.add(
      onOrientationUpdate
    );

    this.repeatUpdateUserLocation.reset(0.0);
  }
}