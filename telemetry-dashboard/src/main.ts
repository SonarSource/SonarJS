import type {
  CatalogField,
  DistributionValue,
  FieldSemanticType,
  FieldSummary,
  FieldValueType,
  ModuleTypeOverview,
  NumericSummary,
  PlatformId,
  PlatformTimelineOverview,
  ProgramCreationOverview,
  ProgramCreationVersionOverview,
  TelemetrySnapshot,
  VersionTimeline,
} from './types.js';

type SortKey = 'coverage' | 'alphabetical' | 'sparsest';

interface AppState {
  snapshot: TelemetrySnapshot;
  selectedPlatforms: Set<PlatformId>;
  selectedProgramCreationVersion: string;
  search: string;
  sort: SortKey;
}

interface AggregatedField {
  meta: CatalogField;
  coverage: {
    total: number;
    nonNull: number;
    percent: number;
  };
  topValues: DistributionValue[];
  tokenValues?: DistributionValue[];
  valueType: FieldValueType;
  semanticType: FieldSemanticType;
  numeric?: NumericSummary;
  valueListTruncated: boolean;
  platformDetails: Array<{
    id: PlatformId;
    label: string;
    shortLabel: string;
    summary: FieldSummary;
  }>;
}

const CATEGORY_ORDER = ['runtime', 'typescript', 'compiler-options', 'ecmascript', 'module-type', 'other'];
const CATEGORY_COPY: Record<string, string> = {
  runtime: 'Runtime telemetry emitted by the bridge server.',
  typescript: 'TypeScript-specific telemetry fields and counters.',
  'compiler-options': 'Compiler option coverage and value distributions.',
  ecmascript: 'ECMAScript versions observed in analyzed projects.',
  'module-type': 'Module type counters and mixed ESM/CJS usage.',
  other: 'Telemetry fields that do not fit the main curated sections.',
};

const appRoot = document.querySelector<HTMLElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app root');
}

const app: HTMLElement = appRoot;

let state: AppState | undefined;

app.addEventListener('input', handleControls);
app.addEventListener('change', handleControls);

void loadSnapshot();

async function loadSnapshot(): Promise<void> {
  try {
    const response = await fetch('./data/snapshot.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load snapshot: ${response.status} ${response.statusText}`);
    }

    const snapshot = (await response.json()) as TelemetrySnapshot;
    state = {
      snapshot,
      selectedPlatforms: new Set<PlatformId>(['sq', 'sc']),
      selectedProgramCreationVersion: '',
      search: '',
      sort: 'coverage',
    };

    document.title = `SonarJS Telemetry Dashboard • ${getSourceLabel(snapshot.source)}`;
    render();
  } catch (error) {
    renderError(error);
  }
}

function handleControls(event: Event): void {
  if (!state) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target instanceof HTMLInputElement && target.name === 'platform') {
    if (target.checked) {
      state.selectedPlatforms.add(target.value as PlatformId);
    } else {
      state.selectedPlatforms.delete(target.value as PlatformId);
      if (state.selectedPlatforms.size === 0) {
        state.selectedPlatforms.add(target.value as PlatformId);
      }
    }
    render();
    return;
  }

  if (target instanceof HTMLInputElement && target.name === 'search') {
    state.search = target.value;
    render();
    return;
  }

  if (target instanceof HTMLSelectElement && target.name === 'sort') {
    state.sort = target.value as SortKey;
    render();
    return;
  }

  if (target instanceof HTMLSelectElement && target.name === 'programCreationVersion') {
    state.selectedProgramCreationVersion = target.value;
    render();
  }
}

