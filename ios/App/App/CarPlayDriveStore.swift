import Foundation

struct CarPlayStop: Codable {
    let id: String
    let title: String
    let subtitle: String?
    let address: String?
    let etaText: String?
}

struct CarPlayWidget: Codable {
    let id: String
    let label: String
    let value: String
    let tone: String?
}

struct CarPlayDriveState: Codable {
    let tripId: String
    let tripName: String
    let destination: String?
    let updatedAt: String
    let widgets: [CarPlayWidget]?
    let stops: [CarPlayStop]
}

final class CarPlayDriveStore {
    static let shared = CarPlayDriveStore()

    static let stateChangedNotification = Notification.Name("RT2RPCarPlayDriveStateChanged")
    private let stateKey = "rt2rp.carplay.driveState"
    private let selectedStopKey = "rt2rp.carplay.selectedStop"

    private init() {}

    func save(state: CarPlayDriveState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults.standard.set(data, forKey: stateKey)
        NotificationCenter.default.post(name: Self.stateChangedNotification, object: nil)
    }

    func load() -> CarPlayDriveState? {
        guard let data = UserDefaults.standard.data(forKey: stateKey) else { return nil }
        return try? JSONDecoder().decode(CarPlayDriveState.self, from: data)
    }

    func select(stop: CarPlayStop) {
        guard let data = try? JSONEncoder().encode(stop) else { return }
        UserDefaults.standard.set(data, forKey: selectedStopKey)
    }
}
