export type PlatformId = 'sq' | 'sc';
export type FieldValueType = 'string' | 'number' | 'boolean' | 'mixed' | 'unknown';
export type FieldSemanticType = 'dimension' | 'version' | 'count' | 'metric' | 'boolean';
export type SnapshotSource = 'empty' | 'sample' | 'redshift';

export interface DistributionValue {
  value: string;
  count: number;
  percent: number;
}

export interface NumericSummary {
  numericRows: number;
  zeroRows: number;
  positiveRows: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
}

export interface FieldCoverage {
  total: number;
  nonNull: number;
  percent: number;
  distinct: number;
}

export interface FieldSummary {
  key: string;
  columnName: string;
  displayName: string;
  path: string[];
  category: string;
  valueType: FieldValueType;
  semanticType: FieldSemanticType;
  redshiftType: string;
  coverage: FieldCoverage;
  topValues: DistributionValue[];
  tokenValues?: DistributionValue[];
  valueListTruncated: boolean;
  numeric?: NumericSummary;
}

export interface CatalogField {
  key: string;
  columnName: string;
  displayName: string;
  path: string[];
  category: string;
  availability: Record<PlatformId, boolean>;
  redshiftTypes: Partial<Record<PlatformId, string>>;
}

export interface ModuleTypeOverview {
  projectsWithTelemetry: number;
  totalEsmFiles: number;
  totalCjsFiles: number;
  esmOnlyProjects: number;
  cjsOnlyProjects: number;
  bothProjects: number;
  neitherProjects: number;
}

export interface ProgramCreationVersionOverview {
  version: string;
  projects: number;
  projectsWithFailures: number;
  attempts: number;
  succeeded: number;
  failed: number;
}

export interface ProgramCreationOverview {
  projects: number;
  projectsWithFailures: number;
  attempts: number;
  succeeded: number;
  failed: number;
  byVersion: ProgramCreationVersionOverview[];
  atOrAboveVersion: ProgramCreationVersionOverview[];
}

export interface TimelinePoint {
  weekStart: string;
  projects: number;
}

export interface VersionTimelineSeries {
  value: string;
  totalProjects: number;
  weekly: TimelinePoint[];
}

export interface VersionTimeline {
  weeks: TimelinePoint[];
  series: VersionTimelineSeries[];
}

export interface PlatformTimelineOverview {
  nodeMajorVersion?: VersionTimeline;
  typescriptVersion?: VersionTimeline;
}

export interface SnapshotOverview {
  moduleType?: Partial<Record<PlatformId, ModuleTypeOverview>>;
  programCreation?: Partial<Record<PlatformId, ProgramCreationOverview>>;
  timelines?: Partial<Record<PlatformId, PlatformTimelineOverview>>;
}

export interface PlatformSnapshot {
  id: PlatformId;
  label: string;
  shortLabel: string;
  view: string;
  latestProjectCount: number;
  fieldCount: number;
  fields: Record<string, FieldSummary>;
}

export interface TelemetrySnapshot {
  generatedAt: string;
  source: SnapshotSource;
  windowDays: number;
  windowStart: string;
  notes: string[];
  platforms: Record<PlatformId, PlatformSnapshot>;
  catalog: CatalogField[];
  overview?: SnapshotOverview;
}
