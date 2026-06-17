/*
 * Copyright (C) SonarSource Sàrl
 * For more information, see https://sonarsource.com/legal/
 * mailto:info AT sonarsource DOT com
*/
use std::collections::HashMap;

use anyhow::Result;

use crate::models::{
    ChangedIssue, DiffResult, FlowLocation, Issue, Metadata, MultiProjectDiffResult, ProjectDiff,
    Range,
};

pub enum GroupBy {
    File,
    Rule,
}

const PROJECT_LEVEL_LABEL: &str = "<project>";

fn issue_component_path(issue: &Issue) -> &str {
    issue.component_path().unwrap_or(PROJECT_LEVEL_LABEL)
}

fn changed_component_path(change: &ChangedIssue) -> &str {
    change.component_path().unwrap_or(PROJECT_LEVEL_LABEL)
}

pub fn format_text_report(
    base_meta: &Metadata,
    target_meta: &Metadata,
    diff: &DiffResult,
    group_by: &GroupBy,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    let mut out = String::new();
    out.push_str("=== DiffSIT Report ===\n\n");

    let base_project = base_meta.project_key.as_deref().unwrap_or("unknown");
    let base_commit = short_commit(base_meta.commit.as_deref().unwrap_or("unknown"));
    let base_ts = base_meta.analysis_timestamp.as_deref().unwrap_or("unknown");

    let target_project = target_meta.project_key.as_deref().unwrap_or("unknown");
    let target_commit = short_commit(target_meta.commit.as_deref().unwrap_or("unknown"));
    let target_ts = target_meta
        .analysis_timestamp
        .as_deref()
        .unwrap_or("unknown");

    out.push_str(&format!(
        "Base:   \"{}\" @ {} ({})\n",
        base_project, base_commit, base_ts
    ));
    out.push_str(&format!(
        "Target: \"{}\" @ {} ({})\n",
        target_project, target_commit, target_ts
    ));
    out.push('\n');

    out.push_str(&format_summary(diff));
    out.push_str(&format_diff_issues(
        diff,
        group_by,
        show_new,
        show_removed,
        show_changed,
    ));
    out
}

struct MultiProjectTotals {
    total_base: usize,
    total_target: usize,
    total_new: usize,
    total_removed: usize,
    total_changed: usize,
    total_message_changes: usize,
    total_secondary_changes: usize,
    total_unchanged: usize,
}

#[derive(Clone, Copy)]
struct ChangedIssueCounts {
    total: usize,
    message: usize,
    secondary: usize,
}

fn changed_issue_counts(changes: &[ChangedIssue]) -> ChangedIssueCounts {
    ChangedIssueCounts {
        total: changes.len(),
        message: changes
            .iter()
            .filter(|change| change.message_changed)
            .count(),
        secondary: changes
            .iter()
            .filter(|change| change.secondary_changed)
            .count(),
    }
}

fn multi_project_totals(result: &MultiProjectDiffResult) -> MultiProjectTotals {
    MultiProjectTotals {
        total_base: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.base_count)
            .sum(),
        total_target: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.target_count)
            .sum(),
        total_new: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.new_issues.len())
            .sum(),
        total_removed: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.removed_issues.len())
            .sum(),
        total_changed: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.changed_issues.len())
            .sum(),
        total_message_changes: result
            .project_diffs
            .iter()
            .map(|pd| changed_issue_counts(&pd.diff.changed_issues).message)
            .sum(),
        total_secondary_changes: result
            .project_diffs
            .iter()
            .map(|pd| changed_issue_counts(&pd.diff.changed_issues).secondary)
            .sum(),
        total_unchanged: result
            .project_diffs
            .iter()
            .map(|pd| pd.diff.unchanged_count)
            .sum(),
    }
}

pub fn format_multi_project_text_report(
    result: &MultiProjectDiffResult,
    group_by: &GroupBy,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    let mut out = String::new();
    out.push_str("=== DiffSIT Multi-Project Report ===\n\n");

    for pd in &result.project_diffs {
        out.push_str(&format!("--- Project: {} ---\n\n", pd.name));
        out.push_str(&format_summary(&pd.diff));
        out.push_str(&format_diff_issues(
            &pd.diff,
            group_by,
            show_new,
            show_removed,
            show_changed,
        ));
    }

    if !result.only_in_base.is_empty() {
        out.push_str("--- Projects only in base ---\n");
        for name in &result.only_in_base {
            out.push_str(&format!("  {}\n", name));
        }
        out.push('\n');
    }

    if !result.only_in_target.is_empty() {
        out.push_str("--- Projects only in target ---\n");
        for name in &result.only_in_target {
            out.push_str(&format!("  {}\n", name));
        }
        out.push('\n');
    }

    // Overall summary
    let MultiProjectTotals {
        total_base,
        total_target,
        total_new,
        total_removed,
        total_changed,
        total_message_changes,
        total_secondary_changes,
        total_unchanged,
    } = multi_project_totals(result);

    out.push_str("=== Overall Summary ===\n");
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Projects:",
        result.project_diffs.len()
    ));
    out.push_str(&format!("  {:<16} {:>7}\n", "Base issues:", total_base));
    out.push_str(&format!("  {:<16} {:>7}\n", "Target issues:", total_target));
    out.push_str(&format!("  {:<16} {:>+7}\n", "New:", total_new as i64));
    out.push_str(&format!("  {:<16} {:>7}\n", "Changed:", total_changed));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Message changes:", total_message_changes
    ));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Secondary changes:", total_secondary_changes
    ));
    let removed_display = if total_removed > 0 {
        format!("-{}", total_removed)
    } else {
        "0".to_string()
    };
    out.push_str(&format!("  {:<16} {:>7}\n", "Removed:", removed_display));
    out.push_str(&format!("  {:<16} {:>7}\n", "Unchanged:", total_unchanged));
    out.push('\n');
    out
}

pub fn build_multi_project_json_report(
    result: &MultiProjectDiffResult,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> Result<String> {
    let MultiProjectTotals {
        total_base,
        total_target,
        total_new,
        total_removed,
        total_changed,
        total_message_changes,
        total_secondary_changes,
        total_unchanged,
    } = multi_project_totals(result);

    let projects: Vec<_> = result
        .project_diffs
        .iter()
        .map(|pd| {
            let new_issues: &[Issue] = if show_new { &pd.diff.new_issues } else { &[] };
            let removed_issues: &[Issue] = if show_removed {
                &pd.diff.removed_issues
            } else {
                &[]
            };
            let changed_issues: &[ChangedIssue] = if show_changed {
                &pd.diff.changed_issues
            } else {
                &[]
            };
            let changed_counts = changed_issue_counts(&pd.diff.changed_issues);
            serde_json::json!({
                "project": pd.name,
                "summary": {
                    "base_count": pd.diff.base_count,
                    "target_count": pd.diff.target_count,
                    "new": pd.diff.new_issues.len(),
                    "removed": pd.diff.removed_issues.len(),
                    "changed": changed_counts.total,
                    "message_changes": changed_counts.message,
                    "secondary_changes": changed_counts.secondary,
                    "unchanged": pd.diff.unchanged_count,
                },
                "new_issues": new_issues,
                "removed_issues": removed_issues,
                "changed_issues": changed_issues,
            })
        })
        .collect();

    let report = serde_json::json!({
        "overall_summary": {
            "projects": result.project_diffs.len(),
            "base_count": total_base,
            "target_count": total_target,
            "new": total_new,
            "removed": total_removed,
            "changed": total_changed,
            "message_changes": total_message_changes,
            "secondary_changes": total_secondary_changes,
            "unchanged": total_unchanged,
            "only_in_base": result.only_in_base,
            "only_in_target": result.only_in_target,
        },
        "projects": projects,
    });

    Ok(serde_json::to_string_pretty(&report)?)
}

fn short_commit(commit: &str) -> &str {
    if commit.len() > 7 {
        &commit[..7]
    } else {
        commit
    }
}

fn format_summary(diff: &DiffResult) -> String {
    let new_count = diff.new_issues.len();
    let removed_count = diff.removed_issues.len();
    let changed_counts = changed_issue_counts(&diff.changed_issues);
    let removed_display = if removed_count > 0 {
        format!("-{}", removed_count)
    } else {
        "0".to_string()
    };

    let mut out = String::new();
    out.push_str("--- Summary ---\n");
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Base issues:", diff.base_count
    ));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Target issues:", diff.target_count
    ));
    out.push_str(&format!("  {:<16} {:>+7}\n", "New:", new_count as i64));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Changed:", changed_counts.total
    ));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Message changes:", changed_counts.message
    ));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Secondary changes:", changed_counts.secondary
    ));
    out.push_str(&format!("  {:<16} {:>7}\n", "Removed:", removed_display));
    out.push_str(&format!(
        "  {:<16} {:>7}\n",
        "Unchanged:", diff.unchanged_count
    ));
    out.push('\n');
    out
}

fn format_diff_issues(
    diff: &DiffResult,
    group_by: &GroupBy,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    let group_label = match group_by {
        GroupBy::File => "file",
        GroupBy::Rule => "rule",
    };

    let mut out = String::new();

    if show_new {
        if diff.new_issues.is_empty() {
            out.push_str(&format!("--- New Issues (by {}) ---\n\n", group_label));
            out.push_str("  (none)\n\n");
        } else {
            out.push_str(&format!("--- New Issues (by {}) ---\n\n", group_label));
            out.push_str(&format_grouped_issues(&diff.new_issues, group_by, true));
        }
    }

    if show_removed {
        if diff.removed_issues.is_empty() {
            out.push_str(&format!("--- Removed Issues (by {}) ---\n\n", group_label));
            out.push_str("  (none)\n\n");
        } else {
            out.push_str(&format!("--- Removed Issues (by {}) ---\n\n", group_label));
            out.push_str(&format_grouped_issues(
                &diff.removed_issues,
                group_by,
                false,
            ));
        }
    }

    if show_changed {
        if diff.changed_issues.is_empty() {
            out.push_str(&format!("--- Changed Issues (by {}) ---\n\n", group_label));
            out.push_str("  (none)\n\n");
        } else {
            out.push_str(&format!("--- Changed Issues (by {}) ---\n\n", group_label));
            out.push_str(&format_grouped_changed_issues(
                &diff.changed_issues,
                group_by,
            ));
        }
    }

    out
}

fn format_grouped_issues(issues: &[Issue], group_by: &GroupBy, is_new: bool) -> String {
    match group_by {
        GroupBy::File => format_by_file(issues, is_new),
        GroupBy::Rule => format_by_rule(issues, is_new),
    }
}

