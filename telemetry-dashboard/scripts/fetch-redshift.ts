import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Client } from 'pg';
import type {
  CatalogField,
  DistributionValue,
  FieldSemanticType,
  FieldSummary,
  FieldValueType,
  ModuleTypeOverview,
  PlatformTimelineOverview,
  PlatformId,
  PlatformSnapshot,
  ProgramCreationOverview,
  ProgramCreationVersionOverview,
  TelemetrySnapshot,
  VersionTimeline,
} from '../src/types.js';
import { createClient } from './redshift.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'latest.json');
const WINDOW_DAYS = parsePositiveInt(process.env.TELEMETRY_WINDOW_DAYS, 21);
const TIMELINE_WEEKS = parsePositiveInt(process.env.TELEMETRY_TIMELINE_WEEKS, 12);
const TOP_VALUES_LIMIT = parsePositiveInt(process.env.TELEMETRY_TOP_VALUES_LIMIT, 24);
const TOKEN_VALUES_LIMIT = 16;
const TIMELINE_SPLIT_LIMIT = parsePositiveInt(process.env.TELEMETRY_TIMELINE_SPLIT_LIMIT, 16);
const VERSION_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const PLATFORMS = [
  {
    id: 'sq',
    label: 'SonarQube Server',
    shortLabel: 'SQS',
    tableName: 'sq_analysis_javascript_adhoc',
    view: 'measures.sq_analysis_javascript_adhoc',
  },
  {
    id: 'sc',
    label: 'SonarQube Cloud',
    shortLabel: 'SQC',
    tableName: 'sc_analysis_javascript_adhoc',
    view: 'measures.sc_analysis_javascript_adhoc',
  },
] as const satisfies ReadonlyArray<{
  id: PlatformId;
  label: string;
  shortLabel: string;
  tableName: string;
  view: string;
}>;

interface ColumnRow {
  column_name: string;
  data_type: string;
  ordinal_position: string | number;
}

interface ColumnMeta {
  columnName: string;
  redshiftType: string;
  ordinalPosition: number;
}

interface AggregateRow extends Record<string, string | number | null> {
  total_rows: string | number;
}

interface DistributionRow {
  value: string;
  row_count: string | number;
}

interface ModuleTypeRow {
  projects_with_telemetry: string | number | null;
  total_esm_files: string | number | null;
  total_cjs_files: string | number | null;
  esm_only_projects: string | number | null;
  cjs_only_projects: string | number | null;
  both_projects: string | number | null;
  neither_projects: string | number | null;
}

interface ProgramCreationRow {
  typescript_versions: string | null;
  attempted_count: string | number | null;
  succeeded_count: string | number | null;
  failed_count: string | number | null;
}

interface TimelineSeriesRow {
  week_start: string;
  value: string;
  project_count: string | number;
}

interface TimelineWeekRow {
  week_start: string;
  project_count: string | number;
}

