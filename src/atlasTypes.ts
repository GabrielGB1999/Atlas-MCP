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

/** Entity-reference minis (location/team/category/asset/file/customer/vendor/part all follow
 * this exact shape — id + name — verified against LocationMiniDTO, TeamMiniDTO, CategoryMiniDTO,
 * AssetMiniDTO, FileMiniDTO). */
export interface MiniDTO {
  id: number;
  name?: string;
}

/** dto/UserMiniDTO.java — NOT a MiniDTO: no combined "name" field, only firstName/lastName.
 * Use formatUserName() (src/util/format.ts) to render one for display. */
export interface UserMiniDTO {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

/** dto/workOrder/WorkOrderMiniDTO.java */
export interface WorkOrderMiniDTO {
  id: number;
  title: string;
  dueDate?: string | null;
  customId?: string | null;
  status: WorkOrderStatus;
  createdAt?: string | null;
}

/** model/enums/DiscrepancyStatus.java */
export type DiscrepancyStatus = "OPEN" | "CORRECTED" | "DEFERRED";

/** dto/WorkOrderDiscrepancyShowDTO.java + dto/AuditShowDTO.java.
 * Note: the originating work order is WRITE_ONLY on the entity and not exposed here — this DTO
 * is only ever fetched already scoped to one work order, via GET /work-order-discrepancies/work-order/{id}. */
export interface WorkOrderDiscrepancyShowDTO {
  id: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  description: string;
  correctiveMeasure?: string | null;
  status: DiscrepancyStatus;
  derivedWorkOrder?: WorkOrderMiniDTO | null;
}

/** dto/AssetShowDTO.java + dto/AuditShowDTO.java. `deprecation`/vendor/customer/part minis are
 * typed loosely (id + optional name) — their exact field lists weren't verified field-by-field
 * the way User/Location/Team/Category/Asset minis were. */
export interface AssetShowDTO {
  id: number;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archived: boolean;
  hasChildren: boolean;
  description?: string | null;
  image?: { id: number; url?: string } | null;
  location?: MiniDTO | null;
  parentAsset?: MiniDTO | null;
  area?: string | null;
  barCode?: string | null;
  nfcId?: string | null;
  category?: MiniDTO | null;
  name: string;
  primaryUser?: UserMiniDTO | null;
  assignedTo: UserMiniDTO[];
  teams: MiniDTO[];
  vendors: MiniDTO[];
  customers: MiniDTO[];
  deprecation?: unknown | null;
  warrantyExpirationDate?: string | null;
  inServiceDate?: string | null;
  additionalInfos?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  status: AssetStatus;
  acquisitionCost?: number | null;
  files: MiniDTO[];
  parts: MiniDTO[];
  power?: string | null;
  manufacturer?: string | null;
  customId?: string | null;
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
  primaryUser?: UserMiniDTO | null;
  assignedTo: UserMiniDTO[];
  customers: MiniDTO[];
  asset?: MiniDTO | null;
  files: MiniDTO[];
  image?: MiniDTO | null;
  completedBy?: UserMiniDTO | null;
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

/** dto/UserResponseDTO.java — only the fields this MCP actually uses (id/name), from GET /users/{id}. */
export interface UserResponseDTO {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
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