fn format_by_file(issues: &[Issue], is_new: bool) -> String {
    let mut by_file: HashMap<&str, Vec<&Issue>> = HashMap::new();
    for issue in issues {
        by_file
            .entry(issue_component_path(issue))
            .or_default()
            .push(issue);
    }

    let mut groups: Vec<(&str, Vec<&Issue>)> = by_file.into_iter().collect();
    groups.sort_by_key(|(path, _)| *path);

    let mut out = String::new();
    for (path, mut file_issues) in groups {
        let count = file_issues.len();
        let sign = if is_new { "+" } else { "-" };
        file_issues.sort_by_key(|i| i.start_line().unwrap_or(0));
        out.push_str(&format!("  {} ({}{})\n", path, sign, count));
        for issue in &file_issues {
            out.push_str(&format!(
                "    [{}] {}: {}\n",
                issue.rule_key,
                issue_location_label(issue),
                issue.message
            ));
            append_issue_secondaries(&mut out, issue, is_new);
        }
        out.push('\n');
    }
    out
}

fn format_by_rule(issues: &[Issue], is_new: bool) -> String {
    let mut by_rule: HashMap<&str, Vec<&Issue>> = HashMap::new();
    for issue in issues {
        by_rule
            .entry(issue.rule_key.as_str())
            .or_default()
            .push(issue);
    }

    let mut groups: Vec<(&str, Vec<&Issue>)> = by_rule.into_iter().collect();
    groups.sort_by_key(|(rule, _)| *rule);

    let mut out = String::new();
    for (rule, mut rule_issues) in groups {
        let count = rule_issues.len();
        let sign = if is_new { "+" } else { "-" };
        rule_issues.sort_by_key(|i| {
            (
                issue_component_path(i).to_string(),
                i.start_line().unwrap_or(0),
            )
        });
        out.push_str(&format!("  {} ({}{})\n", rule, sign, count));
        for issue in &rule_issues {
            out.push_str(&format!(
                "    {} {}: {}\n",
                issue_component_path(issue),
                issue_location_label(issue),
                issue.message
            ));
            append_issue_secondaries(&mut out, issue, is_new);
        }
        out.push('\n');
    }
    out
}

fn append_issue_secondaries(out: &mut String, issue: &Issue, is_new: bool) {
    let sign = if is_new { "+" } else { "-" };
    for location in issue_secondary_locations(issue) {
        out.push_str(&format!(
            "      {sign} secondary {}\n",
            format_flow_location(location)
        ));
    }
}

fn format_grouped_changed_issues(changes: &[ChangedIssue], group_by: &GroupBy) -> String {
    match group_by {
        GroupBy::File => format_changed_by_file(changes),
        GroupBy::Rule => format_changed_by_rule(changes),
    }
}

fn format_changed_by_file(changes: &[ChangedIssue]) -> String {
    let mut by_file: HashMap<&str, Vec<&ChangedIssue>> = HashMap::new();
    for change in changes {
        by_file
            .entry(changed_component_path(change))
            .or_default()
            .push(change);
    }

    let mut groups: Vec<(&str, Vec<&ChangedIssue>)> = by_file.into_iter().collect();
    groups.sort_by_key(|(path, _)| *path);

    let mut out = String::new();
    for (path, mut file_changes) in groups {
        file_changes.sort_by_key(|c| c.start_line().unwrap_or(0));
        out.push_str(&format!("  {} (~{})\n", path, file_changes.len()));
        for change in file_changes {
            out.push_str(&format_changed_issue(change, false));
        }
        out.push('\n');
    }
    out
}

fn format_changed_by_rule(changes: &[ChangedIssue]) -> String {
    let mut by_rule: HashMap<&str, Vec<&ChangedIssue>> = HashMap::new();
    for change in changes {
        by_rule.entry(change.rule_key()).or_default().push(change);
    }

    let mut groups: Vec<(&str, Vec<&ChangedIssue>)> = by_rule.into_iter().collect();
    groups.sort_by_key(|(rule, _)| *rule);

    let mut out = String::new();
    for (rule, mut rule_changes) in groups {
        rule_changes.sort_by_key(|c| {
            (
                changed_component_path(c).to_string(),
                c.start_line().unwrap_or(0),
            )
        });
        out.push_str(&format!("  {} (~{})\n", rule, rule_changes.len()));
        for change in rule_changes {
            out.push_str(&format_changed_issue(change, true));
        }
        out.push('\n');
    }
    out
}

fn format_changed_issue(change: &ChangedIssue, include_file: bool) -> String {
    let line_str = changed_issue_location_label(change);
    let kind = changed_kind(change);
    let mut out = String::new();
    if include_file {
        out.push_str(&format!(
            "    {} {}: {}\n",
            changed_component_path(change),
            line_str,
            kind
        ));
    } else {
        out.push_str(&format!(
            "    [{}] {}: {}\n",
            change.rule_key(),
            line_str,
            kind
        ));
    }
    if change.message_changed {
        out.push_str(&format!("      base:   {}\n", change.base_issue.message));
        out.push_str(&format!("      target: {}\n", change.target_issue.message));
    }
    if change.secondary_changed {
        for location in &change.base_only_secondaries {
            out.push_str(&format!(
                "      - secondary {}\n",
                format_flow_location(location)
            ));
        }
        for location in &change.target_only_secondaries {
            out.push_str(&format!(
                "      + secondary {}\n",
                format_flow_location(location)
            ));
        }
        if change.base_only_secondaries.is_empty() && change.target_only_secondaries.is_empty() {
            out.push_str("      secondary flow structure changed\n");
        }
    }
    out
}

fn changed_kind(change: &ChangedIssue) -> &'static str {
    match (change.message_changed, change.secondary_changed) {
        (true, true) => "Message and secondary locations changed",
        (true, false) => "Message changed",
        (false, true) => "Secondary locations changed",
        (false, false) => "Changed",
    }
}

fn format_flow_location(location: &FlowLocation) -> String {
    let path = location
        .component_path
        .as_deref()
        .unwrap_or("<unknown file>");
    let range = location
        .range
        .as_ref()
        .map(|r| {
            format!(
                "L{}:{}-{}",
                r.start_line, r.start_line_offset, r.end_line_offset
            )
        })
        .unwrap_or_else(|| "L?".to_string());
    let message = location.message.as_deref().unwrap_or("");
    format!("{} {} {:?}", path, range, message)
}

fn issue_secondary_locations(issue: &Issue) -> Vec<&FlowLocation> {
    issue
        .flows
        .iter()
        .flat_map(|flow| flow.locations.iter())
        .collect()
}

// ─── HTML Report ─────────────────────────────────────────────────────────────

const HTML_STYLE_CONTENT: &str = include_str!("resources/report.css");

const HTML_SCRIPT_CONTENT: &str = include_str!("resources/report.js");

fn html_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(c),
        }
    }
    out
}

fn collect_report_rule_keys<'a>(
    issues_slices: &[&'a [Issue]],
    changed_slices: &[&'a [ChangedIssue]],
) -> Vec<&'a str> {
    let mut seen = std::collections::BTreeSet::new();
    for issues in issues_slices {
        for issue in *issues {
            seen.insert(issue.rule_key.as_str());
        }
    }
    for changes in changed_slices {
        for change in *changes {
            seen.insert(change.rule_key());
        }
    }
    seen.into_iter().collect()
}

