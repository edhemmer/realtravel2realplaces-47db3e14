import UIKit
import Capacitor

class AppBridgeViewController: CAPBridgeViewController {
    private var startupFallbackShown = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            self?.verifyBundledWebAssets()
        }
    }

    private func verifyBundledWebAssets() {
        guard !startupFallbackShown else { return }

        let hasIndex = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") != nil
        let hasAssets = Bundle.main.url(forResource: "assets", withExtension: nil, subdirectory: "public") != nil

        if hasIndex && hasAssets { return }

        startupFallbackShown = true
        showStartupFallback(
            title: "App bundle is missing web assets",
            detail: "This TestFlight build was archived without the Capacitor web bundle. Run npm run ios:release, clean build in Xcode, then upload a new build."
        )
    }

    private func showStartupFallback(title: String, detail: String) {
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = UIColor(red: 0.03, green: 0.07, blue: 0.12, alpha: 1.0)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .fill
        stack.spacing = 14

        let eyebrow = UILabel()
        eyebrow.text = "RealTravel2RealPlaces"
        eyebrow.textColor = UIColor(red: 0.22, green: 0.74, blue: 0.93, alpha: 1.0)
        eyebrow.font = .systemFont(ofSize: 12, weight: .bold)
        eyebrow.textAlignment = .center

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 22, weight: .semibold)
        titleLabel.numberOfLines = 0
        titleLabel.textAlignment = .center

        let detailLabel = UILabel()
        detailLabel.text = detail
        detailLabel.textColor = UIColor(red: 0.79, green: 0.85, blue: 0.91, alpha: 1.0)
        detailLabel.font = .systemFont(ofSize: 15, weight: .regular)
        detailLabel.numberOfLines = 0
        detailLabel.textAlignment = .center

        stack.addArrangedSubview(eyebrow)
        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(detailLabel)
        overlay.addSubview(stack)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            stack.leadingAnchor.constraint(equalTo: overlay.safeAreaLayoutGuide.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: overlay.safeAreaLayoutGuide.trailingAnchor, constant: -28),
            stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
        ])
    }
}
