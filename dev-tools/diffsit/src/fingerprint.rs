/*
 * Copyright (C) SonarSource Sàrl
 * For more information, see https://sonarsource.com/legal/
 * mailto:info AT sonarsource DOT com
*/
use std::collections::HashMap;

use crate::models::{
    AnalysisRun, ChangedIssue, DiffResult, FlowLocation, Issue, IssueFingerprint,
    MultiProjectDiffResult, NamedProjectRun, ProjectDiff,
};

pub fn diff(base: &AnalysisRun, target: &AnalysisRun) -> DiffResult {
    let mut result = diff_strict(base, target);
    let base_unmatched = std::mem::take(&mut result.removed_issues);
    let target_unmatched = std::mem::take(&mut result.new_issues);
    let explained = explain_unmatched_by_primary(base_unmatched, target_unmatched);

    result.unchanged_count += explained.unchanged_count;
    result.changed_issues = explained.changed_issues;
    result.removed_issues = explained.removed_issues;
    result.new_issues = explained.new_issues;
    result
}

pub fn diff_strict(base: &AnalysisRun, target: &AnalysisRun) -> DiffResult {
    let base_counts = count_fingerprints(&base.issues);
    let target_counts = count_fingerprints(&target.issues);

    let new_issues = compute_extras(&target.issues, &base_counts);
    let removed_issues = compute_extras(&base.issues, &target_counts);

    let unchanged_count: usize = base_counts
        .iter()
        .map(|(fp, &base_count)| {
            let target_count = target_counts.get(fp).copied().unwrap_or(0);
            base_count.min(target_count)
        })
        .sum();

    DiffResult {
        base_count: base.issues.len(),
        target_count: target.issues.len(),
        new_issues,
        removed_issues,
        changed_issues: Vec::new(),
        unchanged_count,
    }
}

pub fn diff_multi_project(
    base_projects: &[NamedProjectRun],
    target_projects: &[NamedProjectRun],
) -> MultiProjectDiffResult {
    diff_multi_project_with(base_projects, target_projects, diff)
}

pub fn diff_multi_project_strict(
    base_projects: &[NamedProjectRun],
    target_projects: &[NamedProjectRun],
) -> MultiProjectDiffResult {
    diff_multi_project_with(base_projects, target_projects, diff_strict)
}

