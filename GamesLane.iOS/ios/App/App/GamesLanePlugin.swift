import AudioToolbox
import AuthenticationServices
import Capacitor
import UIKit

/// The app's own features for the site, which calls them as `window.Capacitor.Plugins.GamesLane` (see common.js):
/// signing in with a provider in Apple's sign-in window, and vibrating when the user's turn comes.
@objc(GamesLanePlugin)
public class GamesLanePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GamesLanePlugin"
    public let jsName = "GamesLane"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vibrate", returnType: CAPPluginReturnPromise)
    ]

    /// The URL scheme the server returns to when a sign-in ends (AuthSetup.AppScheme).
    private static let callbackScheme = "gameslane"

    private var session: ASWebAuthenticationSession?

    /// Opens `url` (the server's /auth/signin/{provider}?app=true) in Apple's sign-in window, and resolves with
    /// `{ url }`, the gameslane:// address the server ended the sign-in with. Rejects with the code CANCELLED when the
    /// user closes the window.
    @objc func signIn(_ call: CAPPluginCall) {
        guard let address = call.getString("url"), let url = URL(string: address), url.scheme == "https" || url.scheme == "http" else {
            call.reject("A sign-in address is required.")
            return
        }

        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { [weak self] callbackURL, error in
                self?.session = nil
                if let callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.reject("Sign-in was cancelled.", "CANCELLED")
                } else {
                    call.reject("Sign-in did not complete.", nil, error)
                }
            }
            session.presentationContextProvider = self
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("Sign-in could not start.")
            }
        }
    }

    /// Vibrates the phone once.
    @objc func vibrate(_ call: CAPPluginCall) {
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        call.resolve()
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.webView?.window ?? ASPresentationAnchor()
    }
}

/// The app's screen: Capacitor's web view, with the GamesLane plugin.
class GamesLaneViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GamesLanePlugin())
    }
}
