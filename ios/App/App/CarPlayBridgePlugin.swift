import Foundation
import Capacitor

@objc(CarPlayBridgePlugin)
public class CarPlayBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CarPlayBridgePlugin"
    public let jsName = "CarPlayBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "publishDriveState", returnType: CAPPluginReturnPromise),
    ]

    @objc func publishDriveState(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload"),
              let data = payload.data(using: .utf8),
              let state = try? JSONDecoder().decode(CarPlayDriveState.self, from: data) else {
            call.reject("Invalid CarPlay drive state payload")
            return
        }

        CarPlayDriveStore.shared.save(state: state)
        call.resolve(["ok": true])
    }
}