function render(): void {
  if (!state) {
    return;
  }

  const currentState = state;
  const selectedPlatforms = getSelectedPlatforms(currentState);
  const programCreationOverview = getAggregatedProgramCreationOverview(
    currentState.snapshot,
    selectedPlatforms,
  );
  if (
    currentState.selectedProgramCreationVersion &&
    !programCreationOverview?.byVersion.some(
      entry => entry.version === currentState.selectedProgramCreationVersion,
    )
  ) {
    currentState.selectedProgramCreationVersion = '';
  }

  const nodeTimeline = getAggregatedVersionTimeline(
    currentState.snapshot,
    selectedPlatforms,
    'nodeMajorVersion',
  );
  const typeScriptTimeline = getAggregatedVersionTimeline(
    currentState.snapshot,
    selectedPlatforms,
    'typescriptVersion',
  );
  const visibleCatalog = getVisibleCatalog(
    currentState.snapshot,
    selectedPlatforms,
    currentState.search,
    currentState.sort,
  );
  const visibleFields = visibleCatalog
    .map(field => aggregateField(field, currentState.snapshot, selectedPlatforms))
    .filter((field): field is AggregatedField => field !== undefined);

  const latestProjects = selectedPlatforms.reduce(
    (sum, platformId) => sum + currentState.snapshot.platforms[platformId].latestProjectCount,
    0,
  );
  const fieldsWithData = visibleFields.filter(field => field.coverage.nonNull > 0).length;
  const highCoverageFields = visibleFields.filter(field => field.coverage.percent >= 50).length;
  const compilerFields = visibleFields
    .filter(field => field.meta.category === 'compiler-options')
    .sort((left, right) => right.coverage.nonNull - left.coverage.nonNull);
  const groupedFields = groupFields(visibleFields);

  const overviewCards = [
    renderDistributionCard(
      'Node.js Major Version',
      'javascript.runtime.major-version',
      'Which Node major versions appear in the latest analyses.',
      selectedPlatforms,
      8,
    ),
    renderDistributionCard(
      'Node Executable Origin',
      'javascript.runtime.node-executable-origin',
      'Embedded vs host Node resolution across selected platforms.',
      selectedPlatforms,
      6,
    ),
    renderDistributionCard(
      'TypeScript Versions',
      'javascript.telemetry.typescript.versions',
      'Most common TypeScript versions seen in project telemetry.',
      selectedPlatforms,
      12,
    ),
    renderDistributionCard(
      'ECMAScript Versions',
      'javascript.telemetry.ecmascript.versions',
      'Reported ECMAScript versions from the deduplicated latest analyses.',
      selectedPlatforms,
      12,
    ),
    renderBooleanCard(
      'TypeScript Native Preview',
      'javascript.telemetry.typescript.native-preview',
      'Adoption of TypeScript native preview in the selected platforms.',
      selectedPlatforms,
    ),
    renderTimelineCard(
      'Node.js Adoption Timeline',
      'Weekly share of Node major versions using the latest project analysis in each calendar week.',
      nodeTimeline,
      { limit: 6 },
    ),
    renderTimelineCard(
      'TypeScript Adoption Timeline',
      'Weekly share of TypeScript versions. When the program-creation filter is set, this chart focuses on that version.',
      typeScriptTimeline,
      {
        limit: 6,
        focusValue: state.selectedProgramCreationVersion,
        note: 'Projects that report multiple TypeScript versions can contribute to multiple series in the same week.',
      },
    ),
    renderCompilerCoverageCard(compilerFields),
    renderModuleTypeCard(currentState.snapshot, selectedPlatforms),
    renderProgramCreationCard(programCreationOverview, currentState.selectedProgramCreationVersion),
  ]
    .filter(Boolean)
    .join('');

  app.innerHTML = `
    <main class="page">
      <section class="hero">
        <div class="hero-content">
          <div>
            <h1>SonarJS Telemetry Dashboard</h1>
            <p>
              Schema-driven explorer for the SonarJS analyzer telemetry stored in the warehouse.
              The curated overview highlights the current hotspots, while the field explorer below
              renders new telemetry columns automatically as they land in Redshift.
            </p>
          </div>
          <aside class="meta-panel">
            <div class="meta-grid">
              <div class="meta-block">
                <div class="meta-label">Snapshot</div>
                <div class="meta-value">${escapeHtml(getSourceDescription(currentState.snapshot.source))}</div>
              </div>
              <div class="meta-block">
                <div class="meta-label">Generated</div>
                <div class="meta-value">${escapeHtml(formatDateTime(currentState.snapshot.generatedAt))}</div>
              </div>
              <div class="meta-block">
                <div class="meta-label">Window</div>
                <div class="meta-value">Last ${currentState.snapshot.windowDays} days</div>
              </div>
              <div class="meta-block">
                <div class="meta-label">Platforms</div>
                <div class="meta-value">${selectedPlatforms
                  .map(platformId => currentState.snapshot.platforms[platformId].shortLabel)
                  .join(' + ')}</div>
              </div>
            </div>
            <ol class="notes">
              ${currentState.snapshot.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
            </ol>
          </aside>
        </div>
      </section>

      <section class="controls">
        <div class="control-group">
          <span class="control-label">Platforms</span>
          ${renderPlatformToggle(
            'sq',
            currentState.snapshot.platforms.sq,
            currentState.selectedPlatforms.has('sq'),
          )}
          ${renderPlatformToggle(
            'sc',
            currentState.snapshot.platforms.sc,
            currentState.selectedPlatforms.has('sc'),
          )}
        </div>
        <div class="control-group">
          <span class="control-label">Search</span>
          <input
            class="search-input"
            type="search"
            name="search"
            value="${escapeAttribute(currentState.search)}"
            placeholder="Search by field name, key, or column"
          />
        </div>
        <div class="control-group">
          <span class="control-label">Sort</span>
          <select class="sort-select" name="sort">
            ${renderSortOption('coverage', currentState.sort, 'Coverage first')}
            ${renderSortOption('alphabetical', currentState.sort, 'Alphabetical')}
            ${renderSortOption('sparsest', currentState.sort, 'Lowest coverage')}
          </select>
        </div>
      </section>

      <section class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-label">Latest Projects</div>
          <div class="kpi-value">${formatNumber(latestProjects)}</div>
          <div class="kpi-sub">Deduplicated latest analyses in the selected ${selectedPlatforms.length === 1 ? 'platform' : 'platforms'}.</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">Visible Fields</div>
          <div class="kpi-value">${formatNumber(visibleFields.length)}</div>
          <div class="kpi-sub">${formatNumber(fieldsWithData)} currently have non-null values.</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">High Coverage</div>
          <div class="kpi-value">${formatNumber(highCoverageFields)}</div>
          <div class="kpi-sub">Fields present in at least half of the selected latest analyses.</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">Compiler Options</div>
          <div class="kpi-value">${formatNumber(compilerFields.length)}</div>
          <div class="kpi-sub">Auto-discovered compiler option columns across the selected platforms.</div>
        </article>
      </section>

      <section class="overview-grid">
        ${overviewCards}
      </section>

      ${
        visibleFields.length === 0
          ? `
            <section class="empty-state">
              <div class="empty-card">
                <h2>${
                  currentState.snapshot.source === 'empty'
                    ? 'No local telemetry snapshot yet'
                    : 'No matching telemetry fields'
                }</h2>
                <p>${
                  currentState.snapshot.source === 'empty'
                    ? 'Run `npm --prefix telemetry-dashboard run fetch:redshift` locally or let CI refresh the dashboard, then build again.'
                    : 'Adjust the search or platform filters to bring fields back into view.'
                }</p>
              </div>
            </section>
          `
          : CATEGORY_ORDER.map(category => renderGroupSection(category, groupedFields.get(category) ?? [])).join('')
      }
    </main>
  `;
}

