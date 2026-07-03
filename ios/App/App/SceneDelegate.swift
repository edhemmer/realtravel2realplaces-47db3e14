import UIKit
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private let webDataClearKey = "rt2rp.webDataClearedForBundledIos.v1"

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        window.backgroundColor = UIColor(red: 0.03, green: 0.07, blue: 0.12, alpha: 1.0)
        window.rootViewController = makeStartupViewController()
        self.window = window
        window.makeKeyAndVisible()

        clearLegacyWebDataIfNeeded {
            window.rootViewController = AppBridgeViewController()
        }
    }

    private func clearLegacyWebDataIfNeeded(completion: @escaping () -> Void) {
        if UserDefaults.standard.bool(forKey: webDataClearKey) {
            completion()
            return
        }

        let dataStore = WKWebsiteDataStore.default()
        let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
        dataStore.removeData(ofTypes: dataTypes, modifiedSince: Date.distantPast) {
            UserDefaults.standard.set(true, forKey: self.webDataClearKey)
            DispatchQueue.main.async {
                completion()
            }
        }
    }

    private func makeStartupViewController() -> UIViewController {
        let viewController = UIViewController()
        viewController.view.backgroundColor = UIColor(red: 0.03, green: 0.07, blue: 0.12, alpha: 1.0)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12

        let title = UILabel()
        title.text = "RealTravel2RealPlaces"
        title.textColor = .white
        title.font = .systemFont(ofSize: 22, weight: .semibold)

        let subtitle = UILabel()
        subtitle.text = "Preparing your travel command center"
        subtitle.textColor = UIColor(red: 0.79, green: 0.85, blue: 0.91, alpha: 1.0)
        subtitle.font = .systemFont(ofSize: 14, weight: .regular)

        stack.addArrangedSubview(title)
        stack.addArrangedSubview(subtitle)
        viewController.view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: viewController.view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: viewController.view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: viewController.view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
        ])

        return viewController
    }
}