interface PlatformFetchResult {
  snapshot: PlatformSnapshot;
  moduleTypeOverview?: ModuleTypeOverview;
  programCreationOverview?: ProgramCreationOverview;
  timelineOverview?: PlatformTimelineOverview;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function toTextExpression(column: ColumnMeta): string {
  const identifier = quoteIdentifier(column.columnName);
  if (column.redshiftType.toLowerCase().includes('boolean')) {
    return `CASE WHEN ${identifier} IS TRUE THEN 'true' WHEN ${identifier} IS FALSE THEN 'false' ELSE NULL END`;
  }
  return `CAST(${identifier} AS VARCHAR(1024))`;
}

function latestSubquery(view: string): string {
  return `
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY project_uuid ORDER BY partition_timestamp DESC) AS rn
    FROM ${view}
    WHERE partition_timestamp >= DATEADD(day, -${WINDOW_DAYS}, GETDATE())
  `;
}

function timelineWindowStartExpression(): string {
  return `DATE_TRUNC('week', DATEADD(week, -${Math.max(TIMELINE_WEEKS - 1, 0)}, GETDATE()))`;
}

function weeklyLatestSubquery(platformView: string, valueExpression: string): string {
  return `
    SELECT
      project_uuid,
      DATE_TRUNC('week', partition_timestamp) AS week_start,
      ${valueExpression} AS value,
      ROW_NUMBER() OVER (
        PARTITION BY project_uuid, DATE_TRUNC('week', partition_timestamp)
        ORDER BY partition_timestamp DESC
      ) AS rn
    FROM ${platformView}
    WHERE partition_timestamp >= ${timelineWindowStartExpression()}
  `;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    return Number(value);
  }
  return 0;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function columnNameToKey(columnName: string): string {
  return `javascript.${columnName.replaceAll('_', '.')}`;
}

function getCategory(pathSegments: string[]): string {
  if (pathSegments[1] === 'runtime') {
    return 'runtime';
  }
  if (pathSegments[1] !== 'telemetry') {
    return 'other';
  }
  if (pathSegments[2] === 'typescript' && pathSegments[3] === 'compiler-options') {
    return 'compiler-options';
  }
  if (pathSegments[2] === 'typescript') {
    return 'typescript';
  }
  if (pathSegments[2] === 'ecmascript') {
    return 'ecmascript';
  }
  if (pathSegments[2] === 'module-type') {
    return 'module-type';
  }
  return 'other';
}

function humanizeToken(token: string): string {
  const known = new Map<string, string>([
    ['allowarbitraryextensions', 'Allow Arbitrary Extensions'],
    ['allowimportingtsextensions', 'Allow Importing TS Extensions'],
    ['allowjs', 'Allow JS'],
    ['allowsyntheticdefaultimports', 'Allow Synthetic Default Imports'],
    ['alwaysstrict', 'Always Strict'],
    ['checkjs', 'Check JS'],
    ['cjs', 'CJS'],
    ['ecmascript', 'ECMAScript'],
    ['esm', 'ESM'],
    ['esmoduleinterop', 'ES Module Interop'],
    ['exactoptionalpropertytypes', 'Exact Optional Property Types'],
    ['isolatedmodules', 'Isolated Modules'],
    ['jsx', 'JSX'],
    ['lib', 'Lib'],
    ['major-version', 'Major Version'],
    ['moduledetection', 'Module Detection'],
    ['module', 'Module'],
    ['moduleresolution', 'Module Resolution'],
    ['native-preview', 'Native Preview'],
    ['noimplicitany', 'No Implicit Any'],
    ['noimplicitthis', 'No Implicit This'],
    ['nouncheckedindexedaccess', 'No Unchecked Indexed Access'],
    ['resolvejsonmodule', 'Resolve JSON Module'],
    ['resolvepackagejsonexports', 'Resolve Package JSON Exports'],
    ['resolvepackagejsonimports', 'Resolve Package JSON Imports'],
    ['sonarqube', 'SonarQube'],
    ['strict', 'Strict'],
    ['strictbindcallapply', 'Strict Bind Call Apply'],
    ['strictbuiltiniteratorreturn', 'Strict Builtin Iterator Return'],
    ['strictfunctiontypes', 'Strict Function Types'],
    ['strictnullchecks', 'Strict Null Checks'],
    ['strictpropertyinitialization', 'Strict Property Initialization'],
    ['target', 'Target'],
    ['typescript', 'TypeScript'],
    ['usedefineforclassfields', 'Use Define For Class Fields'],
    ['useunknownincatchvariables', 'Use Unknown In Catch Variables'],
    ['verbatimmodulesyntax', 'Verbatim Module Syntax'],
  ]);

  const lower = token.toLowerCase();
  if (known.has(lower)) {
    return known.get(lower)!;
  }

  return token
    .replaceAll('-', ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getDisplayName(pathSegments: string[]): string {
  return humanizeToken(pathSegments[pathSegments.length - 1] ?? 'Field');
}

function buildFieldMeta(columnName: string) {
  const key = columnNameToKey(columnName);
  const pathSegments = key.split('.');

  return {
    key,
    pathSegments,
    category: getCategory(pathSegments),
    displayName: getDisplayName(pathSegments),
  };
}

function inferSemanticTypeFromKey(key: string): FieldSemanticType | undefined {
  const lastSegment = key.split('.').at(-1) ?? '';
  const isCountField =
    /(^|-)count$/.test(lastSegment) ||
    (key.includes('.program-creation.') &&
      (lastSegment === 'attempted' || lastSegment === 'failed' || lastSegment === 'succeeded'));

  if (isCountField) {
    return 'count';
  }

  if (key.endsWith('.major-version') || key.endsWith('.versions')) {
    return 'version';
  }

  return undefined;
}

function inferFieldSemanticType(key: string, valueType: FieldValueType): FieldSemanticType {
  if (valueType === 'boolean') {
    return 'boolean';
  }

  return inferSemanticTypeFromKey(key) ?? (valueType === 'number' ? 'metric' : 'dimension');
}

function inferValueType(
  nonNullRows: number,
  numericRows: number,
  topValues: DistributionValue[],
): FieldValueType {
  if (nonNullRows === 0) {
    return 'unknown';
  }

  const normalized = new Set(topValues.map(entry => entry.value.toLowerCase()));
  if (
    normalized.size > 0 &&
    [...normalized].every(value => value === 'true' || value === 'false')
  ) {
    return 'boolean';
  }

  if (numericRows === nonNullRows) {
    return 'number';
  }

  if (numericRows > 0) {
    return 'mixed';
  }

  return 'string';
}

function buildTokenValues(
  values: DistributionValue[],
  nonNullRows: number,
): DistributionValue[] | undefined {
  const counts = new Map<string, number>();
  let sawSplitValue = false;

  for (const value of values) {
    const parts = value.value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      sawSplitValue = true;
    }

    for (const part of parts) {
      counts.set(part, (counts.get(part) ?? 0) + value.count);
    }
  }

  if (!sawSplitValue || counts.size === 0 || nonNullRows === 0) {
    return undefined;
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      percent: round((count / nonNullRows) * 100, 1),
    }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, TOKEN_VALUES_LIMIT);
}

function parseTelemetryTokens(
  value: string | null | undefined,
  fallback = 'not-detected',
): string[] {
  if (typeof value !== 'string') {
    return [fallback];
  }

  const tokens = [
    ...new Set(
      value
        .split(',')
        .map(part => part.trim())
        .filter(Boolean),
    ),
  ];
  return tokens.length > 0 ? tokens : [fallback];
}

function isComparableVersionLabel(value: string): boolean {
  return value !== 'not-detected' && /\d/.test(value);
}

function compareVersionLabels(left: string, right: string): number {
  const leftComparable = isComparableVersionLabel(left);
  const rightComparable = isComparableVersionLabel(right);

  if (leftComparable !== rightComparable) {
    return leftComparable ? -1 : 1;
  }

  return VERSION_COLLATOR.compare(left, right);
}

function getHighestComparableVersion(versions: string[]): string | undefined {
  let highest: string | undefined;

  for (const version of versions) {
    if (!isComparableVersionLabel(version)) {
      continue;
    }

    if (!highest || compareVersionLabels(version, highest) > 0) {
      highest = version;
    }
  }

  return highest;
}

function sortProgramCreationEntries(
  entries: ProgramCreationVersionOverview[],
): ProgramCreationVersionOverview[] {
  return [...entries].sort(
    (left, right) =>
      right.failed - left.failed ||
      right.projectsWithFailures - left.projectsWithFailures ||
      right.projects - left.projects ||
      compareVersionLabels(left.version, right.version),
  );
}

function buildCatalog(platforms: Record<PlatformId, PlatformSnapshot>): CatalogField[] {
  const catalog = new Map<string, CatalogField>();

  for (const platformId of Object.keys(platforms) as PlatformId[]) {
    for (const field of Object.values(platforms[platformId].fields)) {
      const existing = catalog.get(field.key) ?? {
        key: field.key,
        columnName: field.columnName,
        displayName: field.displayName,
        path: field.path,
        category: field.category,
        availability: { sq: false, sc: false },
        redshiftTypes: {},
      };

      existing.availability[platformId] = true;
      existing.redshiftTypes[platformId] = field.redshiftType;
      catalog.set(field.key, existing);
    }
  }

  return [...catalog.values()].sort(
    (left, right) =>
      left.category.localeCompare(right.category) ||
      left.displayName.localeCompare(right.displayName) ||
      left.key.localeCompare(right.key),
  );
}

function buildSingleValueTimelineSeriesQuery(platformView: string, columnName: string): string {
  const valueExpression = `CAST(${quoteIdentifier(columnName)} AS VARCHAR(1024))`;

  return `
    WITH latest AS (
      ${weeklyLatestSubquery(platformView, valueExpression)}
    )
    SELECT
      TO_CHAR(week_start, 'YYYY-MM-DD') AS week_start,
      value,
      COUNT(*) AS project_count
    FROM latest
    WHERE rn = 1
      AND value IS NOT NULL
    GROUP BY 1, 2
    ORDER BY 1, 3 DESC, 2
  `;
}

function buildSingleValueTimelineWeeksQuery(platformView: string, columnName: string): string {
  const valueExpression = `CAST(${quoteIdentifier(columnName)} AS VARCHAR(1024))`;

  return `
    WITH latest AS (
      ${weeklyLatestSubquery(platformView, valueExpression)}
    )
    SELECT
      TO_CHAR(week_start, 'YYYY-MM-DD') AS week_start,
      COUNT(*) AS project_count
    FROM latest
    WHERE rn = 1
      AND value IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `;
}

function buildSplitValueTimelineSeriesQuery(platformView: string, columnName: string): string {
  const valueExpression = `CAST(${quoteIdentifier(columnName)} AS VARCHAR(4096))`;

  return `
    WITH RECURSIVE token_indexes(index_value) AS (
      SELECT 1
      UNION ALL
      SELECT index_value + 1
      FROM token_indexes
      WHERE index_value < ${TIMELINE_SPLIT_LIMIT}
    ),
    latest AS (
      ${weeklyLatestSubquery(platformView, valueExpression)}
    ),
    exploded AS (
      SELECT
        week_start,
        project_uuid,
        COALESCE(
          NULLIF(TRIM(SPLIT_PART(COALESCE(value, 'not-detected'), ',', index_value)), ''),
          'not-detected'
        ) AS value
      FROM latest
      JOIN token_indexes
        ON index_value <= CASE
          WHEN value IS NULL OR TRIM(value) = '' THEN 1
          ELSE LEAST(REGEXP_COUNT(value, ',') + 1, ${TIMELINE_SPLIT_LIMIT})
        END
      WHERE rn = 1
    ),
    deduplicated AS (
      SELECT DISTINCT
        week_start,
        project_uuid,
        value
      FROM exploded
    )
    SELECT
      TO_CHAR(week_start, 'YYYY-MM-DD') AS week_start,
      value,
      COUNT(*) AS project_count
    FROM deduplicated
    GROUP BY 1, 2
    ORDER BY 1, 3 DESC, 2
  `;
}

function buildSplitValueTimelineWeeksQuery(platformView: string, columnName: string): string {
  const valueExpression = `CAST(${quoteIdentifier(columnName)} AS VARCHAR(4096))`;

  return `
    WITH latest AS (
      ${weeklyLatestSubquery(platformView, valueExpression)}
    )
    SELECT
      TO_CHAR(week_start, 'YYYY-MM-DD') AS week_start,
      COUNT(*) AS project_count
    FROM latest
    WHERE rn = 1
    GROUP BY 1
    ORDER BY 1
  `;
}

function buildVersionTimeline(
  weekRows: TimelineWeekRow[],
  seriesRows: TimelineSeriesRow[],
): VersionTimeline | undefined {
  if (weekRows.length === 0) {
    return undefined;
  }

  const weeks = weekRows
    .map(row => ({
      weekStart: row.week_start,
      projects: toNumber(row.project_count),
    }))
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart));
  const countsByValue = new Map<string, Map<string, number>>();

  for (const row of seriesRows) {
    const weeklyCounts = countsByValue.get(row.value) ?? new Map<string, number>();
    weeklyCounts.set(row.week_start, toNumber(row.project_count));
    countsByValue.set(row.value, weeklyCounts);
  }

  const series = [...countsByValue.entries()]
    .map(([value, weeklyCounts]) => {
      const weekly = weeks.map(week => ({
        weekStart: week.weekStart,
        projects: weeklyCounts.get(week.weekStart) ?? 0,
      }));

      return {
        value,
        totalProjects: weekly.reduce((sum, point) => sum + point.projects, 0),
        weekly,
      };
    })
    .sort(
      (left, right) =>
        right.totalProjects - left.totalProjects || left.value.localeCompare(right.value),
    );

  return {
    weeks,
    series,
  };
}