function renderPlatformToggle(
  platformId: PlatformId,
  platform: TelemetrySnapshot['platforms'][PlatformId],
  checked: boolean,
): string {
  return `
    <label class="pill-toggle">
      <input type="checkbox" name="platform" value="${platformId}" ${checked ? 'checked' : ''} />
      <span>${escapeHtml(platform.label)}</span>
      <span class="tag"><strong>${platform.shortLabel}</strong> ${formatNumber(platform.latestProjectCount)}</span>
    </label>
  `;
}

function renderSortOption(value: SortKey, selected: SortKey, label: string): string {
  return `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function renderProgramVersionOption(value: string, selectedValue: string): string {
  return `<option value="${escapeAttribute(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(value)}</option>`;
}

function renderDistributionCard(
  title: string,
  fieldKey: string,
  description: string,
  selectedPlatforms: PlatformId[],
  limit: number,
): string {
  if (!state) {
    return '';
  }

  const field = getAggregatedField(fieldKey, state.snapshot, selectedPlatforms);
  if (!field || field.coverage.nonNull === 0) {
    return '';
  }

  const distribution = field.tokenValues?.length ? field.tokenValues : field.topValues;
  const denominator = field.tokenValues?.length ? field.coverage.nonNull : field.coverage.total;

  return `
    <article class="overview-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      <div class="tag-row" style="margin-top: 12px">
        <span class="tag"><strong>Coverage</strong> ${formatPercent(field.coverage.percent)}</span>
        <span class="tag"><strong>Non-null</strong> ${formatNumber(field.coverage.nonNull)}</span>
      </div>
      <div style="margin-top: 14px">
        ${renderDistributionList(distribution.slice(0, limit), distribution, denominator)}
      </div>
      ${
        field.tokenValues?.length
          ? '<p class="dist-note">Comma-separated values are split before the distribution is aggregated.</p>'
          : ''
      }
    </article>
  `;
}

function renderBooleanCard(
  title: string,
  fieldKey: string,
  description: string,
  selectedPlatforms: PlatformId[],
): string {
  if (!state) {
    return '';
  }

  const field = getAggregatedField(fieldKey, state.snapshot, selectedPlatforms);
  if (!field || field.coverage.nonNull === 0) {
    return '';
  }

  return `
    <article class="overview-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      <div class="tag-row" style="margin-top: 12px">
        <span class="tag"><strong>Coverage</strong> ${formatPercent(field.coverage.percent)}</span>
        <span class="tag"><strong>Rows</strong> ${formatNumber(field.coverage.nonNull)}</span>
      </div>
      <div style="margin-top: 14px">
        ${renderDistributionList(field.topValues, field.topValues, field.coverage.nonNull)}
      </div>
    </article>
  `;
}

function renderCompilerCoverageCard(fields: AggregatedField[]): string {
  if (fields.length === 0) {
    return '';
  }

  const coverageValues = fields.slice(0, 10).map(field => ({
    value: field.meta.displayName,
    count: field.coverage.nonNull,
    percent: field.coverage.percent,
  }));

  return `
    <article class="overview-card">
      <h2>Compiler Option Coverage</h2>
      <p>Which compiler option columns currently show up most often in the deduplicated latest analyses.</p>
      <div style="margin-top: 14px">
        ${renderDistributionList(coverageValues, coverageValues, fields[0]?.coverage.total ?? 0)}
      </div>
      <p class="dist-note">New compiler option fields appear automatically when new columns land in Redshift.</p>
    </article>
  `;
}

function renderModuleTypeCard(snapshot: TelemetrySnapshot, selectedPlatforms: PlatformId[]): string {
  const entries = selectedPlatforms
    .map(platformId => snapshot.overview?.moduleType?.[platformId])
    .filter((entry): entry is ModuleTypeOverview => entry !== undefined);

  if (entries.length === 0) {
    return '';
  }

  const aggregate = entries.reduce<ModuleTypeOverview>(
    (sum, entry) => ({
      projectsWithTelemetry: sum.projectsWithTelemetry + entry.projectsWithTelemetry,
      totalEsmFiles: sum.totalEsmFiles + entry.totalEsmFiles,
      totalCjsFiles: sum.totalCjsFiles + entry.totalCjsFiles,
      esmOnlyProjects: sum.esmOnlyProjects + entry.esmOnlyProjects,
      cjsOnlyProjects: sum.cjsOnlyProjects + entry.cjsOnlyProjects,
      bothProjects: sum.bothProjects + entry.bothProjects,
      neitherProjects: sum.neitherProjects + entry.neitherProjects,
    }),
    {
      projectsWithTelemetry: 0,
      totalEsmFiles: 0,
      totalCjsFiles: 0,
      esmOnlyProjects: 0,
      cjsOnlyProjects: 0,
      bothProjects: 0,
      neitherProjects: 0,
    },
  );

  const projectMix: DistributionValue[] = [
    { value: 'CJS only', count: aggregate.cjsOnlyProjects, percent: 0 },
    { value: 'ESM only', count: aggregate.esmOnlyProjects, percent: 0 },
    { value: 'Both ESM and CJS', count: aggregate.bothProjects, percent: 0 },
    { value: 'Both counts are 0', count: aggregate.neitherProjects, percent: 0 },
  ]
    .filter(entry => entry.count > 0)
    .map(entry => ({
      ...entry,
      percent:
        aggregate.projectsWithTelemetry === 0
          ? 0
          : round((entry.count / aggregate.projectsWithTelemetry) * 100, 1),
    }))
    .sort((left, right) => right.count - left.count);

  return `
    <article class="overview-card">
      <h2>Module Type Breakdown</h2>
      <p>Built from the ESM and CJS file count fields, limited to projects that emitted module telemetry.</p>
      <div class="stat-grid" style="margin-top: 14px">
        <div class="stat">
          <div class="stat-label">Projects With Telemetry</div>
          <div class="stat-value">${formatNumber(aggregate.projectsWithTelemetry)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total ESM Files</div>
          <div class="stat-value">${formatNumber(aggregate.totalEsmFiles)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total CJS Files</div>
          <div class="stat-value">${formatNumber(aggregate.totalCjsFiles)}</div>
        </div>
      </div>
      <div style="margin-top: 14px">
        ${renderDistributionList(projectMix, projectMix, aggregate.projectsWithTelemetry)}
      </div>
      <p class="dist-note">“Both counts are 0” means the project emitted module telemetry, but both counters were zero in that latest analysis.</p>
    </article>
  `;
}

