/**
 * Mirrors of the real Atlas CMMS API shapes (api/src/main/java/com/grash/...).
 * Verified directly against the Java source — do not "correct" these back to
 * more conventional-sounding enum names without re-checking the API.
 */

/** model/enums/Status.java */
export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE";

/** model/enums/Priority.java */
export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/** model/enums/AssetStatus.java */
export type AssetStatus =
  | "OPERATIONAL"
  | "DOWN"
  | "MODERNIZATION"
  | "STANDBY"
  | "INSPECTION_SCHEDULED"
  | "COMMISSIONING"
  | "EMERGENCY_SHUTDOWN";

export interface IdRef {
  id: number;
}

/** advancedsearch/EnumName.java — required on "in"/"ge"/"le" filters over enum or date columns,
 * or the server compares the raw string/against the wrong Java type and the filter silently
 * matches nothing (enum) or the date parse silently returns null (JS_DATE). */
export type EnumName = "PRIORITY" | "STATUS" | "JS_DATE";

/** advancedsearch/SearchCriteria.java */
export interface FilterField {
  field: string;
  value: unknown;
  operation: "eq" | "ne" | "in" | "inm" | "ge" | "le" | "gt" | "lt" | string;
  values: unknown[];
  enumName?: EnumName;
  /** Required alongside operation "inm" (many-to-many IN via a join). */
  joinType?: "INNER" | "LEFT" | "RIGHT";
}

/** Exact format required by Helper.getDateFromJsString: yyyy-MM-dd'T'HH:mm:ss.SSS'Z'.
 * This is precisely what JS Date#toISOString() produces. Any other format parses to `null`
 * with no error, and the filter is silently dropped. */
export function toApiDateString(date: Date): string {
  return date.toISOString();
}

export interface SearchCriteria {
  filterFields: FilterField[];
  direction: "ASC" | "DESC";
  pageNum: number;
  pageSize: number;
  sortField: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index
  size: number;
}

interface MiniDTO {
  id: number;
  name?: string;
}

/** dto/WorkOrderBaseShowDTO.java + dto/workOrder/WorkOrderShowDTO.java */
export interface WorkOrderShowDTO {
  id: number;
  dueDate?: string | null;
  priority: Priority;
  estimatedDuration: number;
  estimatedStartDate?: string | null;
  description?: string | null;
  title: string;
  requiredSignature: boolean;
  category?: MiniDTO | null;
  location?: MiniDTO | null;
  team?: MiniDTO | null;
  primaryUser?: MiniDTO | null;
  assignedTo: MiniDTO[];
  customers: MiniDTO[];
  asset?: MiniDTO | null;
  files: MiniDTO[];
  image?: MiniDTO | null;
  completedBy?: MiniDTO | null;
  completedOn?: string | null;
  archived: boolean;
  parentRequest?: MiniDTO | null;
  parentPreventiveMaintenance?: MiniDTO | null;
  signature?: { id: number; url?: string } | null;
  legacySignature?: string | null;
  status: WorkOrderStatus;
  feedback?: string | null;
  audioDescription?: { id: number; url?: string } | null;
  customId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** dto/workOrder/WorkOrderPostDTO.java (extends the full WorkOrder entity) */
export interface WorkOrderPostBody {
  title: string;
  description?: string;
  priority?: Priority;
  status?: WorkOrderStatus;
  dueDate?: string;
  estimatedDuration?: number;
  estimatedStartDate?: string;
  requiredSignature?: boolean;
  customId?: string;
  location?: IdRef;
  team?: IdRef;
  category?: IdRef;
  asset?: IdRef;
  primaryUser?: IdRef;
  assignedTo?: IdRef[];
  assetStatus?: AssetStatus;
}

/** dto/workOrder/WorkOrderPatchDTO.java + dto/WorkOrderBasePatchDTO.java */
export interface WorkOrderPatchBody {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  estimatedDuration?: number;
  estimatedStartDate?: string;
  requiredSignature?: boolean;
  location?: IdRef;
  team?: IdRef;
  category?: IdRef;
  asset?: IdRef;
  primaryUser?: IdRef;
  assignedTo?: IdRef[];
  customers?: IdRef[];
  files?: IdRef[];
  image?: IdRef;
  archived?: boolean;
  completedOn?: string;
}

/** dto/WorkOrderChangeStatusDTO.java — note: no completedBy field on this endpoint. */
export interface WorkOrderChangeStatusBody {
  status: WorkOrderStatus;
  signature?: string;
  feedback?: string;
}

export interface SigninRequest {
  email: string;
  password: string;
  type: "client";
}

export interface SigninResponse {
  accessToken: string;
  [key: string]: unknown;
}