function buildAggregateQuery(platformView: string, columns: ColumnMeta[]): string {
  const expressions = columns.flatMap((column, index) => {
    const identifier = quoteIdentifier(column.columnName);
    const valueExpr = toTextExpression(column);
    const numericExpr = `TRY_CAST(${valueExpr} AS DOUBLE PRECISION)`;
    const alias = `c${index}`;

    return [
      `SUM(CASE WHEN ${identifier} IS NOT NULL THEN 1 ELSE 0 END) AS ${alias}_non_null`,
      `COUNT(DISTINCT CASE WHEN ${identifier} IS NOT NULL THEN ${valueExpr} END) AS ${alias}_distinct`,
      `SUM(CASE WHEN ${numericExpr} IS NOT NULL THEN 1 ELSE 0 END) AS ${alias}_numeric_rows`,
      `SUM(CASE WHEN ${numericExpr} = 0 THEN 1 ELSE 0 END) AS ${alias}_zero_rows`,
      `SUM(CASE WHEN ${numericExpr} > 0 THEN 1 ELSE 0 END) AS ${alias}_positive_rows`,
      `MIN(${numericExpr}) AS ${alias}_min`,
      `MAX(${numericExpr}) AS ${alias}_max`,
      `AVG(${numericExpr}) AS ${alias}_avg`,
      `SUM(${numericExpr}) AS ${alias}_sum`,
    ];
  });

  return `
    SELECT
      COUNT(*) AS total_rows,
      ${expressions.join(',\n      ')}
    FROM (
      ${latestSubquery(platformView)}
    ) latest
    WHERE rn = 1
  `;
}