function renderProgramCreationCard(
  overview: ProgramCreationOverview | undefined,
  selectedTypeScriptVersion: string,
): string {
  if (!overview) {
    return '';
  }

  const selectedVersion = selectedTypeScriptVersion.trim();
  const selectedEntry = selectedVersion
    ? overview.byVersion.find(entry => entry.version === selectedVersion)
    : undefined;
  const scope = selectedEntry ?? overview;
  const failureRate = scope.attempts === 0 ? 0 : round((scope.failed / scope.attempts) * 100, 1);
  const failingVersions = overview.byVersion.filter(entry => entry.failed > 0);
  const breakdownEntries = selectedEntry
    ? selectedEntry.failed > 0
      ? [selectedEntry]
      : []
    : failingVersions.slice(0, 12);
  const failureDistribution = breakdownEntries.map(entry => ({
    value: entry.version,
    count: entry.failed,
    percent: overview.failed === 0 ? 0 : round((entry.failed / overview.failed) * 100, 1),
  }));

  return `
    <article class="overview-card overview-card-wide">
      <div class="section-header">
        <div>
          <h2>Program Creation Failures</h2>
          <p>Grouped by TypeScript version using the versions emitted by each latest project analysis.</p>
        </div>
        <label class="control-group inline-filter">
          <span class="control-label">TS Version</span>
          <select class="sort-select" name="programCreationVersion">
            <option value="" ${selectedVersion === '' ? 'selected' : ''}>All versions</option>
            ${overview.byVersion
              .map(entry => renderProgramVersionOption(entry.version, selectedVersion))
              .join('')}
          </select>
        </label>
      </div>
      <div class="tag-row">
        <span class="tag"><strong>Scope</strong> ${escapeHtml(selectedEntry?.version ?? 'All versions')}</span>
        <span class="tag"><strong>Projects</strong> ${formatNumber(scope.projects)}</span>
        <span class="tag"><strong>Projects With Failures</strong> ${formatNumber(scope.projectsWithFailures)}</span>
        <span class="tag"><strong>Version Buckets</strong> ${formatNumber(overview.byVersion.length)}</span>
      </div>
      <div class="stat-grid" style="margin-top: 14px">
        <div class="stat">
          <div class="stat-label">Attempted</div>
          <div class="stat-value">${formatNumber(scope.attempts)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Succeeded</div>
          <div class="stat-value">${formatNumber(scope.succeeded)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Failed</div>
          <div class="stat-value">${formatNumber(scope.failed)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Failure Rate</div>
          <div class="stat-value">${formatPercent(failureRate)}</div>
        </div>
      </div>
      <div style="margin-top: 14px">
        <div class="muted-copy">${selectedEntry ? 'Selected version failure share' : 'Top failure buckets'}</div>
        ${
          failureDistribution.length > 0
            ? renderDistributionList(failureDistribution, failureDistribution, overview.failed)
            : '<div class="empty-copy">No program creation failures in the current selection.</div>'
        }
      </div>
      <p class="dist-note">Rows that report multiple TypeScript versions contribute to every matching version bucket.</p>
    </article>
  `;
}