fn html_rule_filter(rule_keys: &[&str]) -> String {
    if rule_keys.is_empty() {
        return String::new();
    }
    let mut h = String::from(
        r#"<label for="rule-filter">Rule:</label><select id="rule-filter" onchange="filterRules(this)"><option value="">All rules</option>"#,
    );
    for key in rule_keys {
        let k = html_escape(key);
        h.push_str(&format!(r#"<option value="{k}">{k}</option>"#));
    }
    h.push_str("</select>");
    h
}

fn github_url(
    meta: &Metadata,
    component_path: Option<&str>,
    range: Option<&Range>,
) -> Option<String> {
    let component_path = component_path?;
    let repo_url = meta
        .repo_url
        .as_deref()?
        .trim_end_matches('/')
        .trim_end_matches(".git");
    let commit = meta.commit.as_deref()?;
    let base = format!("{}/blob/{}/{}", repo_url, commit, component_path);
    Some(match range {
        Some(r) => {
            let start_col = r.start_line_offset.saturating_add(1);
            let end_col = r.end_line_offset.saturating_add(1);
            format!(
                "{}#L{}C{}-L{}C{}",
                base, r.start_line, start_col, r.end_line, end_col
            )
        }
        None => base,
    })
}

fn html_summary_cards(
    base_count: usize,
    target_count: usize,
    new_count: usize,
    changed_counts: ChangedIssueCounts,
    removed_count: usize,
    unchanged_count: usize,
) -> String {
    let mut h = String::new();
    h.push_str(r#"<div class="stat-cards">"#);
    h.push_str(&html_stat_card("Base", &base_count.to_string(), "", ""));
    h.push_str(&html_stat_card("Target", &target_count.to_string(), "", ""));
    h.push_str(&html_stat_card(
        "New",
        &format!("+{new_count}"),
        if new_count > 0 { " new-card" } else { "" },
        "",
    ));
    h.push_str(&html_stat_card(
        "Changed",
        &changed_counts.total.to_string(),
        if changed_counts.total > 0 {
            " changed-card"
        } else {
            ""
        },
        &format!(
            r#"<div class="stat-subvalue"><span>Message changes: {}</span><span>Secondary changes: {}</span></div>"#,
            changed_counts.message, changed_counts.secondary
        ),
    ));
    h.push_str(&html_stat_card(
        "Removed",
        &if removed_count > 0 {
            format!("-{removed_count}")
        } else {
            "0".to_string()
        },
        if removed_count > 0 {
            " removed-card"
        } else {
            ""
        },
        "",
    ));
    h.push_str(&html_stat_card(
        "Unchanged",
        &unchanged_count.to_string(),
        "",
        "",
    ));
    h.push_str("</div>");
    h
}

fn html_stat_card(label: &str, value: &str, extra_class: &str, details: &str) -> String {
    format!(
        r#"<div class="stat-card{extra_class}"><div class="stat-label">{label}</div><div class="stat-value">{value}</div>{details}</div>"#
    )
}

fn issue_location_label(issue: &Issue) -> String {
    if let Some(line) = issue.start_line() {
        format!("L{line}")
    } else if issue.component_path().is_some() {
        "file".to_string()
    } else {
        "project".to_string()
    }
}

fn changed_issue_location_label(change: &ChangedIssue) -> String {
    if let Some(line) = change.start_line() {
        format!("L{line}")
    } else if change.component_path().is_some() {
        "file".to_string()
    } else {
        "project".to_string()
    }
}

fn fmt_line_str(issue: &Issue) -> String {
    issue_location_label(issue)
}

fn html_linked_cells(url: Option<&str>, path: &str, line_str: &str) -> (String, String) {
    match url {
        Some(u) => (
            format!(
                r#"<a class="issue-link" href="{}">{}</a>"#,
                html_escape(u),
                html_escape(path)
            ),
            format!(
                r#"<a class="issue-link" href="{}">{}</a>"#,
                html_escape(u),
                html_escape(line_str)
            ),
        ),
        None => (html_escape(path), html_escape(line_str)),
    }
}

fn html_issue_groups_by_file(
    issues: &[Issue],
    sign: &str,
    badge_class: &str,
    meta: Option<&Metadata>,
    is_new: bool,
) -> String {
    let mut by_file: HashMap<&str, Vec<&Issue>> = HashMap::new();
    for issue in issues {
        by_file
            .entry(issue_component_path(issue))
            .or_default()
            .push(issue);
    }
    let mut groups: Vec<_> = by_file.into_iter().collect();
    groups.sort_by_key(|(k, _)| *k);

    let mut html = String::new();
    for (path, mut group_issues) in groups {
        group_issues.sort_by_key(|i| i.start_line().unwrap_or(0));
        let count = group_issues.len();
        html.push_str(&format!(
            r#"<div class="issue-group"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{}</span><span class="count-badge {badge_class}">{sign}{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#,
            html_escape(path)
        ));
        for issue in &group_issues {
            let line_str = fmt_line_str(issue);
            let url =
                meta.and_then(|m| github_url(m, issue.component_path(), issue.range.as_ref()));
            let line_html = match url.as_deref() {
                Some(u) => format!(
                    r#"<a class="issue-link" href="{}">{}</a>"#,
                    html_escape(u),
                    html_escape(&line_str)
                ),
                None => html_escape(&line_str),
            };
            let rule_esc = html_escape(&issue.rule_key);
            html.push_str(&format!(
                r#"<div class="issue-row" data-rule="{rule_esc}"><div class="cell-key">{rule_esc}</div><div class="cell-line">{line_html}</div><div class="cell-msg">{msg}{details}</div></div>"#,
                msg = html_escape(&issue.message),
                details = html_issue_secondary_details(issue, is_new)
            ));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_issue_groups_by_rule(
    issues: &[Issue],
    sign: &str,
    badge_class: &str,
    meta: Option<&Metadata>,
    is_new: bool,
) -> String {
    let mut by_rule: HashMap<&str, Vec<&Issue>> = HashMap::new();
    for issue in issues {
        by_rule
            .entry(issue.rule_key.as_str())
            .or_default()
            .push(issue);
    }
    let mut groups: Vec<_> = by_rule.into_iter().collect();
    groups.sort_by_key(|(k, _)| *k);

    let mut html = String::new();
    for (rule, mut group_issues) in groups {
        group_issues.sort_by_key(|i| {
            (
                issue_component_path(i).to_string(),
                i.start_line().unwrap_or(0),
            )
        });
        let count = group_issues.len();
        let rule_esc = html_escape(rule);
        html.push_str(&format!(
            r#"<div class="issue-group" data-rule="{rule_esc}"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{rule_esc}</span><span class="count-badge {badge_class}">{sign}{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#
        ));
        for issue in &group_issues {
            let line_str = fmt_line_str(issue);
            let url =
                meta.and_then(|m| github_url(m, issue.component_path(), issue.range.as_ref()));
            let (file_html, line_html) =
                html_linked_cells(url.as_deref(), issue_component_path(issue), &line_str);
            html.push_str(&format!(
                r#"<div class="issue-row"><div class="cell-file">{file_html}</div><div class="cell-line">{line_html}</div><div class="cell-msg">{msg}{details}</div></div>"#,
                msg = html_escape(&issue.message),
                details = html_issue_secondary_details(issue, is_new)
            ));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_issue_groups(
    issues: &[Issue],
    group_by: &GroupBy,
    is_new: bool,
    meta: Option<&Metadata>,
) -> String {
    if issues.is_empty() {
        return r#"<p class="empty-state">No issues.</p>"#.to_string();
    }
    let sign = if is_new { "+" } else { "-" };
    let badge_class = if is_new { "new-badge" } else { "removed-badge" };
    match group_by {
        GroupBy::File => html_issue_groups_by_file(issues, sign, badge_class, meta, is_new),
        GroupBy::Rule => html_issue_groups_by_rule(issues, sign, badge_class, meta, is_new),
    }
}

fn html_changed_issue_groups(
    changes: &[ChangedIssue],
    group_by: &GroupBy,
    meta: Option<&Metadata>,
) -> String {
    if changes.is_empty() {
        return r#"<p class="empty-state">No issues.</p>"#.to_string();
    }
    match group_by {
        GroupBy::File => html_changed_groups_by_file(changes, meta),
        GroupBy::Rule => html_changed_groups_by_rule(changes, meta),
    }
}

fn html_changed_groups_by_file(changes: &[ChangedIssue], meta: Option<&Metadata>) -> String {
    let mut by_file: HashMap<&str, Vec<&ChangedIssue>> = HashMap::new();
    for change in changes {
        by_file
            .entry(changed_component_path(change))
            .or_default()
            .push(change);
    }
    let mut groups: Vec<_> = by_file.into_iter().collect();
    groups.sort_by_key(|(path, _)| *path);

    let mut html = String::new();
    for (path, mut group_changes) in groups {
        group_changes.sort_by_key(|c| c.start_line().unwrap_or(0));
        let count = group_changes.len();
        html.push_str(&format!(
            r#"<div class="issue-group"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{}</span><span class="count-badge changed-badge">~{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#,
            html_escape(path)
        ));
        for change in group_changes {
            html.push_str(&html_changed_issue_row(change, meta, false));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_changed_groups_by_rule(changes: &[ChangedIssue], meta: Option<&Metadata>) -> String {
    let mut by_rule: HashMap<&str, Vec<&ChangedIssue>> = HashMap::new();
    for change in changes {
        by_rule.entry(change.rule_key()).or_default().push(change);
    }
    let mut groups: Vec<_> = by_rule.into_iter().collect();
    groups.sort_by_key(|(rule, _)| *rule);

    let mut html = String::new();
    for (rule, mut group_changes) in groups {
        group_changes.sort_by_key(|c| {
            (
                changed_component_path(c).to_string(),
                c.start_line().unwrap_or(0),
            )
        });
        let count = group_changes.len();
        let rule_esc = html_escape(rule);
        html.push_str(&format!(
            r#"<div class="issue-group" data-rule="{rule_esc}"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{rule_esc}</span><span class="count-badge changed-badge">~{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#
        ));
        for change in group_changes {
            html.push_str(&html_changed_issue_row(change, meta, true));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_changed_issue_row(
    change: &ChangedIssue,
    meta: Option<&Metadata>,
    include_file: bool,
) -> String {
    let line_str = changed_issue_location_label(change);
    let url =
        meta.and_then(|m| github_url(m, change.component_path(), change.base_issue.range.as_ref()));
    let rule_esc = html_escape(change.rule_key());
    let first_cell = if include_file {
        let (file_html, _) =
            html_linked_cells(url.as_deref(), changed_component_path(change), &line_str);
        format!(r#"<div class="cell-file">{file_html}</div>"#)
    } else {
        format!(r#"<div class="cell-key">{rule_esc}</div>"#)
    };
    let line_html = match url.as_deref() {
        Some(u) => format!(
            r#"<a class="issue-link" href="{}">{}</a>"#,
            html_escape(u),
            html_escape(&line_str)
        ),
        None => html_escape(&line_str),
    };
    format!(
        r#"<div class="issue-row" data-rule="{rule_esc}">{first_cell}<div class="cell-line">{line_html}</div><div class="cell-msg">{kind}{details}</div></div>"#,
        kind = html_escape(changed_kind(change)),
        details = html_changed_issue_details(change)
    )
}

fn html_changed_issue_details(change: &ChangedIssue) -> String {
    let mut html = String::new();
    if change.message_changed {
        html.push_str(&format!(
            r#"<div class="change-detail"><span>base:</span> {}</div>"#,
            html_escape(&change.base_issue.message)
        ));
        html.push_str(&format!(
            r#"<div class="change-detail"><span>target:</span> {}</div>"#,
            html_escape(&change.target_issue.message)
        ));
    }
    if change.secondary_changed {
        for location in &change.base_only_secondaries {
            html.push_str(&format!(
                r#"<div class="change-detail removed-val"><span>- secondary:</span> {}</div>"#,
                html_escape(&format_flow_location(location))
            ));
        }
        for location in &change.target_only_secondaries {
            html.push_str(&format!(
                r#"<div class="change-detail new-val"><span>+ secondary:</span> {}</div>"#,
                html_escape(&format_flow_location(location))
            ));
        }
        if change.base_only_secondaries.is_empty() && change.target_only_secondaries.is_empty() {
            html.push_str(
                r#"<div class="change-detail"><span>secondary:</span> flow structure changed</div>"#,
            );
        }
    }
    html
}

fn html_issue_secondary_details(issue: &Issue, is_new: bool) -> String {
    let mut html = String::new();
    let (class_name, sign) = if is_new {
        ("new-val", "+")
    } else {
        ("removed-val", "-")
    };
    for location in issue_secondary_locations(issue) {
        html.push_str(&format!(
            r#"<div class="change-detail {class_name}"><span>{sign} secondary:</span> {}</div>"#,
            html_escape(&format_flow_location(location))
        ));
    }
    html
}

type RuleGroup<'a> = Vec<(&'a str, &'a Issue, Option<String>)>;
type ChangedRuleGroup<'a> = Vec<(&'a str, &'a ChangedIssue, Option<String>)>;

fn collect_multi_project_entries(
    project_diffs: &[ProjectDiff],
    is_new: bool,
) -> Vec<(&str, &str, &Issue, Option<String>)> {
    let mut entries = Vec::new();
    for pd in project_diffs {
        let meta = if is_new {
            &pd.target_metadata
        } else {
            &pd.base_metadata
        };
        let issues = if is_new {
            &pd.diff.new_issues
        } else {
            &pd.diff.removed_issues
        };
        for issue in issues {
            let url = github_url(meta, issue.component_path(), issue.range.as_ref());
            entries.push((issue.rule_key.as_str(), pd.name.as_str(), issue, url));
        }
    }
    entries
}

fn collect_multi_project_changed_entries(
    project_diffs: &[ProjectDiff],
) -> Vec<(&str, &str, &ChangedIssue, Option<String>)> {
    let mut entries = Vec::new();
    for pd in project_diffs {
        for change in &pd.diff.changed_issues {
            let url = github_url(
                &pd.base_metadata,
                change.component_path(),
                change.base_issue.range.as_ref(),
            );
            entries.push((change.rule_key(), pd.name.as_str(), change, url));
        }
    }
    entries
}

fn html_multi_project_issue_row(
    project_name: &str,
    issue: &Issue,
    url: Option<&str>,
    is_new: bool,
) -> String {
    let line_str = fmt_line_str(issue);
    let (file_html, line_html) = html_linked_cells(url, issue_component_path(issue), &line_str);
    let proj_esc = html_escape(project_name);
    format!(
        r#"<div class="issue-row" data-project="{proj_esc}"><div class="cell-proj"><span class="project-badge">{proj_esc}</span></div><div class="cell-file">{file_html}</div><div class="cell-line">{line_html}</div><div class="cell-msg">{msg}{details}</div></div>"#,
        msg = html_escape(&issue.message),
        details = html_issue_secondary_details(issue, is_new)
    )
}

fn html_multi_project_issue_groups(project_diffs: &[ProjectDiff], is_new: bool) -> String {
    let all_entries = collect_multi_project_entries(project_diffs, is_new);
    if all_entries.is_empty() {
        return r#"<p class="empty-state">No issues.</p>"#.to_string();
    }

    let sign = if is_new { "+" } else { "-" };
    let badge_class = if is_new { "new-badge" } else { "removed-badge" };

    let mut by_rule: HashMap<&str, RuleGroup<'_>> = HashMap::new();
    for (rule_key, project_name, issue, url) in &all_entries {
        by_rule
            .entry(rule_key)
            .or_default()
            .push((project_name, issue, url.clone()));
    }

    let mut groups: Vec<_> = by_rule.into_iter().collect();
    groups.sort_by_key(|(k, _)| *k);

    let mut html = String::new();
    for (rule, mut entries) in groups {
        entries.sort_by_key(|(proj, issue, _)| {
            (
                proj.to_string(),
                issue_component_path(issue).to_string(),
                issue.start_line().unwrap_or(0),
            )
        });
        let count = entries.len();
        let rule_esc = html_escape(rule);
        html.push_str(&format!(
            r#"<div class="issue-group" data-rule="{rule_esc}"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{rule_esc}</span><span class="count-badge {badge_class}">{sign}{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#
        ));
        for (project_name, issue, url) in &entries {
            html.push_str(&html_multi_project_issue_row(
                project_name,
                issue,
                url.as_deref(),
                is_new,
            ));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_multi_project_changed_groups(project_diffs: &[ProjectDiff]) -> String {
    let all_entries = collect_multi_project_changed_entries(project_diffs);
    if all_entries.is_empty() {
        return r#"<p class="empty-state">No issues.</p>"#.to_string();
    }

    let mut by_rule: HashMap<&str, ChangedRuleGroup<'_>> = HashMap::new();
    for (rule_key, project_name, change, url) in &all_entries {
        by_rule
            .entry(rule_key)
            .or_default()
            .push((project_name, change, url.clone()));
    }

    let mut groups: Vec<_> = by_rule.into_iter().collect();
    groups.sort_by_key(|(rule, _)| *rule);

    let mut html = String::new();
    for (rule, mut entries) in groups {
        entries.sort_by_key(|(project, change, _)| {
            (
                project.to_string(),
                changed_component_path(change).to_string(),
                change.start_line().unwrap_or(0),
            )
        });
        let count = entries.len();
        let rule_esc = html_escape(rule);
        html.push_str(&format!(
            r#"<div class="issue-group" data-rule="{rule_esc}"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">{rule_esc}</span><span class="count-badge changed-badge">~{count}</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open">"#
        ));
        for (project_name, change, url) in entries {
            html.push_str(&html_changed_issue_row_with_url(
                project_name,
                change,
                url.as_deref(),
            ));
        }
        html.push_str("</div></div>");
    }
    html
}

fn html_changed_issue_row_with_url(
    project_name: &str,
    change: &ChangedIssue,
    url: Option<&str>,
) -> String {
    let line_str = changed_issue_location_label(change);
    let rule_esc = html_escape(change.rule_key());
    let project_attr = format!(r#" data-project="{}""#, html_escape(project_name));
    let project_cell = format!(
        r#"<div class="cell-proj"><span class="project-badge">{}</span></div>"#,
        html_escape(project_name)
    );
    let (file_html, line_html) = html_linked_cells(url, changed_component_path(change), &line_str);
    format!(
        r#"<div class="issue-row" data-rule="{rule_esc}"{project_attr}>{project_cell}<div class="cell-file">{file_html}</div><div class="cell-line">{line_html}</div><div class="cell-msg">{kind}{details}</div></div>"#,
        kind = html_escape(changed_kind(change)),
        details = html_changed_issue_details(change)
    )
}

fn html_issues_section(
    issues: &[Issue],
    group_by: &GroupBy,
    is_new: bool,
    section_id: &str,
    meta: Option<&Metadata>,
) -> String {
    let (title, section_class, badge_class) = if is_new {
        ("New Issues", "new-issues", "new-badge")
    } else {
        ("Removed Issues", "removed-issues", "removed-badge")
    };
    let sign = if is_new { "+" } else { "-" };
    let count = issues.len();
    let groups_html = html_issue_groups(issues, group_by, is_new, meta);

    let mut h = String::new();
    h.push_str(&format!(
        r#"<section class="issue-section {section_class}" id="{section_id}">"#
    ));
    h.push_str(r#"<div class="section-header">"#);
    h.push_str(&format!(
        r#"<h2>{title} <span class="count-badge {badge_class}">{sign}{count}</span></h2>"#
    ));
    h.push_str(&format!(
        r#"<div class="section-controls"><button class="btn" onclick="expandAll('{section_id}')">Expand All</button><button class="btn" onclick="collapseAll('{section_id}')">Collapse All</button></div>"#
    ));
    h.push_str("</div>");
    h.push_str(&groups_html);
    h.push_str("</section>");
    h
}

fn build_html_document(title: &str, header_html: &str, body_html: &str) -> String {
    let mut doc = String::new();
    doc.push_str("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
    doc.push_str(r#"<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">"#);
    doc.push_str(&format!("<title>{}</title>\n", html_escape(title)));
    doc.push_str("<style>\n");
    doc.push_str(HTML_STYLE_CONTENT);
    doc.push_str("\n</style>");
    doc.push_str("\n</head>\n<body>\n");
    doc.push_str(header_html);
    doc.push_str(r#"<main class="container">"#);
    doc.push_str(body_html);
    doc.push_str("</main>\n");
    doc.push_str(r#"<footer class="site-footer"><p>Generated by DiffSIT</p></footer>"#);
    doc.push('\n');
    doc.push_str("<script>\n");
    doc.push_str(HTML_SCRIPT_CONTENT);
    doc.push_str("\n</script>");
    doc.push_str("\n</body>\n</html>\n");
    doc
}

pub fn build_html_report(
    base_meta: &Metadata,
    target_meta: &Metadata,
    diff: &DiffResult,
    group_by: &GroupBy,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    let base_project = html_escape(base_meta.project_key.as_deref().unwrap_or("unknown"));
    let base_commit = html_escape(short_commit(
        base_meta.commit.as_deref().unwrap_or("unknown"),
    ));
    let base_ts = html_escape(base_meta.analysis_timestamp.as_deref().unwrap_or("unknown"));

    let target_project = html_escape(target_meta.project_key.as_deref().unwrap_or("unknown"));
    let target_commit = html_escape(short_commit(
        target_meta.commit.as_deref().unwrap_or("unknown"),
    ));
    let target_ts = html_escape(
        target_meta
            .analysis_timestamp
            .as_deref()
            .unwrap_or("unknown"),
    );

    let header_html = format!(
        r#"<header class="site-header"><div class="header-inner"><h1>DiffSIT Report</h1><div class="header-meta"><div><span class="meta-label">Base</span><strong>{base_project}</strong><code>{base_commit}</code><span class="ts">{base_ts}</span></div><div><span class="meta-label">Target</span><strong>{target_project}</strong><code>{target_commit}</code><span class="ts">{target_ts}</span></div></div></div></header>"#
    );

    let mut body = String::new();
    body.push_str(r#"<section class="summary-section"><p class="section-title">Summary</p>"#);
    let changed_counts = changed_issue_counts(&diff.changed_issues);
    body.push_str(&html_summary_cards(
        diff.base_count,
        diff.target_count,
        diff.new_issues.len(),
        changed_counts,
        diff.removed_issues.len(),
        diff.unchanged_count,
    ));
    body.push_str("</section>");

    // Rule filter bar
    let shown_new = if show_new { &diff.new_issues[..] } else { &[] };
    let shown_removed = if show_removed {
        &diff.removed_issues[..]
    } else {
        &[]
    };
    let shown_changed = if show_changed {
        &diff.changed_issues[..]
    } else {
        &[]
    };
    let rule_keys = collect_report_rule_keys(&[shown_new, shown_removed], &[shown_changed]);
    if !rule_keys.is_empty() {
        body.push_str(r#"<div class="filter-bar">"#);
        body.push_str(&html_rule_filter(&rule_keys));
        body.push_str("</div>");
    }

    if show_new {
        body.push_str(&html_issues_section(
            &diff.new_issues,
            group_by,
            true,
            "new-issues",
            Some(target_meta),
        ));
    }
    if show_removed {
        body.push_str(&html_issues_section(
            &diff.removed_issues,
            group_by,
            false,
            "removed-issues",
            Some(base_meta),
        ));
    }
    if show_changed {
        let count = diff.changed_issues.len();
        let groups_html =
            html_changed_issue_groups(&diff.changed_issues, group_by, Some(base_meta));
        body.push_str(&format!(
            r#"<section class="issue-section changed-issues" id="changed-issues"><div class="section-header"><h2>Changed Issues <span class="count-badge changed-badge">~{count}</span></h2><div class="section-controls"><button class="btn" onclick="expandAll('changed-issues')">Expand All</button><button class="btn" onclick="collapseAll('changed-issues')">Collapse All</button></div></div>{groups_html}</section>"#
        ));
    }

    let title = format!("DiffSIT Report \u{2014} {base_project}");
    build_html_document(&title, &header_html, &body)
}

fn html_multi_project_filter_bar(
    result: &MultiProjectDiffResult,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    if result.project_diffs.is_empty() {
        return String::new();
    }
    let new_slices: Vec<&[Issue]> = result
        .project_diffs
        .iter()
        .map(|pd| pd.diff.new_issues.as_slice())
        .collect();
    let removed_slices: Vec<&[Issue]> = result
        .project_diffs
        .iter()
        .map(|pd| pd.diff.removed_issues.as_slice())
        .collect();
    let changed_slices: Vec<&[ChangedIssue]> = result
        .project_diffs
        .iter()
        .map(|pd| pd.diff.changed_issues.as_slice())
        .collect();
    let mut all_slices: Vec<&[Issue]> = Vec::new();
    if show_new {
        all_slices.extend_from_slice(&new_slices);
    }
    if show_removed {
        all_slices.extend_from_slice(&removed_slices);
    }
    let mut changed_report_slices: Vec<&[ChangedIssue]> = Vec::new();
    if show_changed {
        changed_report_slices.extend_from_slice(&changed_slices);
    }
    let rule_keys = collect_report_rule_keys(&all_slices, &changed_report_slices);

    let mut h = String::new();
    h.push_str(r#"<div class="filter-bar">"#);
    h.push_str(&html_rule_filter(&rule_keys));
    h.push_str(r#"<label for="project-filter">Project:</label><select id="project-filter" onchange="filterProjects(this)"><option value="">All projects</option>"#);
    for pd in &result.project_diffs {
        let name = html_escape(&pd.name);
        h.push_str(&format!(r#"<option value="{name}">{name}</option>"#));
    }
    h.push_str("</select></div>");
    h
}

pub fn build_multi_project_html_report(
    result: &MultiProjectDiffResult,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> String {
    let MultiProjectTotals {
        total_base,
        total_target,
        total_new,
        total_removed,
        total_changed,
        total_message_changes,
        total_secondary_changes,
        total_unchanged,
    } = multi_project_totals(result);

    let header_html = r#"<header class="site-header"><div class="header-inner"><h1>DiffSIT Multi-Project Report</h1></div></header>"#.to_string();

    let mut body = String::new();

    // Overall summary
    body.push_str(r#"<div class="overall-summary"><p class="section-title">Overall Summary</p><div class="overall-stat-row">"#);
    let proj_count = result.project_diffs.len();
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Projects:</span><span class="overall-stat-value">{proj_count}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Base:</span><span class="overall-stat-value">{total_base}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Target:</span><span class="overall-stat-value">{total_target}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">New:</span><span class="overall-stat-value new-val">+{total_new}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Changed:</span><span class="overall-stat-value changed-val">{total_changed}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Message changes:</span><span class="overall-stat-value changed-val">{total_message_changes}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Secondary changes:</span><span class="overall-stat-value changed-val">{total_secondary_changes}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Removed:</span><span class="overall-stat-value removed-val">-{total_removed}</span></div>"#));
    body.push_str(&format!(r#"<div class="overall-stat"><span class="overall-stat-label">Unchanged:</span><span class="overall-stat-value">{total_unchanged}</span></div>"#));
    body.push_str("</div></div>");

    // Projects only in base / target
    if !result.only_in_base.is_empty() {
        body.push_str(r#"<div class="only-in-section"><p class="section-title">Only in Base</p><ul class="only-in-list">"#);
        for name in &result.only_in_base {
            body.push_str(&format!("<li>{}</li>", html_escape(name)));
        }
        body.push_str("</ul></div>");
    }
    if !result.only_in_target.is_empty() {
        body.push_str(r#"<div class="only-in-section"><p class="section-title">Only in Target</p><ul class="only-in-list">"#);
        for name in &result.only_in_target {
            body.push_str(&format!("<li>{}</li>", html_escape(name)));
        }
        body.push_str("</ul></div>");
    }

    body.push_str(&html_multi_project_filter_bar(
        result,
        show_new,
        show_removed,
        show_changed,
    ));

    // New issues grouped by rule across all projects
    if show_new {
        let new_groups_html = html_multi_project_issue_groups(&result.project_diffs, true);
        body.push_str(&format!(
            r#"<section class="issue-section new-issues" id="new-issues"><div class="section-header"><h2>New Issues <span class="count-badge new-badge">+{total_new}</span></h2><div class="section-controls"><button class="btn" onclick="expandAll('new-issues')">Expand All</button><button class="btn" onclick="collapseAll('new-issues')">Collapse All</button></div></div>{new_groups_html}</section>"#
        ));
    }

    // Removed issues grouped by rule across all projects
    if show_removed {
        let removed_groups_html = html_multi_project_issue_groups(&result.project_diffs, false);
        let removed_display = if total_removed > 0 {
            format!("-{total_removed}")
        } else {
            "0".to_string()
        };
        body.push_str(&format!(
            r#"<section class="issue-section removed-issues" id="removed-issues"><div class="section-header"><h2>Removed Issues <span class="count-badge removed-badge">{removed_display}</span></h2><div class="section-controls"><button class="btn" onclick="expandAll('removed-issues')">Expand All</button><button class="btn" onclick="collapseAll('removed-issues')">Collapse All</button></div></div>{removed_groups_html}</section>"#
        ));
    }

    if show_changed {
        let changed_groups_html = html_multi_project_changed_groups(&result.project_diffs);
        body.push_str(&format!(
            r#"<section class="issue-section changed-issues" id="changed-issues"><div class="section-header"><h2>Changed Issues <span class="count-badge changed-badge">~{total_changed}</span></h2><div class="section-controls"><button class="btn" onclick="expandAll('changed-issues')">Expand All</button><button class="btn" onclick="collapseAll('changed-issues')">Collapse All</button></div></div>{changed_groups_html}</section>"#
        ));
    }

    build_html_document("DiffSIT Multi-Project Report", &header_html, &body)
}

pub fn build_json_report(
    diff: &DiffResult,
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
) -> Result<String> {
    let new_issues: &[Issue] = if show_new { &diff.new_issues } else { &[] };
    let removed_issues: &[Issue] = if show_removed {
        &diff.removed_issues
    } else {
        &[]
    };
    let changed_issues: &[ChangedIssue] = if show_changed {
        &diff.changed_issues
    } else {
        &[]
    };
    let changed_counts = changed_issue_counts(&diff.changed_issues);

    let report = serde_json::json!({
        "summary": {
            "base_count": diff.base_count,
            "target_count": diff.target_count,
            "new": diff.new_issues.len(),
            "removed": diff.removed_issues.len(),
            "changed": changed_counts.total,
            "message_changes": changed_counts.message,
            "secondary_changes": changed_counts.secondary,
            "unchanged": diff.unchanged_count,
        },
        "new_issues": new_issues,
        "removed_issues": removed_issues,
        "changed_issues": changed_issues,
    });

    Ok(serde_json::to_string_pretty(&report)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_range(start: u32, end: u32) -> Range {
        Range {
            start_line: start,
            end_line: end,
            start_line_offset: 0,
            end_line_offset: 0,
        }
    }

    fn make_issue(
        rule_key: &str,
        component_path: &str,
        message: &str,
        range: Option<Range>,
    ) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: Some(component_path.to_string()),
            message: message.to_string(),
            range,
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

    fn make_issue_with_secondary(is_new: bool) -> Issue {
        let mut issue = make_issue(
            "powershelldre:S8633",
            if is_new { "target.ps1" } else { "base.ps1" },
            if is_new {
                "new primary"
            } else {
                "removed primary"
            },
            Some(make_range(5, 5)),
        );
        issue.flows = vec![crate::models::Flow {
            flow_type: None,
            description: None,
            locations: vec![FlowLocation {
                component_path: Some("reference.ps1".to_string()),
                range: Some(Range {
                    start_line: 9,
                    end_line: 9,
                    start_line_offset: 1,
                    end_line_offset: 4,
                }),
                message: Some("reference resource".to_string()),
            }],
        }];
        issue
    }

    fn make_metadata(repo_url: Option<&str>, commit: Option<&str>) -> Metadata {
        Metadata {
            project_key: Some("my-project".to_string()),
            repo_url: repo_url.map(str::to_string),
            commit: commit.map(str::to_string),
            language: None,
            rule_keys: vec![],
            analysis_timestamp: None,
        }
    }

    fn make_diff(new_issues: Vec<Issue>, removed_issues: Vec<Issue>) -> DiffResult {
        DiffResult {
            base_count: removed_issues.len(),
            target_count: new_issues.len(),
            unchanged_count: 0,
            new_issues,
            removed_issues,
            changed_issues: vec![],
        }
    }

    fn make_changed_issue() -> ChangedIssue {
        ChangedIssue {
            base_issue: make_issue("go:S1", "a.go", "base msg", Some(make_range(5, 5))),
            target_issue: make_issue("go:S1", "a.go", "target msg", Some(make_range(5, 5))),
            message_changed: true,
            secondary_changed: false,
            base_only_secondaries: vec![],
            target_only_secondaries: vec![],
        }
    }

    fn make_secondary_changed_issue() -> ChangedIssue {
        let mut change = make_changed_issue();
        change.target_issue.message = change.base_issue.message.clone();
        change.message_changed = false;
        change.secondary_changed = true;
        change.base_only_secondaries = vec![FlowLocation {
            component_path: Some("a.go".to_string()),
            range: Some(make_range(6, 6)),
            message: Some("secondary msg".to_string()),
        }];
        change
    }

    fn make_project_diff(
        name: &str,
        new_issues: Vec<Issue>,
        removed_issues: Vec<Issue>,
    ) -> ProjectDiff {
        ProjectDiff {
            name: name.to_string(),
            diff: make_diff(new_issues, removed_issues),
            base_metadata: Metadata::default(),
            target_metadata: Metadata::default(),
        }
    }

    #[test]
    fn test_changed_issue_counts_counts_message_and_secondary_changes() {
        let mut message_and_secondary = make_changed_issue();
        message_and_secondary.secondary_changed = true;

        let changes = vec![
            make_changed_issue(),
            make_secondary_changed_issue(),
            message_and_secondary,
        ];

        let counts = changed_issue_counts(&changes);
        assert_eq!(counts.total, 3);
        assert_eq!(counts.message, 2);
        assert_eq!(counts.secondary, 2);
    }

    // ─── html_escape ────────────────────────────────────────────────────────

    #[test]
    fn test_html_escape_ampersand() {
        assert_eq!(html_escape("a & b"), "a &amp; b");
    }

    #[test]
    fn test_html_escape_less_than_and_greater_than() {
        assert_eq!(html_escape("<div>"), "&lt;div&gt;");
    }

    #[test]
    fn test_html_escape_double_quote() {
        assert_eq!(html_escape(r#"say "hello""#), "say &quot;hello&quot;");
    }

    #[test]
    fn test_html_escape_no_special_chars() {
        assert_eq!(html_escape("hello world"), "hello world");
    }

    #[test]
    fn test_html_escape_mixed() {
        assert_eq!(
            html_escape(r#"<a href="url">link & text</a>"#),
            "&lt;a href=&quot;url&quot;&gt;link &amp; text&lt;/a&gt;"
        );
    }

    #[test]
    fn test_html_escape_empty() {
        assert_eq!(html_escape(""), "");
    }

    // ─── short_commit ────────────────────────────────────────────────────────

    #[test]
    fn test_short_commit_truncates_long_hash() {
        assert_eq!(short_commit("abcdef1234567890"), "abcdef1");
    }

    #[test]
    fn test_short_commit_exact_7_chars_unchanged() {
        assert_eq!(short_commit("abcdef1"), "abcdef1");
    }

    #[test]
    fn test_short_commit_short_value_unchanged() {
        assert_eq!(short_commit("abc"), "abc");
    }

    #[test]
    fn test_short_commit_unknown_label_unchanged() {
        assert_eq!(short_commit("unknown"), "unknown");
    }

    // ─── github_url ──────────────────────────────────────────────────────────

    #[test]
    fn test_github_url_single_line_range() {
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234"));
        let range = make_range(10, 10);
        assert_eq!(
            github_url(&meta, Some("src/main.go"), Some(&range)),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go#L10C1-L10C1".to_string())
        );
    }

    #[test]
    fn test_github_url_multi_line_range() {
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234"));
        let range = make_range(5, 8);
        assert_eq!(
            github_url(&meta, Some("src/main.go"), Some(&range)),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go#L5C1-L8C1".to_string())
        );
    }

    #[test]
    fn test_github_url_uses_line_offsets_as_columns() {
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234"));
        let range = Range {
            start_line: 5,
            end_line: 8,
            start_line_offset: 2,
            end_line_offset: 9,
        };
        assert_eq!(
            github_url(&meta, Some("src/main.go"), Some(&range)),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go#L5C3-L8C10".to_string())
        );
    }

    #[test]
    fn test_github_url_no_range() {
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234"));
        assert_eq!(
            github_url(&meta, Some("src/main.go"), None),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go".to_string())
        );
    }

    #[test]
    fn test_github_url_returns_none_without_repo_url() {
        let meta = make_metadata(None, Some("abc1234"));
        assert_eq!(github_url(&meta, Some("src/main.go"), None), None);
    }

    #[test]
    fn test_github_url_returns_none_without_commit() {
        let meta = make_metadata(Some("https://github.com/org/repo"), None);
        assert_eq!(github_url(&meta, Some("src/main.go"), None), None);
    }

    #[test]
    fn test_github_url_returns_none_without_component_path() {
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234"));
        assert_eq!(github_url(&meta, None, None), None);
    }

    #[test]
    fn test_github_url_strips_trailing_slash_from_repo_url() {
        let meta = make_metadata(Some("https://github.com/org/repo/"), Some("abc1234"));
        assert_eq!(
            github_url(&meta, Some("src/main.go"), None),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go".to_string())
        );
    }

    #[test]
    fn test_github_url_strips_git_suffix_from_repo_url() {
        let meta = make_metadata(Some("https://github.com/org/repo.git"), Some("abc1234"));
        assert_eq!(
            github_url(&meta, Some("src/main.go"), None),
            Some("https://github.com/org/repo/blob/abc1234/src/main.go".to_string())
        );
    }

    // ─── fmt_line_str ────────────────────────────────────────────────────────

    #[test]
    fn test_fmt_line_str_with_range() {
        let issue = make_issue("S1", "file.go", "msg", Some(make_range(5, 7)));
        assert_eq!(fmt_line_str(&issue), "L5");
    }

    #[test]
    fn test_fmt_line_str_with_line_only() {
        let mut issue = make_issue("S1", "file.go", "msg", None);
        issue.line = Some(42);
        assert_eq!(fmt_line_str(&issue), "L42");
    }

    #[test]
    fn test_fmt_line_str_no_location_returns_file_label() {
        let issue = make_issue("S1", "file.go", "msg", None);
        assert_eq!(fmt_line_str(&issue), "file");
    }

    #[test]
    fn test_fmt_line_str_project_level_issue_returns_project_label() {
        let issue = make_project_issue("S1", "msg");
        assert_eq!(fmt_line_str(&issue), "project");
    }

    // ─── collect_report_rule_keys ────────────────────────────────────────────

    #[test]
    fn test_collect_report_rule_keys_empty() {
        assert!(collect_report_rule_keys(&[&[]], &[]).is_empty());
    }

    #[test]
    fn test_collect_report_rule_keys_deduplicates() {
        let issues = vec![
            make_issue("go:S1", "a.go", "msg", None),
            make_issue("go:S1", "b.go", "msg", None),
        ];
        assert_eq!(collect_report_rule_keys(&[&issues], &[]), vec!["go:S1"]);
    }

    #[test]
    fn test_collect_report_rule_keys_sorted_alphabetically() {
        let issues = vec![
            make_issue("go:S999", "a.go", "msg", None),
            make_issue("go:S111", "a.go", "msg", None),
        ];
        assert_eq!(
            collect_report_rule_keys(&[&issues], &[]),
            vec!["go:S111", "go:S999"]
        );
    }

    #[test]
    fn test_collect_report_rule_keys_deduplicates_across_slices() {
        let slice1 = vec![make_issue("go:S1", "a.go", "msg", None)];
        let slice2 = vec![make_issue("go:S1", "b.go", "msg", None)];
        assert_eq!(
            collect_report_rule_keys(&[&slice1, &slice2], &[]),
            vec!["go:S1"]
        );
    }

    #[test]
    fn test_collect_report_rule_keys_merges_multiple_slices() {
        let slice1 = vec![make_issue("go:S1", "a.go", "msg", None)];
        let slice2 = vec![make_issue("go:S2", "b.go", "msg", None)];
        assert_eq!(
            collect_report_rule_keys(&[&slice1, &slice2], &[]),
            vec!["go:S1", "go:S2"]
        );
    }

    #[test]
    fn test_collect_report_rule_keys_includes_changed_issues() {
        let changed = vec![make_changed_issue()];
        assert_eq!(collect_report_rule_keys(&[], &[&changed]), vec!["go:S1"]);
    }

    // ─── html_rule_filter ────────────────────────────────────────────────────

    #[test]
    fn test_html_rule_filter_returns_empty_when_no_keys() {
        assert_eq!(html_rule_filter(&[]), "");
    }

    #[test]
    fn test_html_rule_filter_contains_all_rules_option() {
        let html = html_rule_filter(&["go:S1"]);
        assert!(html.contains(r#"<option value="">All rules</option>"#));
    }

    #[test]
    fn test_html_rule_filter_contains_rule_options() {
        let html = html_rule_filter(&["go:S1", "go:S2"]);
        assert!(html.contains(r#"<option value="go:S1">go:S1</option>"#));
        assert!(html.contains(r#"<option value="go:S2">go:S2</option>"#));
    }

    #[test]
    fn test_html_rule_filter_escapes_special_chars_in_rule_key() {
        let html = html_rule_filter(&["rule<key>"]);
        assert!(html.contains("rule&lt;key&gt;"));
        assert!(!html.contains("rule<key>"));
    }

    // ─── html_linked_cells ───────────────────────────────────────────────────

    #[test]
    fn test_html_linked_cells_with_url_wraps_in_anchor() {
        let (file_html, line_html) =
            html_linked_cells(Some("https://example.com"), "src/main.go", "L10");
        assert_eq!(
            file_html,
            r#"<a class="issue-link" href="https://example.com">src/main.go</a>"#
        );
        assert_eq!(
            line_html,
            r#"<a class="issue-link" href="https://example.com">L10</a>"#
        );
    }

    #[test]
    fn test_html_linked_cells_without_url_returns_escaped_text() {
        let (file_html, line_html) = html_linked_cells(None, "src/main.go", "L10");
        assert_eq!(file_html, "src/main.go");
        assert_eq!(line_html, "L10");
    }

    #[test]
    fn test_html_linked_cells_escapes_path_special_chars() {
        let (file_html, _) = html_linked_cells(None, "src/<main>.go", "L1");
        assert_eq!(file_html, "src/&lt;main&gt;.go");
    }

    // ─── html_summary_cards ──────────────────────────────────────────────────

    #[test]
    fn test_html_summary_cards_adds_new_card_class_when_new_issues() {
        let html = html_summary_cards(
            10,
            12,
            3,
            ChangedIssueCounts {
                total: 0,
                message: 0,
                secondary: 0,
            },
            1,
            9,
        );
        assert!(html.contains("new-card"));
        assert!(html.contains("removed-card"));
        assert!(html.contains("+3"));
        assert!(html.contains("-1"));
    }

    #[test]
    fn test_html_summary_cards_no_extra_classes_when_no_diff() {
        let html = html_summary_cards(
            5,
            5,
            0,
            ChangedIssueCounts {
                total: 0,
                message: 0,
                secondary: 0,
            },
            0,
            5,
        );
        assert!(!html.contains("new-card"));
        assert!(!html.contains("changed-card"));
        assert!(!html.contains("removed-card"));
        assert!(html.contains("+0"));
    }

    #[test]
    fn test_html_summary_cards_contains_all_counts() {
        let html = html_summary_cards(
            10,
            15,
            5,
            ChangedIssueCounts {
                total: 3,
                message: 2,
                secondary: 1,
            },
            0,
            10,
        );
        assert!(html.contains(">10<"));
        assert!(html.contains(">15<"));
        assert!(html.contains("+5"));
        assert!(html.contains(">3<"));
        assert!(html.contains("Message changes: 2"));
        assert!(html.contains("Secondary changes: 1"));
        assert!(html.contains(">10<"));
    }

    // ─── html_issue_groups ───────────────────────────────────────────────────

    #[test]
    fn test_html_issue_groups_empty_returns_empty_state_message() {
        let html = html_issue_groups(&[], &GroupBy::File, true, None);
        assert_eq!(html, r#"<p class="empty-state">No issues.</p>"#);
    }

    #[test]
    fn test_html_issue_groups_by_file_renders_project_level_issue_without_link() {
        let issues = vec![make_project_issue("go:S1", "project msg")];

        let html = html_issue_groups(
            &issues,
            &GroupBy::File,
            true,
            Some(&make_metadata(
                Some("https://github.com/org/repo"),
                Some("abc1234"),
            )),
        );

        assert_eq!(
            html,
            r#"<div class="issue-group"><div class="group-header" onclick="toggleGroup(this)"><span class="group-title">&lt;project&gt;</span><span class="count-badge new-badge">+1</span><span class="toggle-icon">&#x25bc;</span></div><div class="group-body open"><div class="issue-row" data-rule="go:S1"><div class="cell-key">go:S1</div><div class="cell-line">project</div><div class="cell-msg">project msg</div></div></div></div>"#
        );
    }

    #[test]
    fn test_html_issue_groups_by_file_contains_path_rule_and_message() {
        let issues = vec![make_issue(
            "go:S1",
            "src/main.go",
            "Missing semicolon",
            Some(make_range(5, 5)),
        )];
        let html = html_issue_groups(&issues, &GroupBy::File, true, None);
        assert!(html.contains("src/main.go"));
        assert!(html.contains("Missing semicolon"));
        assert!(html.contains("go:S1"));
        assert!(html.contains("new-badge"));
        assert!(!html.contains("removed-badge"));
    }

    #[test]
    fn test_html_issue_groups_by_rule_groups_under_rule_key() {
        let issues = vec![make_issue(
            "go:S99",
            "src/main.go",
            "msg",
            Some(make_range(3, 3)),
        )];
        let html = html_issue_groups(&issues, &GroupBy::Rule, true, None);
        assert!(html.contains("go:S99"));
        assert!(html.contains("src/main.go"));
        assert!(html.contains("new-badge"));
    }

    #[test]
    fn test_html_issue_groups_removed_uses_removed_badge() {
        let issues = vec![make_issue("go:S1", "f.go", "msg", None)];
        let html = html_issue_groups(&issues, &GroupBy::File, false, None);
        assert!(html.contains("removed-badge"));
        assert!(!html.contains("new-badge"));
    }

    #[test]
    fn test_html_issue_groups_with_github_meta_generates_link() {
        let issues = vec![make_issue(
            "go:S1",
            "src/main.go",
            "msg",
            Some(make_range(7, 7)),
        )];
        let meta = make_metadata(Some("https://github.com/org/repo"), Some("abc1234567"));
        let html = html_issue_groups(&issues, &GroupBy::File, true, Some(&meta));
        assert!(html.contains("https://github.com/org/repo/blob/abc1234567/src/main.go#L7C1-L7C1"));
    }

    #[test]
    fn test_html_issue_groups_labels_file_level_issue_location_as_file() {
        let issues = vec![make_issue("go:S1", "src/main.go", "file msg", None)];

        let html = html_issue_groups(&issues, &GroupBy::File, true, None);

        assert!(html.contains(r#"<div class="cell-line">file</div>"#));
        assert!(!html.contains(r#"<div class="cell-line">L?</div>"#));
    }

    #[test]
    fn test_html_issue_secondary_details_formats_new_issue_secondaries() {
        let html = html_issue_secondary_details(&make_issue_with_secondary(true), true);

        assert_eq!(
            html,
            r#"<div class="change-detail new-val"><span>+ secondary:</span> reference.ps1 L9:1-4 &quot;reference resource&quot;</div>"#
        );
    }

    #[test]
    fn test_html_issue_secondary_details_formats_removed_issue_secondaries() {
        let html = html_issue_secondary_details(&make_issue_with_secondary(false), false);

        assert_eq!(
            html,
            r#"<div class="change-detail removed-val"><span>- secondary:</span> reference.ps1 L9:1-4 &quot;reference resource&quot;</div>"#
        );
    }

    // ─── build_html_document ─────────────────────────────────────────────────

    #[test]
    fn test_build_html_document_has_required_structure() {
        let doc = build_html_document("My Title", "<header>h</header>", "<p>body</p>");
        assert!(doc.starts_with("<!DOCTYPE html>"));
        assert!(doc.contains("<html lang=\"en\">"));
        assert!(doc.contains("<title>My Title</title>"));
        assert!(doc.contains("<header>h</header>"));
        assert!(doc.contains("<p>body</p>"));
        assert!(doc.contains("</html>"));
    }

    #[test]
    fn test_build_html_document_escapes_title() {
        let doc = build_html_document("Title <with> & special", "", "");
        assert!(doc.contains("<title>Title &lt;with&gt; &amp; special</title>"));
    }

    #[test]
    fn test_build_html_document_includes_style_and_script() {
        let doc = build_html_document("T", "", "");
        assert!(doc.contains("<style>"));
        assert!(doc.contains("<script>"));
    }

    // ─── collect_multi_project_entries ───────────────────────────────────────

    #[test]
    fn test_collect_multi_project_entries_new_issues() {
        let pd = make_project_diff(
            "proj-a",
            vec![make_issue("go:S1", "file.go", "new msg", None)],
            vec![],
        );
        let pds = [pd];
        let entries = collect_multi_project_entries(&pds, true);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].0, "go:S1");
        assert_eq!(entries[0].1, "proj-a");
        assert_eq!(entries[0].2.message, "new msg");
    }

    #[test]
    fn test_collect_multi_project_entries_removed_issues() {
        let pd = make_project_diff(
            "proj-b",
            vec![],
            vec![make_issue("go:S2", "file.go", "removed msg", None)],
        );
        let pds = [pd];
        let entries = collect_multi_project_entries(&pds, false);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].0, "go:S2");
        assert_eq!(entries[0].1, "proj-b");
    }

    #[test]
    fn test_collect_multi_project_entries_empty_when_no_issues() {
        let pd = make_project_diff("proj-a", vec![], vec![]);
        assert!(collect_multi_project_entries(&[pd], true).is_empty());
    }

    #[test]
    fn test_collect_multi_project_entries_aggregates_across_projects() {
        let pd1 = make_project_diff(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "m", None)],
            vec![],
        );
        let pd2 = make_project_diff(
            "proj-b",
            vec![make_issue("go:S2", "b.go", "m", None)],
            vec![],
        );
        let pds = [pd1, pd2];
        let entries = collect_multi_project_entries(&pds, true);
        assert_eq!(entries.len(), 2);
    }

    // ─── multi_project_totals ────────────────────────────────────────────────

    #[test]
    fn test_multi_project_totals_sums_correctly() {
        let result = MultiProjectDiffResult {
            project_diffs: vec![
                make_project_diff("a", vec![make_issue("S1", "f.go", "m", None)], vec![]),
                make_project_diff(
                    "b",
                    vec![],
                    vec![
                        make_issue("S2", "f.go", "m", None),
                        make_issue("S2", "g.go", "m", None),
                    ],
                ),
            ],
            only_in_base: vec![],
            only_in_target: vec![],
        };
        let t = multi_project_totals(&result);
        assert_eq!(t.total_new, 1);
        assert_eq!(t.total_removed, 2);
        // base_count = pd[0].diff.base_count(0) + pd[1].diff.base_count(2)
        assert_eq!(t.total_base, 2);
        // target_count = pd[0].diff.target_count(1) + pd[1].diff.target_count(0)
        assert_eq!(t.total_target, 1);
        assert_eq!(t.total_unchanged, 0);
    }

    #[test]
    fn test_multi_project_totals_empty_result_is_all_zeros() {
        let result = MultiProjectDiffResult {
            project_diffs: vec![],
            only_in_base: vec![],
            only_in_target: vec![],
        };
        let t = multi_project_totals(&result);
        assert_eq!(t.total_new, 0);
        assert_eq!(t.total_removed, 0);
        assert_eq!(t.total_base, 0);
        assert_eq!(t.total_target, 0);
        assert_eq!(t.total_unchanged, 0);
    }

    // ─── format_text_report ──────────────────────────────────────────────────

    #[test]
    fn test_format_text_report_contains_header() {
        let base_meta = make_metadata(None, Some("abc1234567890"));
        let target_meta = make_metadata(None, Some("def9876543210"));
        let diff = make_diff(vec![], vec![]);
        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );
        assert!(out.contains("=== DiffSIT Report ==="));
        assert!(out.contains("my-project"));
        assert!(out.contains("abc1234"));
        assert!(out.contains("def9876"));
    }

    #[test]
    fn test_format_text_report_contains_summary() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let mut diff = make_diff(vec![make_issue("go:S1", "a.go", "msg", None)], vec![]);
        diff.changed_issues = vec![make_changed_issue(), make_secondary_changed_issue()];
        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );
        assert!(out.contains("--- Summary ---"));
        assert!(out.contains("New:"));
        assert!(out.contains("Changed:"));
        assert!(out.contains("Message changes:"));
        assert!(out.contains("Secondary changes:"));
    }

    #[test]
    fn test_format_text_report_contains_changed_issue_details() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let mut diff = make_diff(vec![], vec![]);
        diff.changed_issues = vec![make_changed_issue()];

        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );

        assert!(out.contains("--- Changed Issues"));
        assert!(out.contains("Message changed"));
        assert!(out.contains("base msg"));
        assert!(out.contains("target msg"));
    }

    #[test]
    fn test_format_text_report_labels_file_level_issue_location_as_file() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(
            vec![make_issue("go:S1", "file.go", "File level message", None)],
            vec![],
        );

        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );

        assert!(out.contains("[go:S1] file: File level message"));
        assert!(!out.contains("L?: File level message"));
    }

    #[test]
    fn test_append_issue_secondaries_formats_new_issue_secondaries() {
        let mut out = String::new();
        append_issue_secondaries(&mut out, &make_issue_with_secondary(true), true);

        assert_eq!(
            out,
            "      + secondary reference.ps1 L9:1-4 \"reference resource\"\n"
        );
    }

    #[test]
    fn test_append_issue_secondaries_formats_removed_issue_secondaries() {
        let mut out = String::new();
        append_issue_secondaries(&mut out, &make_issue_with_secondary(false), false);

        assert_eq!(
            out,
            "      - secondary reference.ps1 L9:1-4 \"reference resource\"\n"
        );
    }

    #[test]
    fn test_format_text_report_labels_file_level_changed_issue_location_as_file() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let mut diff = make_diff(vec![], vec![]);
        diff.changed_issues = vec![ChangedIssue {
            base_issue: make_issue("go:S1", "file.go", "base msg", None),
            target_issue: make_issue("go:S1", "file.go", "target msg", None),
            message_changed: true,
            secondary_changed: false,
            base_only_secondaries: vec![],
            target_only_secondaries: vec![],
        }];

        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );

        assert!(out.contains("[go:S1] file: Message changed"));
        assert!(!out.contains("L?: Message changed"));
    }

    #[test]
    fn test_format_text_report_show_new_false_hides_new_section() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(
            vec![make_issue("go:S1", "a.go", "new msg", None)],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            false,
            true,
            true,
        );
        assert!(!out.contains("new msg"));
        assert!(out.contains("removed msg"));
    }

    #[test]
    fn test_format_text_report_show_removed_false_hides_removed_section() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(
            vec![make_issue("go:S1", "a.go", "new msg", None)],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let out = format_text_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            false,
            true,
        );
        assert!(out.contains("new msg"));
        assert!(!out.contains("removed msg"));
    }

    // ─── format_multi_project_text_report ────────────────────────────────────

    #[test]
    fn test_format_multi_project_text_report_contains_header_and_overall_summary() {
        let mut project_diff = make_project_diff(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "msg", None)],
            vec![],
        );
        project_diff.diff.changed_issues = vec![make_changed_issue()];

        let result = MultiProjectDiffResult {
            project_diffs: vec![project_diff],
            only_in_base: vec![],
            only_in_target: vec![],
        };
        let out = format_multi_project_text_report(&result, &GroupBy::File, true, true, true);
        assert!(out.contains("=== DiffSIT Multi-Project Report ==="));
        assert!(out.contains("--- Project: proj-a ---"));
        assert!(out.contains("=== Overall Summary ==="));
        assert!(out.contains("Projects:"));
        assert!(out.contains("Message changes:"));
        assert!(out.contains("Secondary changes:"));
    }

    #[test]
    fn test_format_multi_project_text_report_shows_only_in_base_and_target() {
        let result = MultiProjectDiffResult {
            project_diffs: vec![],
            only_in_base: vec!["base-only".to_string()],
            only_in_target: vec!["target-only".to_string()],
        };
        let out = format_multi_project_text_report(&result, &GroupBy::File, true, true, true);
        assert!(out.contains("--- Projects only in base ---"));
        assert!(out.contains("base-only"));
        assert!(out.contains("--- Projects only in target ---"));
        assert!(out.contains("target-only"));
    }

    // ─── build_json_report ───────────────────────────────────────────────────

    #[test]
    fn test_build_json_report_valid_json_structure() {
        let diff = make_diff(
            vec![make_issue("go:S1", "a.go", "new msg", None)],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let json_str = build_json_report(&diff, true, true, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert!(v["summary"]["new"].is_number());
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["summary"]["removed"], 1);
        assert_eq!(v["summary"]["changed"], 0);
        assert_eq!(v["summary"]["message_changes"], 0);
        assert_eq!(v["summary"]["secondary_changes"], 0);
        assert!(v["new_issues"].is_array());
        assert!(v["removed_issues"].is_array());
        assert!(v["changed_issues"].is_array());
    }

    #[test]
    fn test_build_json_report_serializes_project_level_issue_component_path_as_null() {
        let diff = make_diff(vec![make_project_issue("go:S1", "project msg")], vec![]);

        let json_str = build_json_report(&diff, true, true, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();

        assert_eq!(v["summary"]["base_count"], 0);
        assert_eq!(v["summary"]["target_count"], 1);
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["new_issues"].as_array().unwrap().len(), 1);
        assert_eq!(v["new_issues"][0]["rule_key"], "go:S1");
        assert_eq!(
            v["new_issues"][0]["component_path"],
            serde_json::Value::Null
        );
        assert_eq!(v["new_issues"][0]["message"], "project msg");
    }

    #[test]
    fn test_build_json_report_includes_changed_issues() {
        let mut diff = make_diff(vec![], vec![]);
        diff.changed_issues = vec![make_changed_issue()];

        let json_str = build_json_report(&diff, true, true, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();

        assert_eq!(v["summary"]["changed"], 1);
        assert_eq!(v["summary"]["message_changes"], 1);
        assert_eq!(v["summary"]["secondary_changes"], 0);
        assert_eq!(v["changed_issues"].as_array().unwrap().len(), 1);
        assert_eq!(v["changed_issues"][0]["message_changed"], true);
    }

    #[test]
    fn test_build_json_report_show_new_false_returns_empty_new_issues() {
        let diff = make_diff(vec![make_issue("go:S1", "a.go", "new msg", None)], vec![]);
        let json_str = build_json_report(&diff, false, true, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert_eq!(v["new_issues"].as_array().unwrap().len(), 0);
        // summary still shows count
        assert_eq!(v["summary"]["new"], 1);
    }

    #[test]
    fn test_build_json_report_show_removed_false_returns_empty_removed_issues() {
        let diff = make_diff(
            vec![],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let json_str = build_json_report(&diff, true, false, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert_eq!(v["removed_issues"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_build_json_report_show_changed_false_returns_empty_changed_issues() {
        let mut diff = make_diff(vec![], vec![]);
        diff.changed_issues = vec![make_changed_issue()];
        let json_str = build_json_report(&diff, true, true, false).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert_eq!(v["changed_issues"].as_array().unwrap().len(), 0);
        assert_eq!(v["summary"]["changed"], 1);
        assert_eq!(v["summary"]["message_changes"], 1);
    }

    // ─── build_multi_project_json_report ─────────────────────────────────────

    #[test]
    fn test_build_multi_project_json_report_valid_json_structure() {
        let mut project_diff = make_project_diff(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "msg", None)],
            vec![],
        );
        project_diff.diff.changed_issues =
            vec![make_changed_issue(), make_secondary_changed_issue()];

        let result = MultiProjectDiffResult {
            project_diffs: vec![project_diff],
            only_in_base: vec!["base-only".to_string()],
            only_in_target: vec![],
        };
        let json_str = build_multi_project_json_report(&result, true, true, true).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert!(v["overall_summary"].is_object());
        assert_eq!(v["overall_summary"]["projects"], 1);
        assert_eq!(v["overall_summary"]["changed"], 2);
        assert_eq!(v["overall_summary"]["message_changes"], 1);
        assert_eq!(v["overall_summary"]["secondary_changes"], 1);
        assert_eq!(
            v["overall_summary"]["only_in_base"][0].as_str().unwrap(),
            "base-only"
        );
        assert!(v["projects"].is_array());
        assert_eq!(v["projects"][0]["project"].as_str().unwrap(), "proj-a");
        assert_eq!(v["projects"][0]["summary"]["message_changes"], 1);
        assert_eq!(v["projects"][0]["summary"]["secondary_changes"], 1);
    }

    // ─── build_html_report ───────────────────────────────────────────────────

    #[test]
    fn test_build_html_report_starts_with_doctype() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(vec![], vec![]);
        let html = build_html_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );
        assert!(html.starts_with("<!DOCTYPE html>"));
    }

    #[test]
    fn test_build_html_report_contains_expected_content() {
        let base_meta = make_metadata(None, Some("abc1234567890"));
        let target_meta = make_metadata(None, Some("def9876543210"));
        let diff = make_diff(
            vec![make_issue("go:S1", "src/main.go", "some issue", None)],
            vec![],
        );
        let html = build_html_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );
        assert!(html.contains("DiffSIT Report"));
        assert!(html.contains("src/main.go"));
        assert!(html.contains("some issue"));
    }

    #[test]
    fn test_build_html_report_contains_changed_issues() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let mut diff = make_diff(vec![], vec![]);
        diff.changed_issues = vec![make_changed_issue()];

        let html = build_html_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            true,
            true,
        );

        assert!(html.contains("Changed Issues"));
        assert!(html.contains("Message changes: 1"));
        assert!(html.contains("Secondary changes: 0"));
        assert!(html.contains("base msg"));
        assert!(html.contains("target msg"));
    }

    #[test]
    fn test_build_html_report_show_new_false_hides_new_section() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(
            vec![make_issue("go:S1", "a.go", "new msg", None)],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let html = build_html_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            false,
            true,
            true,
        );
        assert!(!html.contains("new msg"));
        assert!(html.contains("removed msg"));
    }

    #[test]
    fn test_build_html_report_show_removed_false_hides_removed_section() {
        let base_meta = make_metadata(None, None);
        let target_meta = make_metadata(None, None);
        let diff = make_diff(
            vec![make_issue("go:S1", "a.go", "new msg", None)],
            vec![make_issue("go:S2", "b.go", "removed msg", None)],
        );
        let html = build_html_report(
            &base_meta,
            &target_meta,
            &diff,
            &GroupBy::File,
            true,
            false,
            true,
        );
        assert!(html.contains("new msg"));
        assert!(!html.contains("removed msg"));
    }

    // ─── build_multi_project_html_report ─────────────────────────────────────

    #[test]
    fn test_build_multi_project_html_report_has_html_structure() {
        let mut project_diff = make_project_diff(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "msg", None)],
            vec![],
        );
        project_diff.diff.changed_issues = vec![make_changed_issue()];

        let result = MultiProjectDiffResult {
            project_diffs: vec![project_diff],
            only_in_base: vec![],
            only_in_target: vec![],
        };
        let html = build_multi_project_html_report(&result, true, true, true);
        assert!(html.starts_with("<!DOCTYPE html>"));
        assert!(html.contains("DiffSIT Multi-Project Report"));
        assert!(html.contains("Overall Summary"));
        assert!(html.contains("Message changes:"));
        assert!(html.contains("Secondary changes:"));
    }

    #[test]
    fn test_build_multi_project_html_report_contains_only_in_sections() {
        let result = MultiProjectDiffResult {
            project_diffs: vec![],
            only_in_base: vec!["base-only".to_string()],
            only_in_target: vec!["target-only".to_string()],
        };
        let html = build_multi_project_html_report(&result, true, true, true);
        assert!(html.contains("Only in Base"));
        assert!(html.contains("base-only"));
        assert!(html.contains("Only in Target"));
        assert!(html.contains("target-only"));
    }
}
