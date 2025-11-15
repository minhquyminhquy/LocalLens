import SIK from 'SpectaclesInteractionKit.lspkg/SIK';

@component 
export class KeypointExample extends BaseScriptComponent {
  @input
  keypointPrefab: ObjectPrefab; // Prefab to instantiate on each keypoint

  // use handInputData from SIK to get hand data
  private handInputData = SIK.HandInputData;
  private leftHand = this.handInputData.getHand('left');
  private keypointSceneObject: SceneObject;

  onAwake() {
    this.onUpdatePrefabPosition();
  }

  private onUpdatePrefabPosition() {
    this.createEvent('UpdateEvent').bind(() => {
      if (this.leftHand.isTracked()) {
        // Hand is tracked - create prefab if it doesn't exist
        if (!this.keypointSceneObject) {
          this.keypointSceneObject = this.keypointPrefab.instantiate(
            this.getSceneObject()
          );
          print('Left hand tracked - instantiated keypoint prefab');
        }

        // Update position and rotation
        const transform = this.keypointSceneObject.getTransform();
        let indexTip = this.leftHand.indexTip;

        // Set position to keypoint position
        transform.setWorldPosition(indexTip.position);
        // Set rotation to keypoint rotation
        transform.setWorldRotation(indexTip.rotation);
      } else {
        // Hand is not tracked - destroy prefab if it exists
        if (this.keypointSceneObject) {
          this.keypointSceneObject.destroy();
          this.keypointSceneObject = null;
          print('Left hand lost - destroyed keypoint prefab');
        }
      }
    });
  }
}