function renderTimelineCard(
  title: string,
  description: string,
  timeline: VersionTimeline | undefined,
  options: {
    limit: number;
    focusValue?: string;
    note?: string;
  },
): string {
  if (!timeline || timeline.weeks.length === 0 || timeline.series.length === 0) {
    return '';
  }

  const focusedSeries = options.focusValue
    ? timeline.series.find(series => series.value === options.focusValue)
    : undefined;
  const visibleSeries = focusedSeries ? [focusedSeries] : timeline.series.slice(0, options.limit);
  const latestWeek = timeline.weeks.at(-1);

  if (!latestWeek || visibleSeries.length === 0) {
    return '';
  }

  return `
    <article class="overview-card overview-card-wide">
      <div class="section-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="tag-row">
          <span class="tag"><strong>Weeks</strong> ${formatNumber(timeline.weeks.length)}</span>
          <span class="tag"><strong>Latest Week</strong> ${escapeHtml(formatWeekLabel(latestWeek.weekStart))}</span>
          <span class="tag"><strong>Projects</strong> ${formatNumber(latestWeek.projects)}</span>
          <span class="tag"><strong>Series Shown</strong> ${formatNumber(visibleSeries.length)}</span>
        </div>
      </div>
      ${renderTimelineChart(timeline, visibleSeries)}
      <div class="timeline-legend">
        ${visibleSeries
          .map((series, index) => {
            const color = getTimelineColor(index);
            const latestPoint = series.weekly.at(-1);
            const latestShare =
              !latestPoint || latestWeek.projects === 0
                ? 0
                : round((latestPoint.projects / latestWeek.projects) * 100, 1);

            return `
              <div class="timeline-legend-item">
                <span class="timeline-swatch" style="--timeline-color: ${color}"></span>
                <div>
                  <div class="dist-label">${escapeHtml(series.value)}</div>
                  <div class="dist-note">${formatNumber(series.totalProjects)} project-weeks · ${formatPercent(latestShare)} in the latest week</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
      ${options.note ? `<p class="dist-note">${escapeHtml(options.note)}</p>` : ''}
    </article>
  `;
}

function renderTimelineChart(
  timeline: VersionTimeline,
  visibleSeries: VersionTimeline['series'],
): string {
  const viewWidth = 560;
  const viewHeight = 220;
  const leftPad = 42;
  const rightPad = 12;
  const topPad = 16;
  const bottomPad = 30;
  const chartWidth = viewWidth - leftPad - rightPad;
  const chartHeight = viewHeight - topPad - bottomPad;
  const weeksByStart = new Map(timeline.weeks.map(week => [week.weekStart, week.projects]));
  const maxShare = Math.max(
    ...visibleSeries.flatMap(series =>
      series.weekly.map(point => {
        const totalProjects = weeksByStart.get(point.weekStart) ?? 0;
        return totalProjects === 0 ? 0 : (point.projects / totalProjects) * 100;
      }),
    ),
    0,
  );
  const axisMax = Math.max(5, Math.ceil(maxShare / 5) * 5);
  const divisor = Math.max(timeline.weeks.length - 1, 1);
  const yTicks = [axisMax, axisMax / 2, 0];
  const xLabelIndexes =
    timeline.weeks.length === 1
      ? [0]
      : [...new Set([0, Math.floor((timeline.weeks.length - 1) / 2), timeline.weeks.length - 1])];

  const gridLines = yTicks
    .map(tick => {
      const y = topPad + chartHeight - (tick / axisMax) * chartHeight;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${viewWidth - rightPad}" y2="${y}" class="timeline-grid-line" />
        <text x="${leftPad - 8}" y="${y + 4}" class="timeline-axis-label">${formatPercent(tick)}</text>
      `;
    })
    .join('');

  const xLabels = xLabelIndexes
    .map(index => {
      const x = leftPad + (index / divisor) * chartWidth;
      return `<text x="${x}" y="${viewHeight - 8}" text-anchor="middle" class="timeline-axis-label">${escapeHtml(
        formatWeekLabel(timeline.weeks[index]!.weekStart),
      )}</text>`;
    })
    .join('');

  const seriesPaths = visibleSeries
    .map((series, index) => {
      const color = getTimelineColor(index);
      const points = series.weekly
        .map((point, pointIndex) => {
          const x = leftPad + (pointIndex / divisor) * chartWidth;
          const totalProjects = weeksByStart.get(point.weekStart) ?? 0;
          const share = totalProjects === 0 ? 0 : (point.projects / totalProjects) * 100;
          const y = topPad + chartHeight - (share / axisMax) * chartHeight;
          return `${round(x, 2)},${round(y, 2)}`;
        })
        .join(' ');
      const latestPoint = series.weekly.at(-1);
      const latestShare =
        !latestPoint || latestWeekProjects(timeline) === 0
          ? 0
          : (latestPoint.projects / latestWeekProjects(timeline)) * 100;
      const latestX = leftPad + ((series.weekly.length - 1) / divisor) * chartWidth;
      const latestY = topPad + chartHeight - (latestShare / axisMax) * chartHeight;

      return `
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${round(latestX, 2)}" cy="${round(latestY, 2)}" r="4" fill="${color}" />
      `;
    })
    .join('');

  return `
    <div class="timeline-chart">
      <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Weekly adoption timeline">
        ${gridLines}
        ${seriesPaths}
        ${xLabels}
      </svg>
    </div>
  `;
}

function renderGroupSection(category: string, fields: AggregatedField[]): string {
  if (fields.length === 0) {
    return '';
  }

  return `
    <section class="group-section">
      <div class="section-header">
        <div>
          <h2>${escapeHtml(humanizeCategory(category))}</h2>
          <p>${escapeHtml(CATEGORY_COPY[category] ?? CATEGORY_COPY.other)}</p>
        </div>
        <div class="tag-row">
          <span class="tag"><strong>Fields</strong> ${formatNumber(fields.length)}</span>
        </div>
      </div>
      <div class="field-grid">
        ${fields.map(renderFieldCard).join('')}
      </div>
    </section>
  `;
}

