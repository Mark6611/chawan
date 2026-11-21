import Capacitor
import UIKit

// Capacitor doesn't auto-discover app-local plugins in the SPM setup, so they are
// registered explicitly here. The storyboard's root view controller points at this
// class instead of CAPBridgeViewController — and SceneDelegate's fallback builds
// this class too, or the plugin would be dropped with no crash.
class ViewController: CAPBridgeViewController {
	override func capacitorDidLoad() {
		bridge?.registerPluginInstance(HingePlugin())
	}
}
