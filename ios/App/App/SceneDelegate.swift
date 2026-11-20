import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // The scene manifest names Main.storyboard (UISceneStoryboardFile), so UIKit
        // has ALREADY built the window by the time this runs, rooted at the
        // storyboard's initial view controller (CAPBridgeViewController). That is
        // the same instantiation path every build before the scene lifecycle used.
        //
        // Capacitor's template builds a second window here instead, which throws
        // away the storyboard instance on every launch. The Buffy sibling measured
        // that and removed it (8e964ac); this follows the corrected shape.
        //
        // The fallback only runs if the storyboard key is ever removed from Info.plist.
        if window == nil {
            let fallback = UIWindow(windowScene: windowScene)
            fallback.rootViewController = CAPBridgeViewController()
            fallback.makeKeyAndVisible()
            window = fallback
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