function renderFieldCard(field: AggregatedField): string {
  const platformTags = field.platformDetails.map(platform => {
    const typeLabel = platform.summary.redshiftType;
    return `
      <span class="tag">
        <strong>${escapeHtml(platform.shortLabel)}</strong>
        ${escapeHtml(typeLabel)} · ${formatPercent(platform.summary.coverage.percent)}
      </span>
    `;
  });

  const primaryDistribution =
    field.semanticType === 'count'
      ? ''
      : field.semanticType === 'version'
        ? (field.tokenValues?.length ? field.tokenValues : field.topValues).length > 0
          ? `
              <div>
                <div class="muted-copy">Top versions</div>
                ${renderDistributionList(
                  (field.tokenValues?.length ? field.tokenValues : field.topValues).slice(0, 8),
                  field.tokenValues?.length ? field.tokenValues : field.topValues,
                  field.tokenValues?.length ? field.coverage.nonNull : field.coverage.total,
                )}
              </div>
            `
          : '<div class="empty-copy">No version distribution available.</div>'
        : field.topValues.length > 0
          ? `
              <div>
                <div class="muted-copy">Top exact values</div>
                ${renderDistributionList(field.topValues.slice(0, 8), field.topValues, field.coverage.total)}
              </div>
            `
          : '<div class="empty-copy">No exact-value distribution available.</div>';

  const secondaryDistribution =
    field.semanticType === 'count' || field.semanticType === 'version' || !field.tokenValues?.length
      ? ''
      : `
          <div>
            <div class="muted-copy">Top split tokens</div>
            ${renderDistributionList(field.tokenValues.slice(0, 8), field.tokenValues, field.coverage.nonNull)}
          </div>
        `;

  const numericStats = field.numeric
    ? field.semanticType === 'version'
      ? ''
      : field.semanticType === 'count'
        ? `
            <div class="stat-grid">
              <div class="stat">
                <div class="stat-label">Rows &gt; 0</div>
                <div class="stat-value">${formatNumber(field.numeric.positiveRows)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Rows = 0</div>
                <div class="stat-value">${formatNumber(field.numeric.zeroRows)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Average / Row</div>
                <div class="stat-value">${formatCompact(field.numeric.avg)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Max</div>
                <div class="stat-value">${formatCompact(field.numeric.max)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total</div>
                <div class="stat-value">${formatCompact(field.numeric.sum)}</div>
              </div>
            </div>
          `
        : `
            <div class="stat-grid">
              <div class="stat">
                <div class="stat-label">Min</div>
                <div class="stat-value">${formatCompact(field.numeric.min)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Max</div>
                <div class="stat-value">${formatCompact(field.numeric.max)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Average</div>
                <div class="stat-value">${formatCompact(field.numeric.avg)}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Sum</div>
                <div class="stat-value">${formatCompact(field.numeric.sum)}</div>
              </div>
            </div>
          `
    : '';

  const distributionGrid =
    primaryDistribution || secondaryDistribution
      ? `
          <div class="duo-grid">
            ${primaryDistribution}
            ${secondaryDistribution}
          </div>
        `
      : '';

  return `
    <article class="field-card">
      <div class="field-header">
        <div>
          <h3>${escapeHtml(field.meta.displayName)}</h3>
          <p class="field-subtitle">${escapeHtml(field.meta.key)}<br />${escapeHtml(field.meta.columnName)}</p>
        </div>
        <span class="chip ${field.valueListTruncated ? 'warn' : ''}">
          ${escapeHtml(humanizeFieldSemantic(field.semanticType, field.valueType))}
          ${field.valueListTruncated ? ' · truncated' : ''}
        </span>
      </div>

      <div class="platform-row">
        ${platformTags.join('')}
      </div>

      <div class="coverage">
        <div class="coverage-line">
          <span>Coverage</span>
          <span>${formatNumber(field.coverage.nonNull)} / ${formatNumber(field.coverage.total)} (${formatPercent(
            field.coverage.percent,
          )})</span>
        </div>
        <div class="meter"><div class="meter-fill" style="width: ${field.coverage.percent}%"></div></div>
      </div>

      ${numericStats}

      ${distributionGrid}

      ${
        field.valueListTruncated
          ? '<div class="dist-note">Only the most frequent distinct values are stored in the snapshot for this field.</div>'
          : ''
      }
    </article>
  `;
}