async function getTelemetryColumns(client: Client, tableName: string): Promise<ColumnMeta[]> {
  const result = await client.query<ColumnRow>(`
    SELECT column_name, data_type, ordinal_position
    FROM svv_columns
    WHERE table_schema = 'measures'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position
  `);

  return result.rows
    .filter(
      row => row.column_name.startsWith('runtime_') || row.column_name.startsWith('telemetry_'),
    )
    .map(row => ({
      columnName: row.column_name,
      redshiftType: row.data_type,
      ordinalPosition: toNumber(row.ordinal_position),
    }));
}

async function getTopValues(
  client: Client,
  platformView: string,
  column: ColumnMeta,
  latestProjectCount: number,
): Promise<DistributionValue[]> {
  const identifier = quoteIdentifier(column.columnName);
  const valueExpr = toTextExpression(column);
  const result = await client.query<DistributionRow>(`
    SELECT
      ${valueExpr} AS value,
      COUNT(*) AS row_count
    FROM (
      ${latestSubquery(platformView)}
    ) latest
    WHERE rn = 1
      AND ${identifier} IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC, 1
    LIMIT ${TOP_VALUES_LIMIT}
  `);

  return result.rows.map(row => {
    const count = toNumber(row.row_count);
    return {
      value: row.value,
      count,
      percent: latestProjectCount === 0 ? 0 : round((count / latestProjectCount) * 100, 1),
    };
  });
}

