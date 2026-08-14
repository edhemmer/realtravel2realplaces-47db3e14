/**
 * Vehicle range input is intentionally withheld from user exposure.
 *
 * The stored profile fields remain available internally, but the only current
 * user-facing reason for collecting them was fuel-stop intelligence. That
 * intelligence is withheld until its route, range, recommendation, freshness,
 * and validation contracts are proven end-to-end.
 */
interface VehicleRangeCardProps {
  initialMilesPerTank?: number | null;
  initialTankSize?: number | null;
}

export function VehicleRangeCard(_props: VehicleRangeCardProps) {
  return null;
}
