import type { CombinedData, RuleData, DatasetMetadata } from './types.js';

declare const agGrid: any;

let gridApi: any;
let allRules: RuleData[] = [];
let metadata: DatasetMetadata | null = null;
let currentRule: RuleData | null = null;
let commentsLimit = 10;
const COMMENTS_PAGE_SIZE = 10;

// Column definitions for AG Grid
const columnDefs = [
  {
    field: 'ruleKey',
    headerName: 'Rule',
    width: 100,
    pinned: 'left',
    cellRenderer: (params: any) => {
      const link = `https://sonarsource.github.io/rspec/#/rspec/${params.value}/javascript`;
      return `<a href="${link}" target="_blank" style="color: #4b9fd5;">${params.value}</a>`;
    },
  },
  {
    field: 'title',
    headerName: 'Title',
    flex: 2,
    minWidth: 200,
  },
  {
    field: 'severity',
    headerName: 'Severity',
    width: 143,
    cellClass: (params: any) => `severity-${params.value?.toLowerCase()}`,
  },
  {
    field: 'feedbackCount',
    headerName: 'Feedback',
    width: 143,
    sort: 'desc',
    cellStyle: (params: any) => {
      if (params.value > 10) return { backgroundColor: '#fff3cd' };
      if (params.value > 0) return { backgroundColor: '#f8f9fa' };
      return null;
    },
  },
  {
    headerName: 'Issues',
    headerTooltip: 'Atlan: Total issues found',
    field: 'atlan.issuesCount',
    width: 127,
    valueGetter: (params: any) => params.data.atlan?.issuesCount || 0,
    valueFormatter: (params: any) => params.value?.toLocaleString() || '0',
  },
  {
    headerName: 'FP%',
    headerTooltip: 'Atlan: False positive percentage',
    field: 'atlan.fpPercent',
    width: 110,
    valueGetter: (params: any) => params.data.atlan?.fpPercent || 0,
    valueFormatter: (params: any) => `${(params.value * 100).toFixed(1)}%`,
  },
  {
    headerName: 'Net Ratio',
    headerTooltip: 'Atlan: Net value ratio (positive = good)',
    field: 'atlan.netRatio',
    width: 138,
    valueGetter: (params: any) => params.data.atlan?.netRatio || 0,
    valueFormatter: (params: any) => params.value?.toFixed(2) || '0',
    cellStyle: (params: any) => {
      if (params.value < 0) return { color: '#d02f3a' };
      if (params.value > 0.5) return { color: '#00aa00' };
      return null;
    },
  },
  {
    field: 'jiraTicketCount',
    headerName: 'Tickets',
    headerTooltip: 'Jira: Number of tickets mentioning this rule',
    width: 121,
    cellStyle: (params: any) => {
      if (params.value > 0) return { backgroundColor: '#cfe2ff' };
      return null;
    },
  },
  {
    field: 'language',
    headerName: 'Lang',
    width: 99,
  },
  {
    field: 'scope',
    headerName: 'Scope',
    headerTooltip: 'Rule scope: Main, Test, or Both',
    width: 110,
  },
  {
    field: 'quickfix',
    headerName: 'QF',
    headerTooltip: 'Quick Fix availability: ✓=covered, ◐=targeted/partial, ✗=infeasible',
    width: 88,
    cellRenderer: (params: any) => {
      if (params.value === 'covered') return '✓';
      if (params.value === 'targeted' || params.value === 'partial') return '◐';
      if (params.value === 'infeasible') return '✗';
      return '';
    },
    cellStyle: (params: any) => {
      if (params.value === 'covered') return { color: '#00aa00', textAlign: 'center' };
      if (params.value === 'targeted' || params.value === 'partial')
        return { color: '#f0ad4e', textAlign: 'center' };
      if (params.value === 'infeasible') return { color: '#999', textAlign: 'center' };
      return { textAlign: 'center' };
    },
  },
];

// Row class for Sonar Way highlighting
function getRowClass(params: any) {
  if (params.data?.sonarWay) {
    return 'sonar-way-row';
  }
  return '';
}

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
};