async function getModuleTypeOverview(
  client: Client,
  platformView: string,
): Promise<ModuleTypeOverview | undefined> {
  const esmColumn = quoteIdentifier('telemetry_module-type_esm-file-count');
  const cjsColumn = quoteIdentifier('telemetry_module-type_cjs-file-count');
  const esmExpr = `COALESCE(TRY_CAST(CAST(${esmColumn} AS VARCHAR(1024)) AS BIGINT), 0)`;
  const cjsExpr = `COALESCE(TRY_CAST(CAST(${cjsColumn} AS VARCHAR(1024)) AS BIGINT), 0)`;

  const result = await client.query<ModuleTypeRow>(`
    SELECT
      COUNT(*) AS projects_with_telemetry,
      COALESCE(SUM(${esmExpr}), 0) AS total_esm_files,
      COALESCE(SUM(${cjsExpr}), 0) AS total_cjs_files,
      SUM(CASE WHEN ${esmExpr} > 0 AND ${cjsExpr} = 0 THEN 1 ELSE 0 END) AS esm_only_projects,
      SUM(CASE WHEN ${cjsExpr} > 0 AND ${esmExpr} = 0 THEN 1 ELSE 0 END) AS cjs_only_projects,
      SUM(CASE WHEN ${esmExpr} > 0 AND ${cjsExpr} > 0 THEN 1 ELSE 0 END) AS both_projects,
      SUM(CASE WHEN ${esmExpr} = 0 AND ${cjsExpr} = 0 THEN 1 ELSE 0 END) AS neither_projects
    FROM (
      ${latestSubquery(platformView)}
    ) latest
    WHERE rn = 1
      AND (${esmColumn} IS NOT NULL OR ${cjsColumn} IS NOT NULL)
  `);

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    projectsWithTelemetry: toNumber(row.projects_with_telemetry),
    totalEsmFiles: toNumber(row.total_esm_files),
    totalCjsFiles: toNumber(row.total_cjs_files),
    esmOnlyProjects: toNumber(row.esm_only_projects),
    cjsOnlyProjects: toNumber(row.cjs_only_projects),
    bothProjects: toNumber(row.both_projects),
    neitherProjects: toNumber(row.neither_projects),
  };
}

