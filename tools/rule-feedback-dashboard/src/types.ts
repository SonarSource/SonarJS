export interface AtlanStats {
  ruleName: string;
  acceptCount: number;
  acceptPercent: number;
  fpCount: number;
  fpPercent: number;
  fixedCount: number;
  fixedPercent: number;
  removedCount: number;
  removedPercent: number;
  netValue: number;
  netRatio: number;
  netNegative: number;
  resolvedCount: number;
  resolvedPercent: number;
  issuesCount: number;
  projectsCount: number;
  projectsPercent: number;
}

export interface FeedbackComment {
  comment: string;
  date: string;
  resolution: string;
  fileUrl: string;
  fileName: string;
  issueUrl: string;
  line: number | null;
  projectKey: string;
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
}

export interface RuleData {
  ruleKey: string;
  title: string;
  type: string;
  severity: string;
  tags: string[];
  language: 'js' | 'ts' | 'both';
  scope: string;
  quickfix: string;
  sonarWay: boolean;

  // User feedback metrics
  feedbackCount: number;
  fpCount: number;
  wontfixCount: number;
  feedbackComments: FeedbackComment[];

  // Atlan stats (combined for both languages)
  atlan: AtlanStats | null;
  // Atlan stats per language (for split view)
  atlanByLang?: { js?: AtlanStats; ts?: AtlanStats };

  // Jira
  jiraTicketCount: number;
  jiraTickets: JiraTicket[];
}

export interface DatasetMetadata {
  feedbackCsvDate: string;
  feedbackCsvFiles: string[];
  feedbackTotalRows: number;
  atlanCsvDate: string;
  jiraFetchDate: string;
  rspecProcessedDate: string;
  totalRules: number;
  rulesWithFeedback: number;
  rulesWithJiraTickets: number;
}

export interface CombinedData {
  metadata: DatasetMetadata;
  rules: RuleData[];
}

// CSV row types for parsing
export interface FeedbackCsvRow {
  issueKey: string;
  fileUuid: string;
  comment: string;
  fileUrl: string;
  ruleRepository: string;
  ruleKey: string;
  status: string;
  line: string;
  issueSeverity: string;
  feedbackDate: string;
  lastUpdateDate: string;
  creationDate: string;
  language: string;
  resolution: string;
  projectKey: string;
  fileName: string;
  isFromExternalRuleEngine: string;
  issueUrl: string;
  isPrivate: string;
}

export interface AtlanCsvRow {
  plugin_name: string;
  plugin_rule_key: string;
  rule_name: string;
  accept_count: string;
  accept_percent: string;
  fp_count: string;
  fp_percent: string;
  fixed_count: string;
  fixed_percent: string;
  removed_count: string;
  removed_percent: string;
  net_value: string;
  net_ratio: string;
  net_negative: string;
  resolved_count: string;
  resolved_percent: string;
  issues_count: string;
  projects_count: string;
  projects_percent: string;
}

export interface RspecJson {
  title: string;
  type: string;
  defaultSeverity: string;
  tags: string[];
  status: string;
  sqKey: string;
  scope: string;
  quickfix: string;
  defaultQualityProfiles: string[];
  compatibleLanguages?: string[];
}
