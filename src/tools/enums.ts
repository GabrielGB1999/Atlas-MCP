/** Shared zod-friendly enum tuples, kept in sync with src/atlasTypes.ts. */

export const STATUS_VALUES = ["OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETE"] as const;
export const PRIORITY_VALUES = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;
export const ASSET_STATUS_VALUES = [
  "OPERATIONAL",
  "DOWN",
  "MODERNIZATION",
  "STANDBY",
  "INSPECTION_SCHEDULED",
  "COMMISSIONING",
  "EMERGENCY_SHUTDOWN",
] as const;