async function getProgramCreationOverview(
  client: Client,
  platformView: string,
  hasTypeScriptVersionColumn: boolean,
): Promise<ProgramCreationOverview | undefined> {
  const versionsColumn = quoteIdentifier('telemetry_typescript_versions');
  const attemptedColumn = quoteIdentifier('telemetry_typescript_program-creation_attempted');
  const succeededColumn = quoteIdentifier('telemetry_typescript_program-creation_succeeded');
  const failedColumn = quoteIdentifier('telemetry_typescript_program-creation_failed');
  const attemptedExpr = `COALESCE(TRY_CAST(CAST(${attemptedColumn} AS VARCHAR(1024)) AS BIGINT), 0)`;
  const succeededExpr = `COALESCE(TRY_CAST(CAST(${succeededColumn} AS VARCHAR(1024)) AS BIGINT), 0)`;
  const failedExpr = `COALESCE(TRY_CAST(CAST(${failedColumn} AS VARCHAR(1024)) AS BIGINT), 0)`;
  const versionsExpr = hasTypeScriptVersionColumn
    ? `CAST(${versionsColumn} AS VARCHAR(4096))`
    : 'NULL::VARCHAR(4096)';
  const result = await client.query<ProgramCreationRow>(`
    SELECT
      ${versionsExpr} AS typescript_versions,
      ${attemptedExpr} AS attempted_count,
      ${succeededExpr} AS succeeded_count,
      ${failedExpr} AS failed_count
    FROM (
      ${latestSubquery(platformView)}
    ) latest
    WHERE rn = 1
      AND (
        ${attemptedColumn} IS NOT NULL
        OR ${succeededColumn} IS NOT NULL
        OR ${failedColumn} IS NOT NULL
      )
  `);

  if (result.rows.length === 0) {
    return undefined;
  }

  const byVersion = new Map<string, ProgramCreationVersionOverview>();
  const preparedRows: Array<{
    attempts: number;
    succeeded: number;
    failed: number;
    versions: string[];
  }> = [];
  const overview: ProgramCreationOverview = {
    projects: 0,
    projectsWithFailures: 0,
    attempts: 0,
    succeeded: 0,
    failed: 0,
    byVersion: [],
    atOrAboveVersion: [],
  };

  for (const row of result.rows) {
    const attempts = toNumber(row.attempted_count);
    const succeeded = toNumber(row.succeeded_count);
    const failed = toNumber(row.failed_count);
    const versions = parseTelemetryTokens(row.typescript_versions);
    preparedRows.push({ attempts, succeeded, failed, versions });

    overview.projects += 1;
    overview.attempts += attempts;
    overview.succeeded += succeeded;
    overview.failed += failed;

    if (failed > 0) {
      overview.projectsWithFailures += 1;
    }

    for (const version of versions) {
      const entry = byVersion.get(version) ?? {
        version,
        projects: 0,
        projectsWithFailures: 0,
        attempts: 0,
        succeeded: 0,
        failed: 0,
      };

      entry.projects += 1;
      entry.attempts += attempts;
      entry.succeeded += succeeded;
      entry.failed += failed;

      if (failed > 0) {
        entry.projectsWithFailures += 1;
      }

      byVersion.set(version, entry);
    }
  }

  const comparableVersions = [...new Set(preparedRows.flatMap(row => row.versions))]
    .filter(isComparableVersionLabel)
    .sort(compareVersionLabels);

  if (comparableVersions.length > 0) {
    const versionIndex = new Map(comparableVersions.map((version, index) => [version, index]));
    const projectsDiff = new Array(comparableVersions.length + 1).fill(0);
    const projectsWithFailuresDiff = new Array(comparableVersions.length + 1).fill(0);
    const attemptsDiff = new Array(comparableVersions.length + 1).fill(0);
    const succeededDiff = new Array(comparableVersions.length + 1).fill(0);
    const failedDiff = new Array(comparableVersions.length + 1).fill(0);

    for (const row of preparedRows) {
      const highestVersion = getHighestComparableVersion(row.versions);
      if (!highestVersion) {
        continue;
      }

      const maxIndex = versionIndex.get(highestVersion);
      if (maxIndex === undefined) {
        continue;
      }

      projectsDiff[0] += 1;
      projectsDiff[maxIndex + 1] -= 1;
      attemptsDiff[0] += row.attempts;
      attemptsDiff[maxIndex + 1] -= row.attempts;
      succeededDiff[0] += row.succeeded;
      succeededDiff[maxIndex + 1] -= row.succeeded;
      failedDiff[0] += row.failed;
      failedDiff[maxIndex + 1] -= row.failed;

      if (row.failed > 0) {
        projectsWithFailuresDiff[0] += 1;
        projectsWithFailuresDiff[maxIndex + 1] -= 1;
      }
    }

    let projects = 0;
    let projectsWithFailures = 0;
    let attempts = 0;
    let succeeded = 0;
    let failed = 0;

    overview.atOrAboveVersion = comparableVersions.map((version, index) => {
      projects += projectsDiff[index]!;
      projectsWithFailures += projectsWithFailuresDiff[index]!;
      attempts += attemptsDiff[index]!;
      succeeded += succeededDiff[index]!;
      failed += failedDiff[index]!;

      return {
        version,
        projects,
        projectsWithFailures,
        attempts,
        succeeded,
        failed,
      };
    });
  }

  overview.byVersion = sortProgramCreationEntries([...byVersion.values()]);

  return overview;
}

