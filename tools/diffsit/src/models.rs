/*
 * Copyright (C) SonarSource Sàrl
 * For more information, see https://sonarsource.com/legal/
 * mailto:info AT sonarsource DOT com
*/
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Deserialize, Serialize)]
pub struct Range {
    pub start_line: u32,
    pub end_line: u32,
    #[serde(default)]
    pub start_line_offset: u32,
    #[serde(default)]
    pub end_line_offset: u32,
}

/// A single location within a flow (secondary location).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Deserialize, Serialize)]
pub struct FlowLocation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub range: Option<Range>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// A flow (taint path or set of secondary locations) attached to an issue.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Deserialize, Serialize)]
pub struct Flow {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub flow_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub locations: Vec<FlowLocation>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct Issue {
    pub rule_key: String,
    pub component_path: Option<String>,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub range: Option<Range>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub flows: Vec<Flow>,
}

impl Issue {
    pub fn start_line(&self) -> Option<u32> {
        self.range.as_ref().map(|r| r.start_line).or(self.line)
    }

    pub fn component_path(&self) -> Option<&str> {
        self.component_path.as_deref()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ChangedIssue {
    pub base_issue: Issue,
    pub target_issue: Issue,
    pub message_changed: bool,
    pub secondary_changed: bool,
    pub base_only_secondaries: Vec<FlowLocation>,
    pub target_only_secondaries: Vec<FlowLocation>,
}

impl ChangedIssue {
    pub fn component_path(&self) -> Option<&str> {
        self.base_issue
            .component_path()
            .or_else(|| self.target_issue.component_path())
    }

    pub fn rule_key(&self) -> &str {
        &self.base_issue.rule_key
    }

    pub fn start_line(&self) -> Option<u32> {
        self.base_issue
            .start_line()
            .or_else(|| self.target_issue.start_line())
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct Metadata {
    pub project_key: Option<String>,
    pub repo_url: Option<String>,
    pub commit: Option<String>,
    pub language: Option<String>,
    #[serde(default)]
    pub rule_keys: Vec<String>,
    pub analysis_timestamp: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct IssueFingerprint {
    pub component_path: Option<String>,
    pub rule_key: String,
    pub message: String,
    pub start_line: u32,
    pub end_line: u32,
    pub start_line_offset: u32,
    pub end_line_offset: u32,
    /// Secondary locations: included so that two issues with the same primary
    /// location but different secondary locations are treated as distinct.
    pub flows: Vec<Flow>,
}

impl IssueFingerprint {
    pub fn from_issue(issue: &Issue) -> Self {
        let r = issue.range.as_ref();
        let line_fallback = issue.line.unwrap_or(0);
        Self {
            component_path: issue.component_path.clone(),
            rule_key: issue.rule_key.clone(),
            message: issue.message.clone(),
            start_line: r.map(|r| r.start_line).unwrap_or(line_fallback),
            end_line: r.map(|r| r.end_line).unwrap_or(line_fallback),
            start_line_offset: r.map(|r| r.start_line_offset).unwrap_or(0),
            end_line_offset: r.map(|r| r.end_line_offset).unwrap_or(0),
            flows: canonical_flows(&issue.flows),
        }
    }
}

/// Returns a canonically ordered copy of the flows so that fingerprint
/// equality is order-independent across flows.
///
/// The SonarQube engine may enumerate taint paths (flows) in non-deterministic
/// order across separate analysis runs of the same code. Without this
/// normalisation two fingerprints that represent the same issue would differ
/// whenever their flows arrive in a different order, causing false
/// "removed + new" pairs in the diff output.
///
/// **Locations within a flow are not reordered.** Their order is semantically
/// meaningful: it encodes the path through the code (e.g. source → sink), so
/// preserving it is required for correct fingerprinting.
///
/// Canonical order: flows are sorted by their serialised JSON representation,
/// which is a stable, field-exhaustive key.
fn canonical_flows(flows: &[Flow]) -> Vec<Flow> {
    let mut result = flows.to_vec();
    result.sort_by(|a, b| {
        let ka = serde_json::to_string(a).unwrap_or_default();
        let kb = serde_json::to_string(b).unwrap_or_default();
        ka.cmp(&kb)
    });
    result
}

#[derive(Debug)]
pub struct AnalysisRun {
    pub metadata: Metadata,
    pub issues: Vec<Issue>,
}

#[derive(Debug)]
pub struct DiffResult {
    pub base_count: usize,
    pub target_count: usize,
    pub new_issues: Vec<Issue>,
    pub removed_issues: Vec<Issue>,
    pub changed_issues: Vec<ChangedIssue>,
    pub unchanged_count: usize,
}

#[derive(Debug)]
pub struct NamedProjectRun {
    pub name: String,
    pub run: AnalysisRun,
}

#[derive(Debug)]
pub struct ProjectDiff {
    pub name: String,
    pub diff: DiffResult,
    pub base_metadata: Metadata,
    pub target_metadata: Metadata,
}

#[derive(Debug)]
pub struct MultiProjectDiffResult {
    pub project_diffs: Vec<ProjectDiff>,
    pub only_in_base: Vec<String>,
    pub only_in_target: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_range(start: u32, end: u32) -> Range {
        Range {
            start_line: start,
            end_line: end,
            start_line_offset: 2,
            end_line_offset: 4,
        }
    }

    fn make_issue(range: Option<Range>, line: Option<u32>) -> Issue {
        Issue {
            rule_key: "go:S1".to_string(),
            component_path: Some("file.go".to_string()),
            message: "msg".to_string(),
            range,
            line,
            flows: vec![],
        }
    }

    #[test]
    fn test_start_line_from_range() {
        let issue = make_issue(Some(make_range(10, 12)), None);
        assert_eq!(issue.start_line(), Some(10));
    }

    #[test]
    fn test_start_line_from_line_when_no_range() {
        let issue = make_issue(None, Some(5));
        assert_eq!(issue.start_line(), Some(5));
    }

    #[test]
    fn test_start_line_none_when_both_absent() {
        let issue = make_issue(None, None);
        assert_eq!(issue.start_line(), None);
    }

    #[test]
    fn test_start_line_prefers_range_over_line() {
        let issue = make_issue(Some(make_range(7, 9)), Some(99));
        assert_eq!(issue.start_line(), Some(7));
    }

    fn make_flow(component_path: &str, start_line: u32, message: Option<&str>) -> Flow {
        Flow {
            flow_type: None,
            description: None,
            locations: vec![FlowLocation {
                component_path: Some(component_path.to_string()),
                range: Some(Range {
                    start_line,
                    end_line: start_line,
                    start_line_offset: 0,
                    end_line_offset: 0,
                }),
                message: message.map(str::to_string),
            }],
        }
    }

    #[test]
    fn test_fingerprint_from_issue_with_range() {
        let issue = Issue {
            rule_key: "go:S1234".to_string(),
            component_path: Some("src/main.go".to_string()),
            message: "Missing something".to_string(),
            range: Some(Range {
                start_line: 5,
                end_line: 7,
                start_line_offset: 2,
                end_line_offset: 4,
            }),
            line: Some(99), // ignored when range is present
            flows: vec![],
        };
        let fp = IssueFingerprint::from_issue(&issue);
        assert_eq!(fp.component_path.as_deref(), Some("src/main.go"));
        assert_eq!(fp.rule_key, "go:S1234");
        assert_eq!(fp.message, "Missing something");
        assert_eq!(fp.start_line, 5);
        assert_eq!(fp.end_line, 7);
        assert_eq!(fp.start_line_offset, 2);
        assert_eq!(fp.end_line_offset, 4);
        assert!(fp.flows.is_empty());
    }

    #[test]
    fn test_fingerprint_from_issue_with_line_only() {
        let issue = make_issue(None, Some(42));
        let fp = IssueFingerprint::from_issue(&issue);
        assert_eq!(fp.start_line, 42);
        assert_eq!(fp.end_line, 42);
        assert_eq!(fp.start_line_offset, 0);
        assert_eq!(fp.end_line_offset, 0);
    }

    #[test]
    fn test_fingerprint_from_issue_with_no_location() {
        let issue = make_issue(None, None);
        let fp = IssueFingerprint::from_issue(&issue);
        assert_eq!(fp.start_line, 0);
        assert_eq!(fp.end_line, 0);
        assert_eq!(fp.start_line_offset, 0);
        assert_eq!(fp.end_line_offset, 0);
    }

    #[test]
    fn test_deserializes_sit_exporter_file_level_issue_shape() {
        let json = r#"{"component_path":"src/main/File.go","rule_key":"S2345","message":"File message","line":null,"range":null,"flows":[{"type":"UNDEFINED","description":null,"locations":[{"component_path":"src/secondary.go","range":null,"message":"flow msg"}]}]}"#;

        let issue: Issue = serde_json::from_str(json).unwrap();

        assert_eq!(issue.component_path.as_deref(), Some("src/main/File.go"));
        assert_eq!(issue.rule_key, "S2345");
        assert_eq!(issue.message, "File message");
        assert_eq!(issue.line, None);
        assert_eq!(issue.range, None);
        assert_eq!(issue.flows.len(), 1);
        assert_eq!(issue.flows[0].flow_type.as_deref(), Some("UNDEFINED"));
        assert_eq!(issue.flows[0].description, None);
        assert_eq!(issue.flows[0].locations.len(), 1);
        assert_eq!(
            issue.flows[0].locations[0].component_path.as_deref(),
            Some("src/secondary.go")
        );
        assert_eq!(issue.flows[0].locations[0].range, None);
        assert_eq!(
            issue.flows[0].locations[0].message.as_deref(),
            Some("flow msg")
        );
    }

    #[test]
    fn test_deserializes_sit_exporter_project_level_issue_shape() {
        let json = r#"{"component_path":null,"rule_key":"S3456","message":"Project message","line":null,"range":null,"flows":[]}"#;

        let issue: Issue = serde_json::from_str(json).unwrap();

        assert_eq!(issue.component_path, None);
        assert_eq!(issue.rule_key, "S3456");
        assert_eq!(issue.message, "Project message");
        assert_eq!(issue.line, None);
        assert_eq!(issue.range, None);
        assert!(issue.flows.is_empty());

        let serialized = serde_json::to_string(&issue).unwrap();
        assert_eq!(
            serialized,
            "{\"rule_key\":\"S3456\",\"component_path\":null,\"message\":\"Project message\"}"
        );
    }

    #[test]
    fn test_fingerprint_equality_same_issue() {
        let issue = make_issue(Some(make_range(1, 2)), None);
        assert_eq!(
            IssueFingerprint::from_issue(&issue),
            IssueFingerprint::from_issue(&issue)
        );
    }

    #[test]
    fn test_fingerprint_differs_on_line_change() {
        let a = make_issue(Some(make_range(1, 1)), None);
        let b = make_issue(Some(make_range(2, 2)), None);
        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    // ─── Secondary location (flows) fingerprinting ───────────────────────────

    #[test]
    fn test_fingerprint_includes_flows() {
        let range = Some(make_range(1, 1));
        let mut issue = make_issue(range.clone(), None);
        issue.flows = vec![make_flow("other.go", 10, Some("secondary msg"))];

        let fp = IssueFingerprint::from_issue(&issue);
        assert_eq!(fp.flows.len(), 1);
        assert_eq!(
            fp.flows[0].locations[0].component_path.as_deref(),
            Some("other.go")
        );
    }

    #[test]
    fn test_fingerprint_differs_when_secondary_location_differs() {
        let range = Some(make_range(5, 5));

        let mut a = make_issue(range.clone(), None);
        a.flows = vec![make_flow("other.go", 10, Some("msg"))];

        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("other.go", 20, Some("msg"))]; // different line

        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    #[test]
    fn test_fingerprint_same_when_secondary_locations_identical() {
        let range = Some(make_range(5, 5));

        let mut a = make_issue(range.clone(), None);
        a.flows = vec![make_flow("other.go", 10, Some("msg"))];

        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("other.go", 10, Some("msg"))];

        assert_eq!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    #[test]
    fn test_fingerprint_differs_when_secondary_message_differs() {
        let range = Some(make_range(5, 5));

        let mut a = make_issue(range.clone(), None);
        a.flows = vec![make_flow("other.go", 10, Some("msg A"))];

        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("other.go", 10, Some("msg B"))];

        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    #[test]
    fn test_fingerprint_differs_when_secondary_file_differs() {
        let range = Some(make_range(5, 5));

        let mut a = make_issue(range.clone(), None);
        a.flows = vec![make_flow("a.go", 10, None)];

        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("b.go", 10, None)];

        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    #[test]
    fn test_fingerprint_issue_with_no_flows_vs_with_flows_differ() {
        let range = Some(make_range(5, 5));

        let a = make_issue(range.clone(), None); // no flows
        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("other.go", 10, None)];

        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    #[test]
    fn test_fingerprint_flow_with_absent_message_vs_present_message_differ() {
        let range = Some(make_range(5, 5));

        let mut a = make_issue(range.clone(), None);
        a.flows = vec![make_flow("other.go", 10, None)];

        let mut b = make_issue(range, None);
        b.flows = vec![make_flow("other.go", 10, Some("a message"))];

        assert_ne!(
            IssueFingerprint::from_issue(&a),
            IssueFingerprint::from_issue(&b)
        );
    }

    // ─── Flow-order invariance ────────────────────────────────────────────────

    #[test]
    fn test_fingerprint_equal_when_flows_in_different_order() {
        // Two issues whose flows are the same set but enumerated in different
        // order must produce equal fingerprints (flow order is non-deterministic
        // across SonarQube analysis runs).
        let range = Some(make_range(5, 5));
        let flow_a = make_flow("a.go", 1, Some("path A"));
        let flow_b = make_flow("b.go", 2, Some("path B"));

        let mut issue1 = make_issue(range.clone(), None);
        issue1.flows = vec![flow_a.clone(), flow_b.clone()];

        let mut issue2 = make_issue(range, None);
        issue2.flows = vec![flow_b, flow_a]; // reversed

        assert_eq!(
            IssueFingerprint::from_issue(&issue1),
            IssueFingerprint::from_issue(&issue2)
        );
    }

    #[test]
    fn test_fingerprint_differs_when_location_order_within_flow_differs() {
        // Location order within a single flow is semantically significant
        // (it encodes the path: source → ... → sink), so two issues whose
        // flow locations are in a different order must produce different
        // fingerprints.
        let range = Some(make_range(5, 5));
        let loc1 = FlowLocation {
            component_path: Some("a.go".to_string()),
            range: Some(Range {
                start_line: 1,
                end_line: 1,
                start_line_offset: 0,
                end_line_offset: 0,
            }),
            message: Some("source".to_string()),
        };
        let loc2 = FlowLocation {
            component_path: Some("b.go".to_string()),
            range: Some(Range {
                start_line: 2,
                end_line: 2,
                start_line_offset: 0,
                end_line_offset: 0,
            }),
            message: Some("sink".to_string()),
        };

        let mut issue1 = make_issue(range.clone(), None);
        issue1.flows = vec![Flow {
            flow_type: None,
            description: None,
            locations: vec![loc1.clone(), loc2.clone()],
        }];

        let mut issue2 = make_issue(range, None);
        issue2.flows = vec![Flow {
            flow_type: None,
            description: None,
            locations: vec![loc2, loc1], // reversed locations
        }];

        assert_ne!(
            IssueFingerprint::from_issue(&issue1),
            IssueFingerprint::from_issue(&issue2)
        );
    }
}