fn diff_multi_project_with(
    base_projects: &[NamedProjectRun],
    target_projects: &[NamedProjectRun],
    diff_fn: fn(&AnalysisRun, &AnalysisRun) -> DiffResult,
) -> MultiProjectDiffResult {
    let base_map: HashMap<&str, &AnalysisRun> = base_projects
        .iter()
        .map(|p| (p.name.as_str(), &p.run))
        .collect();
    let target_map: HashMap<&str, &AnalysisRun> = target_projects
        .iter()
        .map(|p| (p.name.as_str(), &p.run))
        .collect();

    let mut project_diffs = Vec::new();
    let mut only_in_base = Vec::new();
    let mut only_in_target = Vec::new();

    // Projects in base: either matched with target or only in base
    let mut base_names: Vec<&str> = base_map.keys().copied().collect();
    base_names.sort();
    for name in base_names {
        if let Some(target_run) = target_map.get(name) {
            let diff_result = diff_fn(base_map[name], target_run);
            project_diffs.push(ProjectDiff {
                name: name.to_string(),
                diff: diff_result,
                base_metadata: base_map[name].metadata.clone(),
                target_metadata: target_run.metadata.clone(),
            });
        } else {
            only_in_base.push(name.to_string());
        }
    }

    // Projects only in target
    let mut target_names: Vec<&str> = target_map.keys().copied().collect();
    target_names.sort();
    for name in target_names {
        if !base_map.contains_key(name) {
            only_in_target.push(name.to_string());
        }
    }

    MultiProjectDiffResult {
        project_diffs,
        only_in_base,
        only_in_target,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct PrimaryKey {
    component_path: Option<String>,
    rule_key: String,
    start_line: u32,
    end_line: u32,
    start_line_offset: u32,
    end_line_offset: u32,
}

impl PrimaryKey {
    fn from_issue(issue: &Issue) -> Self {
        let r = issue.range.as_ref();
        let line_fallback = issue.line.unwrap_or(0);
        Self {
            component_path: issue.component_path.clone(),
            rule_key: issue.rule_key.clone(),
            start_line: r.map(|r| r.start_line).unwrap_or(line_fallback),
            end_line: r.map(|r| r.end_line).unwrap_or(line_fallback),
            start_line_offset: r.map(|r| r.start_line_offset).unwrap_or(0),
            end_line_offset: r.map(|r| r.end_line_offset).unwrap_or(0),
        }
    }
}

struct ExplainedUnmatched {
    changed_issues: Vec<ChangedIssue>,
    removed_issues: Vec<Issue>,
    new_issues: Vec<Issue>,
    unchanged_count: usize,
}

fn explain_unmatched_by_primary(
    base_unmatched: Vec<Issue>,
    target_unmatched: Vec<Issue>,
) -> ExplainedUnmatched {
    let mut target_entries: Vec<Option<Issue>> = target_unmatched.into_iter().map(Some).collect();
    let mut target_groups: HashMap<PrimaryKey, Vec<usize>> = HashMap::new();
    for (index, issue) in target_entries.iter().enumerate() {
        let issue = issue.as_ref().expect("target issue should be present");
        target_groups
            .entry(PrimaryKey::from_issue(issue))
            .or_default()
            .push(index);
    }

    let mut changed_issues = Vec::new();
    let mut removed_issues = Vec::new();
    let mut unchanged_count = 0;

    for base_issue in base_unmatched {
        let key = PrimaryKey::from_issue(&base_issue);
        let Some(target_indices) = target_groups.get_mut(&key) else {
            removed_issues.push(base_issue);
            continue;
        };
        if target_indices.is_empty() {
            removed_issues.push(base_issue);
            continue;
        }

        let best_position = target_indices
            .iter()
            .enumerate()
            .min_by_key(|(_, target_index)| {
                let target_issue = target_entries[**target_index]
                    .as_ref()
                    .expect("unpaired target issue should be present");
                change_score(&base_issue, target_issue)
            })
            .map(|(position, _)| position)
            .expect("target group should not be empty");
        let target_index = target_indices.remove(best_position);
        let target_issue = target_entries[target_index]
            .take()
            .expect("target issue should not be paired twice");

        let changed_issue = build_changed_issue(base_issue, target_issue);
        if changed_issue.message_changed || changed_issue.secondary_changed {
            changed_issues.push(changed_issue);
        } else {
            unchanged_count += 1;
        }
    }

    let new_issues = target_entries.into_iter().flatten().collect();

    ExplainedUnmatched {
        changed_issues,
        removed_issues,
        new_issues,
        unchanged_count,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct ChangeScore {
    message_changed: bool,
    secondary_delta_count: usize,
    secondary_structure_changed: bool,
}

fn change_score(base: &Issue, target: &Issue) -> ChangeScore {
    let base_only = secondary_extras(base, target).len();
    let target_only = secondary_extras(target, base).len();
    ChangeScore {
        message_changed: base.message != target.message,
        secondary_delta_count: base_only + target_only,
        secondary_structure_changed: secondary_flows_changed(base, target)
            && base_only + target_only == 0,
    }
}

fn build_changed_issue(base_issue: Issue, target_issue: Issue) -> ChangedIssue {
    let base_only_secondaries = secondary_extras(&base_issue, &target_issue);
    let target_only_secondaries = secondary_extras(&target_issue, &base_issue);
    let secondary_changed = !base_only_secondaries.is_empty()
        || !target_only_secondaries.is_empty()
        || secondary_flows_changed(&base_issue, &target_issue);
    let message_changed = base_issue.message != target_issue.message;

    ChangedIssue {
        base_issue,
        target_issue,
        message_changed,
        secondary_changed,
        base_only_secondaries,
        target_only_secondaries,
    }
}

fn secondary_flows_changed(base: &Issue, target: &Issue) -> bool {
    IssueFingerprint::from_issue(base).flows != IssueFingerprint::from_issue(target).flows
}

fn secondary_locations(issue: &Issue) -> Vec<FlowLocation> {
    issue
        .flows
        .iter()
        .flat_map(|flow| flow.locations.iter().cloned())
        .collect()
}

fn secondary_extras(a: &Issue, b: &Issue) -> Vec<FlowLocation> {
    let mut counts: HashMap<FlowLocation, usize> = HashMap::new();
    for location in secondary_locations(b) {
        *counts.entry(location).or_insert(0) += 1;
    }

    let mut extras = Vec::new();
    for location in secondary_locations(a) {
        let count = counts.entry(location.clone()).or_insert(0);
        if *count > 0 {
            *count -= 1;
        } else {
            extras.push(location);
        }
    }
    extras
}

fn count_fingerprints(issues: &[Issue]) -> HashMap<IssueFingerprint, usize> {
    let mut counts = HashMap::new();
    for issue in issues {
        *counts
            .entry(IssueFingerprint::from_issue(issue))
            .or_insert(0) += 1;
    }
    counts
}

/// Returns issues in `issues` that exceed the count present in `other_counts`.
///
/// For each fingerprint, the first `other_count` occurrences are considered
/// matched; any additional occurrences are returned as extras.
fn compute_extras(issues: &[Issue], other_counts: &HashMap<IssueFingerprint, usize>) -> Vec<Issue> {
    let mut consumed: HashMap<IssueFingerprint, usize> = HashMap::new();
    let mut extras = Vec::new();

    for issue in issues {
        let fp = IssueFingerprint::from_issue(issue);
        let other_count = other_counts.get(&fp).copied().unwrap_or(0);
        let consumed_count = consumed.entry(fp).or_insert(0);
        if *consumed_count < other_count {
            *consumed_count += 1;
        } else {
            extras.push(issue.clone());
        }
    }

    extras
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AnalysisRun, Flow, FlowLocation, Issue, Metadata, NamedProjectRun, Range};

    fn make_issue(rule_key: &str, component_path: &str, message: &str, line: u32) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: Some(component_path.to_string()),
            message: message.to_string(),
            range: Some(Range {
                start_line: line,
                end_line: line,
                start_line_offset: 0,
                end_line_offset: 0,
            }),
            line: None,
            flows: vec![],
        }
    }

    fn make_project_issue(rule_key: &str, message: &str) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: None,
            message: message.to_string(),
            range: None,
            line: None,
            flows: vec![],
        }
    }

    fn make_flow(component_path: &str, line: u32, start_offset: u32, message: &str) -> Flow {
        Flow {
            flow_type: None,
            description: None,
            locations: vec![FlowLocation {
                component_path: Some(component_path.to_string()),
                range: Some(Range {
                    start_line: line,
                    end_line: line,
                    start_line_offset: start_offset,
                    end_line_offset: start_offset + 1,
                }),
                message: Some(message.to_string()),
            }],
        }
    }

    fn make_run(issues: Vec<Issue>) -> AnalysisRun {
        AnalysisRun {
            metadata: Metadata::default(),
            issues,
        }
    }

    fn make_named_run(name: &str, issues: Vec<Issue>) -> NamedProjectRun {
        NamedProjectRun {
            name: name.to_string(),
            run: make_run(issues),
        }
    }

    #[test]
    fn test_identical_runs_produce_no_diff() {
        let issues = vec![
            make_issue("rule:S1", "file.go", "message one", 1),
            make_issue("rule:S2", "file.go", "message two", 2),
        ];
        let base = make_run(issues.clone());
        let target = make_run(issues);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.unchanged_count, 2);
        assert_eq!(result.base_count, 2);
        assert_eq!(result.target_count, 2);
    }

    #[test]
    fn test_identical_project_level_issues_produce_no_diff() {
        let issue = make_project_issue("rule:S1", "project message");
        let base = make_run(vec![issue.clone()]);
        let target = make_run(vec![issue]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.changed_issues, vec![]);
        assert_eq!(result.unchanged_count, 1);
        assert_eq!(result.base_count, 1);
        assert_eq!(result.target_count, 1);
    }

    #[test]
    fn test_new_issue_detected() {
        let base = make_run(vec![make_issue("rule:S1", "file.go", "msg one", 1)]);
        let target = make_run(vec![
            make_issue("rule:S1", "file.go", "msg one", 1),
            make_issue("rule:S2", "file.go", "msg two", 5),
        ]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.new_issues[0].rule_key, "rule:S2");
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.unchanged_count, 1);
    }

    #[test]
    fn test_new_project_level_issue_detected() {
        let base = make_run(vec![]);
        let target = make_run(vec![make_project_issue("rule:S1", "project message")]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.new_issues[0].component_path, None);
        assert_eq!(result.new_issues[0].rule_key, "rule:S1");
        assert_eq!(result.new_issues[0].message, "project message");
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.changed_issues, vec![]);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_removed_issue_detected() {
        let base = make_run(vec![
            make_issue("rule:S1", "file.go", "msg one", 1),
            make_issue("rule:S2", "file.go", "msg two", 5),
        ]);
        let target = make_run(vec![make_issue("rule:S1", "file.go", "msg one", 1)]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues.len(), 1);
        assert_eq!(result.removed_issues[0].rule_key, "rule:S2");
        assert_eq!(result.unchanged_count, 1);
    }

    #[test]
    fn test_removed_project_level_issue_detected() {
        let base = make_run(vec![make_project_issue("rule:S1", "project message")]);
        let target = make_run(vec![]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues.len(), 1);
        assert_eq!(result.removed_issues[0].component_path, None);
        assert_eq!(result.removed_issues[0].rule_key, "rule:S1");
        assert_eq!(result.removed_issues[0].message, "project message");
        assert_eq!(result.changed_issues, vec![]);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_empty_runs_produce_no_diff() {
        let base = make_run(vec![]);
        let target = make_run(vec![]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_all_issues_removed() {
        let issues = vec![
            make_issue("rule:S1", "a.go", "msg", 1),
            make_issue("rule:S2", "b.go", "msg", 2),
        ];
        let base = make_run(issues);
        let target = make_run(vec![]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues.len(), 2);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_all_issues_new() {
        let base = make_run(vec![]);
        let issues = vec![
            make_issue("rule:S1", "a.go", "msg", 1),
            make_issue("rule:S2", "b.go", "msg", 2),
        ];
        let target = make_run(issues);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 2);
        assert_eq!(result.removed_issues, vec![]);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_duplicate_fingerprints_compared_by_count() {
        // 3 identical issues in base, 1 in target -> 2 removed, 0 new, 1 unchanged
        let issue = make_issue("rule:S1", "file.go", "same message", 1);
        let base = make_run(vec![issue.clone(), issue.clone(), issue.clone()]);
        let target = make_run(vec![issue]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues, vec![]);
        assert_eq!(result.removed_issues.len(), 2);
        assert_eq!(result.unchanged_count, 1);
    }

    #[test]
    fn test_same_primary_different_secondary_is_changed_not_removed_and_new() {
        let mut base_issue = make_issue("rule:S1", "file.go", "msg", 10);
        base_issue.flows = vec![make_flow("file.go", 11, 4, "+1")];
        let mut target_issue = make_issue("rule:S1", "file.go", "msg", 10);
        target_issue.flows = vec![make_flow("file.go", 11, 9, "+1")];
        let base = make_run(vec![base_issue]);
        let target = make_run(vec![target_issue]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.changed_issues.len(), 1);
        assert!(!result.changed_issues[0].message_changed);
        assert!(result.changed_issues[0].secondary_changed);
        assert_eq!(result.changed_issues[0].base_only_secondaries.len(), 1);
        assert_eq!(result.changed_issues[0].target_only_secondaries.len(), 1);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_same_primary_different_message_is_changed() {
        let base = make_run(vec![make_issue("rule:S1", "file.go", "base msg", 10)]);
        let target = make_run(vec![make_issue("rule:S1", "file.go", "target msg", 10)]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.changed_issues.len(), 1);
        assert!(result.changed_issues[0].message_changed);
        assert!(!result.changed_issues[0].secondary_changed);
    }

    #[test]
    fn test_project_level_issue_message_change_is_changed() {
        let base = make_run(vec![make_project_issue("rule:S1", "base project msg")]);
        let target = make_run(vec![make_project_issue("rule:S1", "target project msg")]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.changed_issues.len(), 1);
        assert_eq!(result.changed_issues[0].base_issue.component_path, None);
        assert_eq!(result.changed_issues[0].target_issue.component_path, None);
        assert!(result.changed_issues[0].message_changed);
        assert!(!result.changed_issues[0].secondary_changed);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_same_message_candidate_is_preferred_over_changed_message_candidate() {
        let mut base_issue = make_issue("rule:S1", "file.go", "msg", 10);
        base_issue.flows = vec![make_flow("file.go", 11, 4, "+1")];

        let mut changed_message_candidate = make_issue("rule:S1", "file.go", "changed msg", 10);
        changed_message_candidate.flows = vec![make_flow("file.go", 11, 4, "+1")];
        let mut same_message_candidate = make_issue("rule:S1", "file.go", "msg", 10);
        same_message_candidate.flows = vec![make_flow("file.go", 11, 9, "+1")];

        let base = make_run(vec![base_issue]);
        let target = make_run(vec![changed_message_candidate, same_message_candidate]);

        let result = diff(&base, &target);

        assert!(result.removed_issues.is_empty());
        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.new_issues[0].message, "changed msg");
        assert_eq!(result.changed_issues.len(), 1);
        assert!(!result.changed_issues[0].message_changed);
        assert!(result.changed_issues[0].secondary_changed);
        assert_eq!(result.changed_issues[0].target_issue.message, "msg");
    }

    #[test]
    fn test_strict_diff_keeps_secondary_change_as_removed_and_new() {
        let mut base_issue = make_issue("rule:S1", "file.go", "msg", 10);
        base_issue.flows = vec![make_flow("file.go", 11, 4, "+1")];
        let mut target_issue = make_issue("rule:S1", "file.go", "msg", 10);
        target_issue.flows = vec![make_flow("file.go", 11, 9, "+1")];
        let base = make_run(vec![base_issue]);
        let target = make_run(vec![target_issue]);

        let result = diff_strict(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.removed_issues.len(), 1);
        assert!(result.changed_issues.is_empty());
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_line_shift_produces_removed_and_new() {
        // Same rule+message but different line -> treated as removed + new (line is part of fingerprint)
        let base = make_run(vec![make_issue("rule:S1", "file.go", "msg", 10)]);
        let target = make_run(vec![make_issue("rule:S1", "file.go", "msg", 20)]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.removed_issues.len(), 1);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_mixed_diff() {
        let base = make_run(vec![
            make_issue("rule:S1", "a.go", "kept", 5),
            make_issue("rule:S2", "b.go", "removed", 10),
        ]);
        let target = make_run(vec![
            make_issue("rule:S1", "a.go", "kept", 5),
            make_issue("rule:S3", "c.go", "added", 15),
        ]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.new_issues[0].rule_key, "rule:S3");
        assert_eq!(result.removed_issues.len(), 1);
        assert_eq!(result.removed_issues[0].rule_key, "rule:S2");
        assert_eq!(result.unchanged_count, 1);
        assert_eq!(result.base_count, 2);
        assert_eq!(result.target_count, 2);
    }

    #[test]
    fn test_multi_project_identical_runs_produce_no_diff() {
        let base = vec![
            make_named_run("proj_a", vec![make_issue("rule:S1", "a.go", "msg", 1)]),
            make_named_run("proj_b", vec![make_issue("rule:S2", "b.go", "msg", 2)]),
        ];
        let target = vec![
            make_named_run("proj_a", vec![make_issue("rule:S1", "a.go", "msg", 1)]),
            make_named_run("proj_b", vec![make_issue("rule:S2", "b.go", "msg", 2)]),
        ];

        let result = diff_multi_project(&base, &target);

        assert_eq!(result.project_diffs.len(), 2);
        assert!(result.only_in_base.is_empty());
        assert!(result.only_in_target.is_empty());
        for pd in &result.project_diffs {
            assert!(pd.diff.new_issues.is_empty());
            assert!(pd.diff.removed_issues.is_empty());
        }
    }

    #[test]
    fn test_multi_project_only_in_base_and_target() {
        let base = vec![
            make_named_run("proj_a", vec![]),
            make_named_run("proj_b", vec![]),
        ];
        let target = vec![
            make_named_run("proj_a", vec![]),
            make_named_run("proj_c", vec![]),
        ];

        let result = diff_multi_project(&base, &target);

        assert_eq!(result.project_diffs.len(), 1);
        assert_eq!(result.project_diffs[0].name, "proj_a");
        assert_eq!(result.only_in_base, vec!["proj_b"]);
        assert_eq!(result.only_in_target, vec!["proj_c"]);
    }

    #[test]
    fn test_multi_project_new_issue_detected() {
        let base = vec![make_named_run(
            "proj_a",
            vec![make_issue("rule:S1", "a.go", "msg", 1)],
        )];
        let target = vec![make_named_run(
            "proj_a",
            vec![
                make_issue("rule:S1", "a.go", "msg", 1),
                make_issue("rule:S2", "b.go", "new", 5),
            ],
        )];

        let result = diff_multi_project(&base, &target);

        assert_eq!(result.project_diffs.len(), 1);
        assert_eq!(result.project_diffs[0].diff.new_issues.len(), 1);
        assert_eq!(
            result.project_diffs[0].diff.new_issues[0].rule_key,
            "rule:S2"
        );
    }

    fn make_line_issue(rule_key: &str, path: &str, message: &str, line: u32) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: Some(path.to_string()),
            message: message.to_string(),
            range: None,
            line: Some(line),
            flows: vec![],
        }
    }

    fn make_no_location_issue(rule_key: &str, path: &str, message: &str) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: Some(path.to_string()),
            message: message.to_string(),
            range: None,
            line: None,
            flows: vec![],
        }
    }

    #[test]
    fn test_line_only_issues_with_same_line_are_unchanged() {
        let base = make_run(vec![make_line_issue("rule:S1", "file.go", "msg", 5)]);
        let target = make_run(vec![make_line_issue("rule:S1", "file.go", "msg", 5)]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.unchanged_count, 1);
    }

    #[test]
    fn test_line_only_issues_with_different_lines_are_treated_as_diff() {
        let base = make_run(vec![make_line_issue("rule:S1", "file.go", "msg", 5)]);
        let target = make_run(vec![make_line_issue("rule:S1", "file.go", "msg", 10)]);

        let result = diff(&base, &target);

        assert_eq!(result.new_issues.len(), 1);
        assert_eq!(result.removed_issues.len(), 1);
        assert_eq!(result.unchanged_count, 0);
    }

    #[test]
    fn test_no_location_issues_with_same_content_are_unchanged() {
        let base = make_run(vec![make_no_location_issue("rule:S1", "file.go", "msg")]);
        let target = make_run(vec![make_no_location_issue("rule:S1", "file.go", "msg")]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.unchanged_count, 1);
    }

    #[test]
    fn test_no_location_issues_with_different_messages_are_changed() {
        let base = make_run(vec![make_no_location_issue("rule:S1", "file.go", "msg A")]);
        let target = make_run(vec![make_no_location_issue("rule:S1", "file.go", "msg B")]);

        let result = diff(&base, &target);

        assert!(result.new_issues.is_empty());
        assert!(result.removed_issues.is_empty());
        assert_eq!(result.changed_issues.len(), 1);
        assert!(result.changed_issues[0].message_changed);
        assert_eq!(result.unchanged_count, 0);
    }
}