function renderDistributionList(
  items: DistributionValue[],
  fullList: DistributionValue[],
  denominator: number,
): string {
  if (items.length === 0) {
    return '<div class="empty-copy">No values in the current selection.</div>';
  }

  const maxCount = Math.max(...fullList.map(item => item.count), 1);
  return `
    <div class="dist-list">
      ${items
        .map(item => {
          const percent = denominator === 0 ? 0 : round((item.count / denominator) * 100, 1);
          const width = round((item.count / maxCount) * 100, 1);

          return `
            <div class="dist-row">
              <div class="dist-label-row">
                <div class="dist-label">${escapeHtml(item.value)}</div>
                <div class="dist-meta">${formatNumber(item.count)} · ${formatPercent(percent)}</div>
              </div>
              <div class="dist-bar">
                <div class="dist-bar-fill" style="width: ${width}%"></div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function getVisibleCatalog(
  snapshot: TelemetrySnapshot,
  selectedPlatforms: PlatformId[],
  search: string,
  sort: SortKey,
): CatalogField[] {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = snapshot.catalog.filter(field => {
    if (!selectedPlatforms.some(platformId => field.availability[platformId])) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const haystack = [field.displayName, field.key, field.columnName, field.category]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  return filtered.sort((left, right) => {
    const leftField = aggregateField(left, snapshot, selectedPlatforms);
    const rightField = aggregateField(right, snapshot, selectedPlatforms);
    const leftCoverage = leftField?.coverage.percent ?? 0;
    const rightCoverage = rightField?.coverage.percent ?? 0;

    if (sort === 'alphabetical') {
      return left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key);
    }

    if (sort === 'sparsest') {
      return leftCoverage - rightCoverage || left.displayName.localeCompare(right.displayName);
    }

    return rightCoverage - leftCoverage || left.displayName.localeCompare(right.displayName);
  });
}

function groupFields(fields: AggregatedField[]): Map<string, AggregatedField[]> {
  const grouped = new Map<string, AggregatedField[]>();

  for (const field of fields) {
    const list = grouped.get(field.meta.category) ?? [];
    list.push(field);
    grouped.set(field.meta.category, list);
  }

  return grouped;
}

function getSelectedPlatforms(currentState: AppState): PlatformId[] {
  return (['sq', 'sc'] as PlatformId[]).filter(platformId =>
    currentState.selectedPlatforms.has(platformId),
  );
}

function getAggregatedProgramCreationOverview(
  snapshot: TelemetrySnapshot,
  selectedPlatforms: PlatformId[],
): ProgramCreationOverview | undefined {
  const overviews = selectedPlatforms
    .map(platformId => snapshot.overview?.programCreation?.[platformId])
    .filter((overview): overview is ProgramCreationOverview => overview !== undefined);

  if (overviews.length === 0) {
    return undefined;
  }

  const byVersion = new Map<string, ProgramCreationVersionOverview>();
  const atOrAboveVersion = new Map<string, ProgramCreationVersionOverview>();
  const aggregate: ProgramCreationOverview = {
    projects: 0,
    projectsWithFailures: 0,
    attempts: 0,
    succeeded: 0,
    failed: 0,
    byVersion: [],
    atOrAboveVersion: [],
  };

  for (const overview of overviews) {
    aggregate.projects += overview.projects;
    aggregate.projectsWithFailures += overview.projectsWithFailures;
    aggregate.attempts += overview.attempts;
    aggregate.succeeded += overview.succeeded;
    aggregate.failed += overview.failed;

    for (const entry of overview.byVersion) {
      const merged =
        byVersion.get(entry.version) ??
        {
          version: entry.version,
          projects: 0,
          projectsWithFailures: 0,
          attempts: 0,
          succeeded: 0,
          failed: 0,
        };

      merged.projects += entry.projects;
      merged.projectsWithFailures += entry.projectsWithFailures;
      merged.attempts += entry.attempts;
      merged.succeeded += entry.succeeded;
      merged.failed += entry.failed;
      byVersion.set(entry.version, merged);
    }

    for (const entry of overview.atOrAboveVersion) {
      const merged =
        atOrAboveVersion.get(entry.version) ??
        {
          version: entry.version,
          projects: 0,
          projectsWithFailures: 0,
          attempts: 0,
          succeeded: 0,
          failed: 0,
        };

      merged.projects += entry.projects;
      merged.projectsWithFailures += entry.projectsWithFailures;
      merged.attempts += entry.attempts;
      merged.succeeded += entry.succeeded;
      merged.failed += entry.failed;
      atOrAboveVersion.set(entry.version, merged);
    }
  }

  aggregate.byVersion = [...byVersion.values()].sort(
    (left, right) =>
      right.failed - left.failed ||
      right.projectsWithFailures - left.projectsWithFailures ||
      right.projects - left.projects ||
      left.version.localeCompare(right.version),
  );
  aggregate.atOrAboveVersion = [...atOrAboveVersion.values()].sort(
    (left, right) => left.version.localeCompare(right.version),
  );

  return aggregate;
}

function getAggregatedVersionTimeline(
  snapshot: TelemetrySnapshot,
  selectedPlatforms: PlatformId[],
  key: keyof PlatformTimelineOverview,
): VersionTimeline | undefined {
  const timelines = selectedPlatforms
    .map(platformId => snapshot.overview?.timelines?.[platformId]?.[key])
    .filter((timeline): timeline is VersionTimeline => timeline !== undefined);

  if (timelines.length === 0) {
    return undefined;
  }

  const weeks = new Map<string, number>();
  const seriesCounts = new Map<string, Map<string, number>>();

  for (const timeline of timelines) {
    for (const week of timeline.weeks) {
      weeks.set(week.weekStart, (weeks.get(week.weekStart) ?? 0) + week.projects);
    }

    for (const series of timeline.series) {
      const weeklyCounts = seriesCounts.get(series.value) ?? new Map<string, number>();

      for (const point of series.weekly) {
        weeklyCounts.set(point.weekStart, (weeklyCounts.get(point.weekStart) ?? 0) + point.projects);
      }

      seriesCounts.set(series.value, weeklyCounts);
    }
  }

  const mergedWeeks = [...weeks.entries()]
    .map(([weekStart, projects]) => ({ weekStart, projects }))
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart));

  const mergedSeries = [...seriesCounts.entries()]
    .map(([value, weeklyCounts]) => {
      const weekly = mergedWeeks.map(week => ({
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
    weeks: mergedWeeks,
    series: mergedSeries,
  };
}

function aggregateField(
  field: CatalogField,
  snapshot: TelemetrySnapshot,
  selectedPlatforms: PlatformId[],
): AggregatedField | undefined {
  const platformDetails = selectedPlatforms
    .map(platformId => {
      const summary = snapshot.platforms[platformId].fields[field.key];
      if (!summary) {
        return undefined;
      }

      return {
        id: platformId,
        label: snapshot.platforms[platformId].label,
        shortLabel: snapshot.platforms[platformId].shortLabel,
        summary,
      };
    })
    .filter((entry): entry is AggregatedField['platformDetails'][number] => entry !== undefined);

  if (platformDetails.length === 0) {
    return undefined;
  }

  const coverage = platformDetails.reduce(
    (sum, platform) => ({
      total: sum.total + platform.summary.coverage.total,
      nonNull: sum.nonNull + platform.summary.coverage.nonNull,
      percent: 0,
    }),
    { total: 0, nonNull: 0, percent: 0 },
  );

  coverage.percent = coverage.total === 0 ? 0 : round((coverage.nonNull / coverage.total) * 100, 1);

  const topValues = mergeDistributions(
    platformDetails.map(platform => platform.summary.topValues),
    coverage.total,
    16,
  );
  const tokenValues = mergeDistributions(
    platformDetails
      .map(platform => platform.summary.tokenValues ?? [])
      .filter(values => values.length > 0),
    coverage.nonNull,
    16,
  );

  const numericSummaries = platformDetails
    .map(platform => platform.summary.numeric)
    .filter((summary): summary is NumericSummary => summary !== undefined);

  const numeric =
    numericSummaries.length > 0
      ? {
          numericRows: numericSummaries.reduce((sum, summary) => sum + summary.numericRows, 0),
          zeroRows: numericSummaries.reduce((sum, summary) => sum + summary.zeroRows, 0),
          positiveRows: numericSummaries.reduce((sum, summary) => sum + summary.positiveRows, 0),
          min: Math.min(...numericSummaries.map(summary => summary.min)),
          max: Math.max(...numericSummaries.map(summary => summary.max)),
          avg: 0,
          sum: numericSummaries.reduce((sum, summary) => sum + summary.sum, 0),
        }
      : undefined;

  if (numeric) {
    numeric.avg = numeric.numericRows === 0 ? 0 : round(numeric.sum / numeric.numericRows);
  }

  const valueType = collapseValueTypes(platformDetails.map(platform => platform.summary.valueType));
  const semanticType = collapseSemanticTypes(
    platformDetails.map(platform => platform.summary.semanticType),
  );

  return {
    meta: field,
    coverage,
    topValues,
    tokenValues: tokenValues.length > 0 ? tokenValues : undefined,
    valueType,
    semanticType,
    numeric,
    valueListTruncated: platformDetails.some(platform => platform.summary.valueListTruncated),
    platformDetails,
  };
}

function mergeDistributions(
  lists: DistributionValue[][],
  denominator: number,
  limit: number,
): DistributionValue[] {
  const counts = new Map<string, number>();

  for (const list of lists) {
    for (const entry of list) {
      counts.set(entry.value, (counts.get(entry.value) ?? 0) + entry.count);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      percent: denominator === 0 ? 0 : round((count / denominator) * 100, 1),
    }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit);
}

function collapseValueTypes(types: FieldValueType[]): FieldValueType {
  const filtered = [...new Set(types.filter(type => type !== 'unknown'))];
  if (filtered.length === 0) {
    return 'unknown';
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  return 'mixed';
}

function collapseSemanticTypes(types: FieldSemanticType[]): FieldSemanticType {
  const uniqueTypes = [...new Set(types)];
  if (uniqueTypes.length === 1) {
    return uniqueTypes[0]!;
  }
  if (uniqueTypes.includes('count')) {
    return 'count';
  }
  if (uniqueTypes.includes('version')) {
    return 'version';
  }
  if (uniqueTypes.includes('boolean')) {
    return 'boolean';
  }
  if (uniqueTypes.includes('metric')) {
    return 'metric';
  }
  return 'dimension';
}

function getAggregatedField(
  fieldKey: string,
  snapshot: TelemetrySnapshot,
  selectedPlatforms: PlatformId[],
): AggregatedField | undefined {
  const catalogField = snapshot.catalog.find(field => field.key === fieldKey);
  if (!catalogField) {
    return undefined;
  }

  return aggregateField(catalogField, snapshot, selectedPlatforms);
}

function humanizeCategory(category: string): string {
  return category
    .split('-')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function humanizeValueType(type: FieldValueType): string {
  switch (type) {
    case 'boolean':
      return 'Boolean';
    case 'mixed':
      return 'Mixed';
    case 'number':
      return 'Numeric';
    case 'string':
      return 'Text';
    default:
      return 'Unknown';
  }
}

function humanizeFieldSemantic(
  semanticType: FieldSemanticType,
  valueType: FieldValueType,
): string {
  switch (semanticType) {
    case 'boolean':
      return 'Boolean';
    case 'count':
      return 'Count';
    case 'metric':
      return 'Measure';
    case 'version':
      return 'Version';
    default:
      return humanizeValueType(valueType);
  }
}

function getSourceLabel(source: TelemetrySnapshot['source']): string {
  switch (source) {
    case 'redshift':
      return 'Live warehouse data';
    case 'sample':
      return 'Sample data';
    default:
      return 'No local data';
  }
}

function getSourceDescription(source: TelemetrySnapshot['source']): string {
  switch (source) {
    case 'redshift':
      return 'Live warehouse snapshot';
    case 'sample':
      return 'Committed sample snapshot';
    default:
      return 'Empty placeholder snapshot';
  }
}

function renderError(error: unknown): void {
  app.innerHTML = `
    <section class="error-state">
      <div class="error-card">
        <h1>Failed to load telemetry snapshot</h1>
        <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
      </div>
    </section>
  `;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatWeekLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (Number.isInteger(value)) {
    return formatNumber(value);
  }

  return value.toFixed(2);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}

function latestWeekProjects(timeline: VersionTimeline): number {
  return timeline.weeks.at(-1)?.projects ?? 0;
}

function getTimelineColor(index: number): string {
  const colors = ['#0a7c66', '#f2a65a', '#2159a8', '#cf7a00', '#7a3e00', '#698f2a'];
  return colors[index % colors.length]!;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