function updateStatusBar(meta: DatasetMetadata) {
  const statusInfo = document.getElementById('statusInfo');
  if (!statusInfo) return;

  const feedbackFilesText = meta.feedbackCsvFiles?.length
    ? `${meta.feedbackCsvFiles.length} files (${meta.feedbackTotalRows} rows)`
    : 'N/A';

  statusInfo.innerHTML = `
    <span class="status-item">
      <strong>${meta.totalRules}</strong> rules
    </span>
    <span class="status-item">
      <strong>${meta.rulesWithFeedback}</strong> with feedback
    </span>
    <span class="status-item">
      <strong>${meta.rulesWithJiraTickets}</strong> with tickets
    </span>
    <span class="status-item" title="${meta.feedbackCsvFiles?.join(', ') || 'N/A'}">
      Feedback: <strong>${feedbackFilesText}</strong>
    </span>
    <span class="status-item">
      Atlan: <strong>${meta.atlanCsvDate || 'N/A'}</strong>
    </span>
    <span class="status-item">
      Jira: <strong>${meta.jiraFetchDate || 'N/A'}</strong>
    </span>
  `;
}

function showDetailPanel(rule: RuleData, resetLimit = true) {
  const panel = document.getElementById('detailPanel');
  const title = document.getElementById('detailTitle');
  const content = document.getElementById('detailContent');

  if (!panel || !title || !content) return;

  currentRule = rule;
  if (resetLimit) {
    commentsLimit = COMMENTS_PAGE_SIZE;
  }

  title.textContent = `${rule.ruleKey}: ${rule.title}`;

  const rspecLink = `https://sonarsource.github.io/rspec/#/rspec/${rule.ruleKey}/javascript`;
  const jiraLink = `https://jira.sonarsource.com/issues/?jql=project=JS AND text~"${rule.ruleKey}"`;

  content.innerHTML = `
    <!-- Basic Info -->
    <div class="detail-section">
      <h3>Rule Info</h3>
      <div class="detail-row">
        <span class="label">Type</span>
        <span class="value">${rule.type}</span>
      </div>
      <div class="detail-row">
        <span class="label">Severity</span>
        <span class="value">${rule.severity}</span>
      </div>
      <div class="detail-row">
        <span class="label">Tags</span>
        <span class="value">${rule.tags.join(', ') || 'None'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Language</span>
        <span class="value">${rule.language}</span>
      </div>
      <div class="detail-row">
        <span class="label">Sonar Way</span>
        <span class="value" style="color: ${rule.sonarWay ? '#00aa00' : '#999'}">${rule.sonarWay ? 'Yes' : 'No'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Scope</span>
        <span class="value">${rule.scope}</span>
      </div>
      <div class="detail-row">
        <span class="label">Quick Fix</span>
        <span class="value">${rule.quickfix}</span>
      </div>
      <div class="detail-links">
        <a href="${rspecLink}" target="_blank">View RSPEC</a>
        <a href="${jiraLink}" target="_blank">Search Jira</a>
      </div>
      <div style="margin-top: 12px;">
        <button class="btn-claude" id="fixWithClaudeBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          Fix with Claude
        </button>
      </div>
    </div>

    <!-- User Feedback Stats -->
    <div class="detail-section">
      <h3>User Feedback (${rule.feedbackCount})</h3>
      <div class="detail-row">
        <span class="label">Total Reports</span>
        <span class="value">${rule.feedbackCount}</span>
      </div>
      <div class="detail-row">
        <span class="label">False Positives</span>
        <span class="value">${rule.fpCount}</span>
      </div>
      <div class="detail-row">
        <span class="label">Won't Fix</span>
        <span class="value">${rule.wontfixCount}</span>
      </div>
    </div>

    <!-- Atlan Stats -->
    ${
      rule.atlan
        ? `
    <div class="detail-section">
      <h3>Atlan Statistics</h3>
      <div class="detail-row">
        <span class="label">Total Issues</span>
        <span class="value">${rule.atlan.issuesCount.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="label">Projects Affected</span>
        <span class="value">${rule.atlan.projectsCount.toLocaleString()} (${(rule.atlan.projectsPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">Accepted</span>
        <span class="value">${rule.atlan.acceptCount.toLocaleString()} (${(rule.atlan.acceptPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">False Positives</span>
        <span class="value">${rule.atlan.fpCount.toLocaleString()} (${(rule.atlan.fpPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">Fixed</span>
        <span class="value">${rule.atlan.fixedCount.toLocaleString()} (${(rule.atlan.fixedPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">Removed</span>
        <span class="value">${rule.atlan.removedCount.toLocaleString()} (${(rule.atlan.removedPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">Resolved</span>
        <span class="value">${rule.atlan.resolvedCount.toLocaleString()} (${(rule.atlan.resolvedPercent * 100).toFixed(1)}%)</span>
      </div>
      <div class="detail-row">
        <span class="label">Net Value</span>
        <span class="value">${rule.atlan.netValue.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="label">Net Ratio</span>
        <span class="value" style="color: ${rule.atlan.netRatio < 0 ? '#d02f3a' : '#00aa00'}">${rule.atlan.netRatio.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Net Negative</span>
        <span class="value">${rule.atlan.netNegative}</span>
      </div>
    </div>
    `
        : `
    <div class="detail-section">
      <h3>Atlan Statistics</h3>
      <p style="color: #666; font-size: 13px;">No Atlan data available for this rule.</p>
    </div>
    `
    }

    <!-- Jira Tickets -->
    <div class="detail-section">
      <h3>Jira Tickets (${rule.jiraTicketCount})</h3>
      ${
        rule.jiraTickets.length > 0
          ? rule.jiraTickets
              .map(
                ticket => `
        <div class="ticket-item">
          <a href="https://jira.sonarsource.com/browse/${ticket.key}" target="_blank">${ticket.key}</a>
          <span class="status">[${ticket.status}]</span>
          <div style="color: #333; margin-top: 4px;">${ticket.summary}</div>
        </div>
      `,
              )
              .join('')
          : '<p style="color: #666; font-size: 13px;">No Jira tickets found.</p>'
      }
    </div>

    <!-- User Feedback Comments -->
    <div class="detail-section">
      <h3>Recent Feedback Comments</h3>
      ${
        rule.feedbackComments.length > 0
          ? rule.feedbackComments
              .slice(0, commentsLimit)
              .map(
                fb => `
        <div class="feedback-item">
          <div>${fb.comment || '<em>No comment</em>'}</div>
          <div class="meta">
            <span style="color: #236a97;">${fb.resolution}</span> - ${fb.date}
          </div>
          <div class="meta" style="margin-top: 2px;">
            <strong>${fb.fileName || 'Unknown file'}</strong>${fb.line ? `:${fb.line}` : ''}
            ${fb.projectKey ? ` <span style="color: #999;">in ${fb.projectKey}</span>` : ''}
          </div>
          <div class="meta" style="margin-top: 4px;">
            ${fb.fileUrl ? `<a href="${fb.fileUrl}" target="_blank" style="color: #4b9fd5;">AWS S3</a>` : ''}
            ${fb.issueUrl ? `<a href="${fb.issueUrl}" target="_blank" style="color: #4b9fd5; margin-left: 8px;">SonarCloud Issue</a>` : ''}
          </div>
        </div>
      `,
              )
              .join('')
          : '<p style="color: #666; font-size: 13px;">No feedback comments.</p>'
      }
      ${rule.feedbackComments.length > commentsLimit ? `<p style="color: #666; font-size: 12px;"><a href="#" id="showMoreComments" style="color: #4b9fd5;">Show ${Math.min(COMMENTS_PAGE_SIZE, rule.feedbackComments.length - commentsLimit)} more</a> (${rule.feedbackComments.length - commentsLimit} remaining)</p>` : ''}
    </div>
  `;

  panel.classList.add('open');

  // Attach click handler for "show more" link
  const showMoreLink = document.getElementById('showMoreComments');
  if (showMoreLink) {
    showMoreLink.addEventListener('click', e => {
      e.preventDefault();
      showMoreComments();
    });
  }

  // Attach click handler for "Fix with Claude" button
  const fixWithClaudeBtn = document.getElementById('fixWithClaudeBtn');
  if (fixWithClaudeBtn) {
    fixWithClaudeBtn.addEventListener('click', () => {
      openClaudeForRule(rule);
    });
  }
}

function showMoreComments() {
  if (!currentRule) return;
  commentsLimit += COMMENTS_PAGE_SIZE;
  showDetailPanel(currentRule, false);
}

function hideDetailPanel() {
  const panel = document.getElementById('detailPanel');
  if (panel) {
    panel.classList.remove('open');
  }
}

function isDefaultState(): boolean {
  const languageFilter = (document.getElementById('languageFilter') as HTMLSelectElement)?.value;
  const scopeFilter = (document.getElementById('scopeFilter') as HTMLSelectElement)?.value;
  const quickfixFilter = (document.getElementById('quickfixFilter') as HTMLSelectElement)?.value;
  const feedbackFilter = (document.getElementById('feedbackFilter') as HTMLSelectElement)?.value;
  const ticketsFilter = (document.getElementById('ticketsFilter') as HTMLSelectElement)?.value;
  const sonarWayFilter = (document.getElementById('sonarWayFilter') as HTMLSelectElement)?.value;

  const filtersDefault =
    languageFilter === 'all' &&
    scopeFilter === 'all' &&
    quickfixFilter === 'all' &&
    feedbackFilter === 'all' &&
    ticketsFilter === 'all' &&
    sonarWayFilter === 'all';

  // Check if sort is default (Feedback descending)
  let sortDefault = true;
  if (gridApi) {
    const sortModel = gridApi
      .getColumnState()
      .filter((col: any) => col.sort)
      .map((col: any) => ({ colId: col.colId, sort: col.sort }));

    // Default is feedbackCount desc
    if (sortModel.length === 0) {
      sortDefault = false;
    } else if (
      sortModel.length === 1 &&
      sortModel[0].colId === 'feedbackCount' &&
      sortModel[0].sort === 'desc'
    ) {
      sortDefault = true;
    } else {
      sortDefault = false;
    }
  }

  return filtersDefault && sortDefault;
}

function updateResetButtonState() {
  const resetBtn = document.getElementById('resetFilters') as HTMLButtonElement;
  if (resetBtn) {
    resetBtn.disabled = isDefaultState();
  }
}

function resetFilters() {
  (document.getElementById('languageFilter') as HTMLSelectElement).value = 'all';
  (document.getElementById('scopeFilter') as HTMLSelectElement).value = 'all';
  (document.getElementById('quickfixFilter') as HTMLSelectElement).value = 'all';
  (document.getElementById('feedbackFilter') as HTMLSelectElement).value = 'all';
  (document.getElementById('ticketsFilter') as HTMLSelectElement).value = 'all';
  (document.getElementById('sonarWayFilter') as HTMLSelectElement).value = 'all';

  // Reset sort to default (Feedback descending)
  if (gridApi) {
    gridApi.applyColumnState({
      state: [{ colId: 'feedbackCount', sort: 'desc' }],
      defaultState: { sort: null },
    });
  }

  applyFilters();
  updateResetButtonState();
}

function applyFilters() {
  const languageFilter =
    (document.getElementById('languageFilter') as HTMLSelectElement)?.value || 'all';
  const scopeFilter = (document.getElementById('scopeFilter') as HTMLSelectElement)?.value || 'all';
  const quickfixFilter =
    (document.getElementById('quickfixFilter') as HTMLSelectElement)?.value || 'all';
  const feedbackFilter =
    (document.getElementById('feedbackFilter') as HTMLSelectElement)?.value || 'all';
  const ticketsFilter =
    (document.getElementById('ticketsFilter') as HTMLSelectElement)?.value || 'all';
  const sonarWayFilter =
    (document.getElementById('sonarWayFilter') as HTMLSelectElement)?.value || 'all';

  let filtered = allRules;

  if (languageFilter !== 'all') {
    filtered = filtered.filter(r => r.language === languageFilter || r.language === 'both');
  }

  if (scopeFilter !== 'all') {
    filtered = filtered.filter(r => r.scope === scopeFilter);
  }

  if (quickfixFilter !== 'all') {
    filtered = filtered.filter(r => r.quickfix === quickfixFilter);
  }

  if (feedbackFilter === 'with') {
    filtered = filtered.filter(r => r.feedbackCount > 0);
  } else if (feedbackFilter === 'without') {
    filtered = filtered.filter(r => r.feedbackCount === 0);
  }

  if (ticketsFilter === 'with') {
    filtered = filtered.filter(r => r.jiraTicketCount > 0);
  } else if (ticketsFilter === 'without') {
    filtered = filtered.filter(r => r.jiraTicketCount === 0);
  }

  if (sonarWayFilter === 'yes') {
    filtered = filtered.filter(r => r.sonarWay);
  } else if (sonarWayFilter === 'no') {
    filtered = filtered.filter(r => !r.sonarWay);
  }

  gridApi.setGridOption('rowData', filtered);
  updateResetButtonState();
}

// Open Claude in terminal with rule context
async function openClaudeForRule(rule: RuleData) {
  // Fetch RSPEC HTML first
  let rspecHtml = '';
  try {
    const response = await fetch(`/api/rspec/${rule.ruleKey}`);
    if (response.ok) {
      const data = await response.json();
      rspecHtml = data.html;
    }
  } catch (err) {
    console.error('Failed to fetch RSPEC:', err);
  }

  // Call API to open Claude in terminal
  try {
    const response = await fetch('/api/open-claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleData: rule, rspecHtml }),
    });

    if (response.ok) {
      console.log('Opening Claude in Terminal...');
    } else {
      alert('Failed to open Claude. Make sure the server is running.');
    }
  } catch (err) {
    console.error('Failed to open Claude:', err);
    alert('Failed to open Claude. Make sure the server is running.');
  }
}

async function loadData(): Promise<CombinedData | null> {
  try {
    const response = await fetch('data/combined.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Failed to load data:', err);
    const statusInfo = document.getElementById('statusInfo');
    if (statusInfo) {
      statusInfo.innerHTML = `
        <span style="color: #d02f3a;">
          Failed to load data. Run: <code>npm run build-data</code>
        </span>
      `;
    }
    return null;
  }
}

async function init() {
  const data = await loadData();
  if (!data) return;

  allRules = data.rules;
  metadata = data.metadata;

  updateStatusBar(metadata);

  const gridOptions = {
    columnDefs,
    defaultColDef,
    rowData: allRules,
    animateRows: true,
    rowSelection: 'single',
    getRowClass,
    onRowClicked: (event: any) => {
      if (event.data) {
        showDetailPanel(event.data);
      }
    },
    onSortChanged: () => {
      updateResetButtonState();
    },
  };

  const gridDiv = document.getElementById('grid');
  if (gridDiv) {
    gridApi = agGrid.createGrid(gridDiv, gridOptions);
  }

  // Set up event listeners
  document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
  document.getElementById('languageFilter')?.addEventListener('change', applyFilters);
  document.getElementById('scopeFilter')?.addEventListener('change', applyFilters);
  document.getElementById('quickfixFilter')?.addEventListener('change', applyFilters);
  document.getElementById('feedbackFilter')?.addEventListener('change', applyFilters);
  document.getElementById('ticketsFilter')?.addEventListener('change', applyFilters);
  document.getElementById('sonarWayFilter')?.addEventListener('change', applyFilters);
  document.getElementById('detailClose')?.addEventListener('click', hideDetailPanel);

  // Set initial state of reset button
  updateResetButtonState();
}

init();
