import { SIK } from "SpectaclesInteractionKit.lspkg/SIK";
import { imageCapture } from "./imageCapture";
@component
export class handMouseScript extends BaseScriptComponent {


  onAwake() {
    this.createEvent('OnStartEvent').bind(() => {
      this.onStart();
    });
  }

  onPressDownCallback() {
    print("Button presssed down");
  }

  onStart() {
    // Retrieve HandInputData from SIK's definitions.
    let handInputData = SIK.HandInputData;

    // Fetch the TrackedHand for left and right hands.
    let leftHand = handInputData.getHand('left');
    let rightHand = handInputData.getHand('right');

    // Add print callbacks for whenever these hands pinch.
    leftHand.onPinchDown.add(() => {
      //print(
      //  `The left hand has pinched. The tip of the left index finger is: ${leftHand.indexTip.position}.`
      //);
      // capture Image here
    });
    rightHand.onPinchDown.add(() => {
      // action when rightHand pitch
      //print(
      //  `The right hand has pinched. The tip of the right index finger is: ${rightHand.indexTip.position}.`
      //);

      // Capture image when right hand pinches down
      print("Right hand pinched down");
    });
  }
}
 