async function getSingleValueVersionTimeline(
  client: Client,
  platformView: string,
  columnName: string,
): Promise<VersionTimeline | undefined> {
  const weekResult = await client.query<TimelineWeekRow>(
    buildSingleValueTimelineWeeksQuery(platformView, columnName),
  );
  const seriesResult = await client.query<TimelineSeriesRow>(
    buildSingleValueTimelineSeriesQuery(platformView, columnName),
  );

  return buildVersionTimeline(weekResult.rows, seriesResult.rows);
}

async function getSplitValueVersionTimeline(
  client: Client,
  platformView: string,
  columnName: string,
): Promise<VersionTimeline | undefined> {
  const weekResult = await client.query<TimelineWeekRow>(
    buildSplitValueTimelineWeeksQuery(platformView, columnName),
  );
  const seriesResult = await client.query<TimelineSeriesRow>(
    buildSplitValueTimelineSeriesQuery(platformView, columnName),
  );

  return buildVersionTimeline(weekResult.rows, seriesResult.rows);
}

async function fetchPlatformSnapshot(
  client: Client,
  platform: (typeof PLATFORMS)[number],
): Promise<PlatformFetchResult> {
  console.log(`Inspecting ${platform.view}`);
  const columns = await getTelemetryColumns(client, platform.tableName);
  console.log(`Discovered ${columns.length} telemetry columns for ${platform.shortLabel}`);

  if (columns.length === 0) {
    return {
      snapshot: {
        id: platform.id,
        label: platform.label,
        shortLabel: platform.shortLabel,
        view: platform.view,
        latestProjectCount: 0,
        fieldCount: 0,
        fields: {},
      },
    };
  }

  console.log(`Aggregating coverage and numeric summaries for ${platform.shortLabel}...`);
  const aggregateResult = await client.query<AggregateRow>(
    buildAggregateQuery(platform.view, columns),
  );
  const aggregateRow = aggregateResult.rows[0];
  const latestProjectCount = toNumber(aggregateRow?.total_rows);
  console.log(`Latest deduplicated projects for ${platform.shortLabel}: ${latestProjectCount}`);
  const fields: Record<string, FieldSummary> = {};

  for (const [index, column] of columns.entries()) {
    const alias = `c${index}`;
    const meta = buildFieldMeta(column.columnName);
    const semanticHint = inferSemanticTypeFromKey(meta.key);
    if (semanticHint !== 'count') {
      console.log(
        `Fetching top values for ${platform.shortLabel} field ${index + 1}/${columns.length}: ${column.columnName}`,
      );
    }
    const topValues =
      semanticHint === 'count'
        ? []
        : await getTopValues(client, platform.view, column, latestProjectCount);
    const nonNullRows = toNumber(aggregateRow?.[`${alias}_non_null`]);
    const distinctValues = toNumber(aggregateRow?.[`${alias}_distinct`]);
    const numericRows = toNumber(aggregateRow?.[`${alias}_numeric_rows`]);
    const valueType = inferValueType(nonNullRows, numericRows, topValues);
    const semanticType = inferFieldSemanticType(meta.key, valueType);

    const numeric =
      numericRows > 0
        ? {
            numericRows,
            zeroRows: toNumber(aggregateRow?.[`${alias}_zero_rows`]),
            positiveRows: toNumber(aggregateRow?.[`${alias}_positive_rows`]),
            min: round(toNumber(aggregateRow?.[`${alias}_min`])),
            max: round(toNumber(aggregateRow?.[`${alias}_max`])),
            avg: round(toNumber(aggregateRow?.[`${alias}_avg`])),
            sum: round(toNumber(aggregateRow?.[`${alias}_sum`])),
          }
        : undefined;

    fields[meta.key] = {
      key: meta.key,
      columnName: column.columnName,
      displayName: meta.displayName,
      path: meta.pathSegments,
      category: meta.category,
      valueType,
      semanticType,
      redshiftType: column.redshiftType,
      coverage: {
        total: latestProjectCount,
        nonNull: nonNullRows,
        percent: latestProjectCount === 0 ? 0 : round((nonNullRows / latestProjectCount) * 100, 1),
        distinct: distinctValues,
      },
      topValues,
      tokenValues: topValues.length > 0 ? buildTokenValues(topValues, nonNullRows) : undefined,
      valueListTruncated: topValues.length > 0 ? distinctValues > topValues.length : false,
      numeric,
    };
  }

  const hasModuleColumns =
    fields['javascript.telemetry.module-type.esm-file-count'] &&
    fields['javascript.telemetry.module-type.cjs-file-count'];
  const hasProgramCreationColumns =
    fields['javascript.telemetry.typescript.program-creation.attempted'] &&
    fields['javascript.telemetry.typescript.program-creation.succeeded'] &&
    fields['javascript.telemetry.typescript.program-creation.failed'];
  const hasTypeScriptVersionColumn = Boolean(fields['javascript.telemetry.typescript.versions']);
  const timelineOverview: PlatformTimelineOverview = {};

  if (fields['javascript.runtime.major-version']) {
    timelineOverview.nodeMajorVersion = await getSingleValueVersionTimeline(
      client,
      platform.view,
      'runtime_major-version',
    );
  }

  if (hasTypeScriptVersionColumn) {
    timelineOverview.typescriptVersion = await getSplitValueVersionTimeline(
      client,
      platform.view,
      'telemetry_typescript_versions',
    );
  }

  return {
    snapshot: {
      id: platform.id,
      label: platform.label,
      shortLabel: platform.shortLabel,
      view: platform.view,
      latestProjectCount,
      fieldCount: columns.length,
      fields,
    },
    moduleTypeOverview: hasModuleColumns
      ? await getModuleTypeOverview(client, platform.view)
      : undefined,
    programCreationOverview: hasProgramCreationColumns
      ? await getProgramCreationOverview(client, platform.view, hasTypeScriptVersionColumn)
      : undefined,
    timelineOverview:
      timelineOverview.nodeMajorVersion || timelineOverview.typescriptVersion
        ? timelineOverview
        : undefined,
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const client = await createClient();

  try {
    const platforms = {
      sq: {
        id: 'sq',
        label: 'SonarQube Server',
        shortLabel: 'SQS',
        view: 'measures.sq_analysis_javascript_adhoc',
        latestProjectCount: 0,
        fieldCount: 0,
        fields: {},
      },
      sc: {
        id: 'sc',
        label: 'SonarQube Cloud',
        shortLabel: 'SQC',
        view: 'measures.sc_analysis_javascript_adhoc',
        latestProjectCount: 0,
        fieldCount: 0,
        fields: {},
      },
    } as Record<PlatformId, PlatformSnapshot>;
    const moduleTypeOverview: Partial<Record<PlatformId, ModuleTypeOverview>> = {};
    const programCreationOverview: Partial<Record<PlatformId, ProgramCreationOverview>> = {};
    const timelineOverview: Partial<Record<PlatformId, PlatformTimelineOverview>> = {};

    console.log(
      `Fetching telemetry for platforms: ${PLATFORMS.map(platform => platform.shortLabel).join(', ')}`,
    );

    for (const platform of PLATFORMS) {
      const result = await fetchPlatformSnapshot(client, platform);
      platforms[platform.id] = result.snapshot;

      if (result.moduleTypeOverview) {
        moduleTypeOverview[platform.id] = result.moduleTypeOverview;
      }

      if (result.programCreationOverview) {
        programCreationOverview[platform.id] = result.programCreationOverview;
      }

      if (result.timelineOverview) {
        timelineOverview[platform.id] = result.timelineOverview;
      }
    }

    const snapshot: TelemetrySnapshot = {
      generatedAt: new Date().toISOString(),
      source: 'redshift',
      windowDays: WINDOW_DAYS,
      windowStart: new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      notes: [
        `Latest analysis per project_uuid over the last ${WINDOW_DAYS} days.`,
        'Telemetry fields are discovered from adhoc Redshift columns with runtime_ or telemetry_ prefixes.',
        'SQC is known to omit some compiler option columns that still exist on SQS.',
        'Program creation version buckets split comma-separated TypeScript version lists, so a single project can contribute to multiple version rows.',
        'The program creation >= filter counts a project once when any emitted TypeScript version meets the selected threshold.',
        `Weekly adoption timelines are aggregated in Redshift over the last ${TIMELINE_WEEKS} calendar weeks.`,
      ],
      platforms,
      catalog: buildCatalog(platforms),
      overview: {
        moduleType: moduleTypeOverview,
        programCreation: programCreationOverview,
        timelines: timelineOverview,
      },
    };

    fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`Wrote snapshot with ${snapshot.catalog.length} fields to ${OUTPUT_FILE}`);
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
