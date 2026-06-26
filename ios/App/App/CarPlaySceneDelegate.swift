import CarPlay
import Foundation
import UIKit

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private var currentState: CarPlayDriveState?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        currentState = CarPlayDriveStore.shared.load()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDriveStateChanged),
            name: CarPlayDriveStore.stateChangedNotification,
            object: nil
        )

        renderRootTemplate()
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        NotificationCenter.default.removeObserver(self)
        self.interfaceController = nil
    }

    @objc private func handleDriveStateChanged() {
        currentState = CarPlayDriveStore.shared.load()
        renderRootTemplate()
    }

    private func renderRootTemplate() {
        guard let interfaceController else { return }

        let state = currentState
        let stops = state?.stops ?? []
        let widgets = state?.widgets ?? []
        var sections: [CPListSection] = []

        if !widgets.isEmpty {
            let widgetItems = widgets.prefix(6).map { widget in
                CPListItem(text: widget.label, detailText: widget.value)
            }
            sections.append(CPListSection(items: widgetItems, header: "Drive Cockpit", sectionIndexTitle: nil))
        }

        if stops.isEmpty {
            let detail = state == nil
                ? "Open a drive trip on iPhone to load route, weather, fuel, and next stops."
                : "Open Drive Cockpit to sync route stops, weather, fuel, and road context."
            let empty = CPListItem(text: "Sync Drive Cockpit", detailText: detail)
            empty.handler = { _, completion in
                completion()
            }
            sections.append(CPListSection(items: [empty], header: "Next Stops", sectionIndexTitle: nil))
        } else {
            let items = stops.prefix(12).map { stop in
                let detailParts = [stop.etaText, stop.subtitle, stop.address].compactMap { value in
                    let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
                    return trimmed?.isEmpty == false ? trimmed : nil
                }
                let item = CPListItem(text: stop.title, detailText: detailParts.joined(separator: " - "))
                item.handler = { _, completion in
                    CarPlayDriveStore.shared.select(stop: stop)
                    self.presentSelectedStop(stop)
                    completion()
                }
                return item
            }
            sections.append(CPListSection(items: items, header: "Next Stops", sectionIndexTitle: nil))
        }

        let template = CPListTemplate(
            title: state?.tripName ?? "RealTravel Drive",
            sections: sections
        )
        template.tabTitle = "Drive"
        template.tabImage = UIImage(systemName: "car.fill")
        interfaceController.setRootTemplate(template, animated: true)
    }

    private func presentSelectedStop(_ stop: CarPlayStop) {
        guard let interfaceController else { return }

        let detailParts = [stop.etaText, stop.subtitle, stop.address].compactMap { value in
            let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed?.isEmpty == false ? trimmed : nil
        }

        let template = CPInformationTemplate(
            title: stop.title,
            layout: .leading,
            items: [
                CPInformationItem(title: "Next stop", detail: detailParts.joined(separator: "\n")),
            ],
            actions: [
                CPTextButton(title: "Done", textStyle: .normal) { _ in
                    interfaceController.popTemplate(animated: true)
                },
            ]
        )

        interfaceController.pushTemplate(template, animated: true)
    }
}
