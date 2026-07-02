/*
 * Copyright (C) SonarSource Sàrl
 * For more information, see https://sonarsource.com/legal/
 * mailto:info AT sonarsource DOT com
*/
use std::fs;
use std::path::PathBuf;
use std::process;

use anyhow::bail;
use clap::{Parser, ValueEnum};

use diffsit::fingerprint::{diff, diff_multi_project, diff_multi_project_strict, diff_strict};
use diffsit::output::{
    build_html_report, build_json_report, build_multi_project_html_report,
    build_multi_project_json_report, format_multi_project_text_report, format_text_report,
    GroupBy as OutputGroupBy,
};
use diffsit::reader::{read_input, InputKind};

/// Compare SonarQube issue reports between two analysis runs.
///
/// Exit codes: 0 = no diff, 1 = differences found, 2 = error.
#[derive(Parser)]
#[command(name = "diffsit", version)]
struct Cli {
    /// Path to the base (before) analysis (.zip or directory)
    base: PathBuf,

    /// Path to the target (after) analysis (.zip or directory)
    target: PathBuf,

    /// Group output by file or rule
    #[arg(long, value_enum, default_value_t = GroupBy::File)]
    group_by: GroupBy,

    /// Show only new issues
    #[arg(long)]
    only_new: bool,

    /// Show only removed issues
    #[arg(long)]
    only_removed: bool,

    /// Filter issues by file path (substring match on component path)
    #[arg(long)]
    file_filter: Option<String>,

    /// Filter issues by rule key (exact match)
    #[arg(long, value_delimiter = ',')]
    rule_filter: Vec<String>,

    /// Filter projects by name (substring match, multi-project mode only)
    #[arg(long)]
    project_filter: Option<String>,

    /// Output format
    #[arg(long, value_enum)]
    format: Option<Format>,

    /// Output formats to write under --output
    #[arg(long, value_enum, value_delimiter = ',')]
    formats: Vec<Format>,

    /// Directory where report files are written
    #[arg(long)]
    output: Option<PathBuf>,

    /// Issue matching mode: explain pairs same-primary secondary/message drift as changed; strict uses full fingerprints only
    #[arg(long, value_enum, default_value_t = DiffMode::Explain)]
    diff_mode: DiffMode,
}

#[derive(Clone, Debug, ValueEnum)]
enum GroupBy {
    File,
    Rule,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
enum Format {
    Text,
    Json,
    Html,
}

#[derive(Clone, Debug, ValueEnum)]
enum DiffMode {
    Explain,
    Strict,
}

fn main() {
    let cli = Cli::parse();

    let exit_code = match run(&cli) {
        Ok(result) => match emit_reports(&cli, &result) {
            Ok(()) => result.exit_code,
            Err(e) => {
                eprintln!("Error: {:#}", e);
                2
            }
        },
        Err(e) => {
            eprintln!("Error: {:#}", e);
            2
        }
    };

    process::exit(exit_code);
}

#[derive(Debug)]
struct RenderedReport {
    format: Format,
    content: String,
}

#[derive(Debug)]
struct RunResult {
    reports: Vec<RenderedReport>,
    exit_code: i32,
}

#[derive(Clone, Copy, Debug)]
struct ReportVisibility {
    show_new: bool,
    show_removed: bool,
    show_changed: bool,
}

fn selected_formats(cli: &Cli) -> anyhow::Result<Vec<Format>> {
    if !cli.formats.is_empty() {
        if cli.format.is_some() {
            bail!("Use either --format or --formats, not both");
        }
        if cli.output.is_none() {
            bail!("--output is required when --formats is used");
        }
        return Ok(cli.formats.clone());
    }

    Ok(vec![cli.format.unwrap_or(Format::Text)])
}

fn report_file_name(format: Format) -> &'static str {
    match format {
        Format::Text => "diffsit-report.txt",
        Format::Json => "diffsit-report.json",
        Format::Html => "diffsit-report.html",
    }
}

fn emit_reports(cli: &Cli, result: &RunResult) -> anyhow::Result<()> {
    if let Some(output_dir) = &cli.output {
        fs::create_dir_all(output_dir)?;
        for report in &result.reports {
            let report_path = output_dir.join(report_file_name(report.format));
            fs::write(report_path, &report.content)?;
        }
        return Ok(());
    }

    if result.reports.len() != 1 {
        bail!("--output is required when writing multiple formats");
    }
    print!("{}", result.reports[0].content);
    Ok(())
}

fn run(cli: &Cli) -> anyhow::Result<RunResult> {
    let base_input = read_input(&cli.base)?;
    let target_input = read_input(&cli.target)?;

    match (base_input, target_input) {
        (InputKind::SingleProject(base_run), InputKind::SingleProject(target_run)) => {
            run_single_project_reports(cli, &base_run, &target_run)
        }
        (InputKind::MultiProject(base_projects), InputKind::MultiProject(target_projects)) => {
            run_multi_project_reports(cli, &base_projects, &target_projects)
        }
        _ => bail!(
            "Base and target must be the same type (both single-project or both multi-project)"
        ),
    }
}

#[cfg(test)]
fn run_single_project(
    cli: &Cli,
    base_run: &diffsit::models::AnalysisRun,
    target_run: &diffsit::models::AnalysisRun,
) -> anyhow::Result<(String, i32)> {
    let mut result = run_single_project_reports(cli, base_run, target_run)?;
    if result.reports.len() != 1 {
        bail!("run_single_project requires exactly one output format");
    }
    let report = result.reports.remove(0);
    Ok((report.content, result.exit_code))
}

fn run_single_project_reports(
    cli: &Cli,
    base_run: &diffsit::models::AnalysisRun,
    target_run: &diffsit::models::AnalysisRun,
) -> anyhow::Result<RunResult> {
    let filtered_base_run = filtered_analysis_run(base_run, cli);
    let filtered_target_run = filtered_analysis_run(target_run, cli);
    let result = match cli.diff_mode {
        DiffMode::Explain => diff(&filtered_base_run, &filtered_target_run),
        DiffMode::Strict => diff_strict(&filtered_base_run, &filtered_target_run),
    };

    let has_diff = !result.new_issues.is_empty()
        || !result.removed_issues.is_empty()
        || !result.changed_issues.is_empty();
    let visibility = ReportVisibility {
        show_new: !cli.only_removed,
        show_removed: !cli.only_new,
        show_changed: !cli.only_new && !cli.only_removed,
    };

    let reports = selected_formats(cli)?
        .into_iter()
        .map(|format| {
            render_single_project_report(format, cli, base_run, target_run, &result, visibility)
                .map(|content| RenderedReport { format, content })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    Ok(RunResult {
        reports,
        exit_code: if has_diff { 1 } else { 0 },
    })
}

fn render_single_project_report(
    format: Format,
    cli: &Cli,
    base_run: &diffsit::models::AnalysisRun,
    target_run: &diffsit::models::AnalysisRun,
    result: &diffsit::models::DiffResult,
    visibility: ReportVisibility,
) -> anyhow::Result<String> {
    match format {
        Format::Text => {
            let group_by = map_group_by(&cli.group_by);
            Ok(format_text_report(
                &base_run.metadata,
                &target_run.metadata,
                result,
                &group_by,
                visibility.show_new,
                visibility.show_removed,
                visibility.show_changed,
            ))
        }
        Format::Json => build_json_report(
            result,
            visibility.show_new,
            visibility.show_removed,
            visibility.show_changed,
        ),
        Format::Html => {
            let group_by = map_group_by(&cli.group_by);
            Ok(build_html_report(
                &base_run.metadata,
                &target_run.metadata,
                result,
                &group_by,
                visibility.show_new,
                visibility.show_removed,
                visibility.show_changed,
            ))
        }
    }
}

#[cfg(test)]
fn run_multi_project(
    cli: &Cli,
    base_projects: &[diffsit::models::NamedProjectRun],
    target_projects: &[diffsit::models::NamedProjectRun],
) -> anyhow::Result<(String, i32)> {
    let mut result = run_multi_project_reports(cli, base_projects, target_projects)?;
    if result.reports.len() != 1 {
        bail!("run_multi_project requires exactly one output format");
    }
    let report = result.reports.remove(0);
    Ok((report.content, result.exit_code))
}

fn run_multi_project_reports(
    cli: &Cli,
    base_projects: &[diffsit::models::NamedProjectRun],
    target_projects: &[diffsit::models::NamedProjectRun],
) -> anyhow::Result<RunResult> {
    // Apply project filter
    let base_filtered: Vec<_> = base_projects
        .iter()
        .filter(|p| {
            cli.project_filter
                .as_ref()
                .map(|f| p.name.contains(f.as_str()))
                .unwrap_or(true)
        })
        .collect();
    let target_filtered: Vec<_> = target_projects
        .iter()
        .filter(|p| {
            cli.project_filter
                .as_ref()
                .map(|f| p.name.contains(f.as_str()))
                .unwrap_or(true)
        })
        .collect();

    let base_refs: Vec<diffsit::models::NamedProjectRun> = base_filtered
        .into_iter()
        .map(|p| diffsit::models::NamedProjectRun {
            name: p.name.clone(),
            run: filtered_analysis_run(&p.run, cli),
        })
        .collect();
    let target_refs: Vec<diffsit::models::NamedProjectRun> = target_filtered
        .into_iter()
        .map(|p| diffsit::models::NamedProjectRun {
            name: p.name.clone(),
            run: filtered_analysis_run(&p.run, cli),
        })
        .collect();

    let multi_result = match cli.diff_mode {
        DiffMode::Explain => diff_multi_project(&base_refs, &target_refs),
        DiffMode::Strict => diff_multi_project_strict(&base_refs, &target_refs),
    };

    let has_diff = multi_result.project_diffs.iter().any(|pd| {
        !pd.diff.new_issues.is_empty()
            || !pd.diff.removed_issues.is_empty()
            || !pd.diff.changed_issues.is_empty()
    }) || !multi_result.only_in_base.is_empty()
        || !multi_result.only_in_target.is_empty();

    let visibility = ReportVisibility {
        show_new: !cli.only_removed,
        show_removed: !cli.only_new,
        show_changed: !cli.only_new && !cli.only_removed,
    };

    let reports = selected_formats(cli)?
        .into_iter()
        .map(|format| {
            render_multi_project_report(format, cli, &multi_result, visibility)
                .map(|content| RenderedReport { format, content })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    Ok(RunResult {
        reports,
        exit_code: if has_diff { 1 } else { 0 },
    })
}

fn render_multi_project_report(
    format: Format,
    cli: &Cli,
    multi_result: &diffsit::models::MultiProjectDiffResult,
    visibility: ReportVisibility,
) -> anyhow::Result<String> {
    match format {
        Format::Text => {
            let group_by = map_group_by(&cli.group_by);
            Ok(format_multi_project_text_report(
                multi_result,
                &group_by,
                visibility.show_new,
                visibility.show_removed,
                visibility.show_changed,
            ))
        }
        Format::Json => build_multi_project_json_report(
            multi_result,
            visibility.show_new,
            visibility.show_removed,
            visibility.show_changed,
        ),
        Format::Html => Ok(build_multi_project_html_report(
            multi_result,
            visibility.show_new,
            visibility.show_removed,
            visibility.show_changed,
        )),
    }
}

fn map_group_by(g: &GroupBy) -> OutputGroupBy {
    match g {
        GroupBy::File => OutputGroupBy::File,
        GroupBy::Rule => OutputGroupBy::Rule,
    }
}

fn filtered_analysis_run(
    run: &diffsit::models::AnalysisRun,
    cli: &Cli,
) -> diffsit::models::AnalysisRun {
    diffsit::models::AnalysisRun {
        metadata: run.metadata.clone(),
        issues: run
            .issues
            .iter()
            .filter(|issue| matches_issue_filters(issue, cli))
            .cloned()
            .collect(),
    }
}

fn matches_issue_filters(issue: &diffsit::models::Issue, cli: &Cli) -> bool {
    cli.file_filter.as_ref().is_none_or(|file_filter| {
        issue
            .component_path
            .as_deref()
            .is_some_and(|component_path| component_path.contains(file_filter.as_str()))
    }) && (cli.rule_filter.is_empty() || cli.rule_filter.iter().any(|rule| rule == &issue.rule_key))
}

#[cfg(test)]
mod tests {
    use super::*;
    use diffsit::models::{AnalysisRun, Issue, Metadata, NamedProjectRun, Range};
    use serde_json::Value;
    use std::io::Write;
    use tempfile::TempDir;

    fn make_range(start: u32, end: u32) -> Range {
        Range {
            start_line: start,
            end_line: end,
            start_line_offset: 0,
            end_line_offset: 0,
        }
    }

    fn make_issue(rule_key: &str, component_path: &str, message: &str) -> Issue {
        Issue {
            rule_key: rule_key.to_string(),
            component_path: Some(component_path.to_string()),
            message: message.to_string(),
            range: Some(make_range(1, 1)),
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

    fn make_cli(
        only_new: bool,
        only_removed: bool,
        file_filter: Option<&str>,
        rule_filter: &[&str],
        project_filter: Option<&str>,
        format: Format,
    ) -> Cli {
        Cli {
            base: PathBuf::from("base"),
            target: PathBuf::from("target"),
            group_by: GroupBy::File,
            only_new,
            only_removed,
            file_filter: file_filter.map(str::to_string),
            rule_filter: rule_filter.iter().map(|r| r.to_string()).collect(),
            project_filter: project_filter.map(str::to_string),
            format: Some(format),
            formats: vec![],
            output: None,
            diff_mode: DiffMode::Explain,
        }
    }

    fn assert_report_file(path: &std::path::Path, expected: &str) {
        let actual = fs::read_to_string(path).unwrap();
        assert_eq!(actual, expected);
    }

    fn make_path_cli(base: PathBuf, target: PathBuf, format: Format) -> Cli {
        let mut cli = make_cli(false, false, None, &[], None, format);
        cli.base = base;
        cli.target = target;
        cli
    }

    fn create_zip(dir: &TempDir, name: &str, entries: &[(&str, &str)]) -> PathBuf {
        let zip_path = dir.path().join(name);
        let file = std::fs::File::create(&zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default();
        for (entry_name, content) in entries {
            zip.start_file(*entry_name, options).unwrap();
            zip.write_all(content.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        zip_path
    }

    fn create_snapshot_zip(
        dir: &TempDir,
        name: &str,
        project_name: &str,
        issues_json: &str,
    ) -> PathBuf {
        let snapshot = format!(
            r#"{{
  "$schemaVersion":"1.2",
  "projectName":"{project_name}",
  "metadata":{{"data":{{"projectCommitHash":"abc1234"}}}},
  "components":[{{"path":"src/main.go","issues":{issues_json}}}]
}}"#
        );
        create_zip(
            dir,
            name,
            &[
                ("snapshot.json", &snapshot),
                ("metadata.json", r#"{"$schemaVersion":"1.2","rules":[]}"#),
            ],
        )
    }

    fn create_sit_export(dir: &TempDir, name: &str, issues_jsonl: &str) -> PathBuf {
        let export_dir = dir.path().join(name);
        std::fs::create_dir_all(&export_dir).unwrap();
        std::fs::write(export_dir.join("issues.jsonl"), issues_jsonl).unwrap();
        export_dir
    }

    // ─── run_single_project ──────────────────────────────────────────────────

    #[test]
    fn test_run_single_project_no_diff_returns_exit_code_0() {
        let issue = make_issue("go:S1", "main.go", "msg");
        let base = make_run(vec![issue.clone()]);
        let target = make_run(vec![issue]);
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 0);
    }

    #[test]
    fn test_run_single_project_with_new_issue_returns_exit_code_1() {
        let base = make_run(vec![]);
        let target = make_run(vec![make_issue("go:S1", "main.go", "msg")]);
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
    }

    #[test]
    fn test_run_single_project_with_removed_issue_returns_exit_code_1() {
        let base = make_run(vec![make_issue("go:S1", "main.go", "msg")]);
        let target = make_run(vec![]);
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
    }

    #[test]
    fn test_run_single_project_file_filter_removes_non_matching_issues() {
        let base = make_run(vec![]);
        let target = make_run(vec![
            make_issue("go:S1", "src/main.go", "match"),
            make_issue("go:S1", "other/file.go", "no match"),
        ]);
        let cli = make_cli(false, false, Some("src/"), &[], None, Format::Text);
        let (output, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
        assert!(output.contains("match"));
        assert!(!output.contains("no match"));
    }

    #[test]
    fn test_run_single_project_file_filter_removes_project_level_issues() {
        let base = make_run(vec![]);
        let target = make_run(vec![
            make_issue("go:S1", "src/main.go", "file match"),
            make_project_issue("go:S1", "project no match"),
        ]);
        let cli = make_cli(false, false, Some("src/"), &[], None, Format::Json);

        let (output, code) = run_single_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["summary"]["target_count"], 1);
        assert_eq!(v["new_issues"].as_array().unwrap().len(), 1);
        assert_eq!(v["new_issues"][0]["message"], "file match");
        assert_eq!(v["new_issues"][0]["component_path"], "src/main.go");
    }

    #[test]
    fn test_run_single_project_rule_filter_keeps_only_matching_rule() {
        let base = make_run(vec![]);
        let target = make_run(vec![
            make_issue("go:S1", "a.go", "issue S1"),
            make_issue("go:S2", "b.go", "issue S2"),
        ]);
        let cli = make_cli(false, false, None, &["go:S1"], None, Format::Text);
        let (output, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
        assert!(output.contains("issue S1"));
        assert!(!output.contains("issue S2"));
    }

    #[test]
    fn test_run_single_project_rule_filter_keeps_project_level_issue() {
        let base = make_run(vec![]);
        let target = make_run(vec![
            make_project_issue("go:S1", "project issue S1"),
            make_project_issue("go:S2", "project issue S2"),
        ]);
        let cli = make_cli(false, false, None, &["go:S1"], None, Format::Json);

        let (output, code) = run_single_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["summary"]["target_count"], 1);
        assert_eq!(v["new_issues"].as_array().unwrap().len(), 1);
        assert_eq!(v["new_issues"][0]["message"], "project issue S1");
        assert_eq!(v["new_issues"][0]["component_path"], Value::Null);
    }

    #[test]
    fn test_run_single_project_rule_filter_keeps_multiple_matching_rules() {
        let base = make_run(vec![]);
        let target = make_run(vec![
            make_issue("go:S1", "a.go", "issue S1"),
            make_issue("go:S2", "b.go", "issue S2"),
            make_issue("go:S3", "c.go", "issue S3"),
        ]);
        let cli = make_cli(false, false, None, &["go:S1", "go:S3"], None, Format::Text);
        let (output, code) = run_single_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
        assert!(output.contains("issue S1"));
        assert!(output.contains("issue S3"));
        assert!(!output.contains("issue S2"));
    }

    #[test]
    fn test_run_single_project_rule_filter_scopes_summary_counts() {
        let base = make_run(vec![
            make_issue("go:S1", "a.go", "kept unchanged"),
            make_issue("go:S2", "b.go", "filtered unchanged"),
        ]);
        let target = make_run(vec![
            make_issue("go:S1", "a.go", "kept unchanged"),
            make_issue("go:S1", "c.go", "kept new"),
            make_issue("go:S2", "b.go", "filtered unchanged"),
        ]);
        let cli = make_cli(false, false, None, &["go:S1"], None, Format::Json);

        let (output, code) = run_single_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["summary"]["base_count"], 1);
        assert_eq!(v["summary"]["target_count"], 2);
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["summary"]["removed"], 0);
        assert_eq!(v["summary"]["unchanged"], 1);
    }

    #[test]
    fn test_run_single_project_file_filter_scopes_summary_counts() {
        let base = make_run(vec![
            make_issue("go:S1", "src/a.go", "kept unchanged"),
            make_issue("go:S1", "test/b.go", "filtered unchanged"),
        ]);
        let target = make_run(vec![
            make_issue("go:S1", "src/a.go", "kept unchanged"),
            make_issue("go:S1", "src/c.go", "kept new"),
            make_issue("go:S1", "test/b.go", "filtered unchanged"),
        ]);
        let cli = make_cli(false, false, Some("src/"), &[], None, Format::Json);

        let (output, code) = run_single_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["summary"]["base_count"], 1);
        assert_eq!(v["summary"]["target_count"], 2);
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["summary"]["removed"], 0);
        assert_eq!(v["summary"]["unchanged"], 1);
    }

    #[test]
    fn test_run_single_project_only_new_excludes_removed_from_output() {
        let base = make_run(vec![make_issue("go:S1", "old.go", "removed issue")]);
        let target = make_run(vec![make_issue("go:S2", "new.go", "new issue")]);
        let cli = make_cli(true, false, None, &[], None, Format::Text);
        let (output, _) = run_single_project(&cli, &base, &target).unwrap();
        assert!(output.contains("new issue"));
        assert!(!output.contains("removed issue"));
    }

    #[test]
    fn test_run_single_project_only_removed_excludes_new_from_output() {
        let base = make_run(vec![make_issue("go:S1", "old.go", "removed issue")]);
        let target = make_run(vec![make_issue("go:S2", "new.go", "new issue")]);
        let cli = make_cli(false, true, None, &[], None, Format::Text);
        let (output, _) = run_single_project(&cli, &base, &target).unwrap();
        assert!(!output.contains("new issue"));
        assert!(output.contains("removed issue"));
    }

    #[test]
    fn test_run_single_project_json_format_returns_valid_json() {
        let base = make_run(vec![]);
        let target = make_run(vec![make_issue("go:S1", "a.go", "json issue")]);
        let cli = make_cli(false, false, None, &[], None, Format::Json);
        let (output, _) = run_single_project(&cli, &base, &target).unwrap();
        let v: Value = serde_json::from_str(&output).unwrap();
        assert!(v["summary"].is_object());
        assert!(v["new_issues"].is_array());
        assert!(v["changed_issues"].is_array());
    }

    #[test]
    fn test_run_single_project_strict_mode_reports_message_change_as_new_and_removed() {
        let base = make_run(vec![make_issue("go:S1", "a.go", "base msg")]);
        let target = make_run(vec![make_issue("go:S1", "a.go", "target msg")]);
        let mut cli = make_cli(false, false, None, &[], None, Format::Json);
        cli.diff_mode = DiffMode::Strict;

        let (output, code) = run_single_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["summary"]["removed"], 1);
        assert_eq!(v["summary"]["changed"], 0);
    }

    #[test]
    fn test_run_single_project_html_format_returns_valid_html() {
        let base = make_run(vec![]);
        let target = make_run(vec![make_issue("go:S1", "a.go", "html issue")]);
        let cli = make_cli(false, false, None, &[], None, Format::Html);
        let (output, _) = run_single_project(&cli, &base, &target).unwrap();
        assert!(output.starts_with("<!DOCTYPE html>"));
        assert!(output.contains("html issue"));
    }

    // ─── run_multi_project ───────────────────────────────────────────────────

    #[test]
    fn test_run_multi_project_no_diff_returns_exit_code_0() {
        let issue = make_issue("go:S1", "main.go", "msg");
        let base = vec![make_named_run("proj-a", vec![issue.clone()])];
        let target = vec![make_named_run("proj-a", vec![issue])];
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 0);
    }

    #[test]
    fn test_run_multi_project_with_new_issue_returns_exit_code_1() {
        let base = vec![make_named_run("proj-a", vec![])];
        let target = vec![make_named_run(
            "proj-a",
            vec![make_issue("go:S1", "main.go", "msg")],
        )];
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
    }

    #[test]
    fn test_run_multi_project_only_in_base_returns_exit_code_1() {
        let base = vec![
            make_named_run("proj-a", vec![]),
            make_named_run("proj-b", vec![]),
        ];
        let target = vec![make_named_run("proj-a", vec![])];
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
    }

    #[test]
    fn test_run_multi_project_only_in_target_returns_exit_code_1() {
        let base = vec![make_named_run("proj-a", vec![])];
        let target = vec![
            make_named_run("proj-a", vec![]),
            make_named_run("proj-b", vec![]),
        ];
        let cli = make_cli(false, false, None, &[], None, Format::Text);
        let (_, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
    }

    #[test]
    fn test_run_multi_project_project_filter_filters_projects() {
        let base = vec![
            make_named_run("proj-a", vec![]),
            make_named_run("proj-b", vec![]),
        ];
        let target = vec![
            make_named_run("proj-a", vec![make_issue("go:S1", "f.go", "msg")]),
            make_named_run("proj-b", vec![]),
        ];
        // Filter to only proj-b, which has no diff → exit code 0
        let cli = make_cli(false, false, None, &[], Some("proj-b"), Format::Text);
        let (_, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 0);
    }

    #[test]
    fn test_run_multi_project_rule_filter_keeps_multiple_matching_rules() {
        let base = vec![make_named_run("proj-a", vec![])];
        let target = vec![make_named_run(
            "proj-a",
            vec![
                make_issue("go:S1", "a.go", "issue S1"),
                make_issue("go:S2", "b.go", "issue S2"),
                make_issue("go:S3", "c.go", "issue S3"),
            ],
        )];
        let cli = make_cli(false, false, None, &["go:S1", "go:S3"], None, Format::Text);
        let (output, code) = run_multi_project(&cli, &base, &target).unwrap();
        assert_eq!(code, 1);
        assert!(output.contains("issue S1"));
        assert!(output.contains("issue S3"));
        assert!(!output.contains("issue S2"));
    }

    #[test]
    fn test_run_multi_project_rule_filter_scopes_summary_counts() {
        let base = vec![make_named_run(
            "proj-a",
            vec![
                make_issue("go:S1", "a.go", "kept unchanged"),
                make_issue("go:S2", "b.go", "filtered unchanged"),
            ],
        )];
        let target = vec![make_named_run(
            "proj-a",
            vec![
                make_issue("go:S1", "a.go", "kept unchanged"),
                make_issue("go:S1", "c.go", "kept new"),
                make_issue("go:S2", "b.go", "filtered unchanged"),
            ],
        )];
        let cli = make_cli(false, false, None, &["go:S1"], None, Format::Json);

        let (output, code) = run_multi_project(&cli, &base, &target).unwrap();

        assert_eq!(code, 1);
        let v: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(v["overall_summary"]["base_count"], 1);
        assert_eq!(v["overall_summary"]["target_count"], 2);
        assert_eq!(v["overall_summary"]["new"], 1);
        assert_eq!(v["overall_summary"]["removed"], 0);
        assert_eq!(v["overall_summary"]["unchanged"], 1);
        assert_eq!(v["projects"][0]["summary"]["base_count"], 1);
        assert_eq!(v["projects"][0]["summary"]["target_count"], 2);
        assert_eq!(v["projects"][0]["summary"]["unchanged"], 1);
    }

    #[test]
    fn test_run_multi_project_json_format_returns_valid_json() {
        let base = vec![make_named_run("proj-a", vec![])];
        let target = vec![make_named_run(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "msg")],
        )];
        let cli = make_cli(false, false, None, &[], None, Format::Json);
        let (output, _) = run_multi_project(&cli, &base, &target).unwrap();
        let v: Value = serde_json::from_str(&output).unwrap();
        assert!(v["overall_summary"].is_object());
        assert!(v["projects"].is_array());
    }

    #[test]
    fn test_run_multi_project_html_format_returns_valid_html() {
        let base = vec![make_named_run("proj-a", vec![])];
        let target = vec![make_named_run(
            "proj-a",
            vec![make_issue("go:S1", "a.go", "html msg")],
        )];
        let cli = make_cli(false, false, None, &[], None, Format::Html);
        let (output, _) = run_multi_project(&cli, &base, &target).unwrap();
        assert!(output.starts_with("<!DOCTYPE html>"));
        assert!(output.contains("html msg"));
    }

    #[test]
    fn test_run_accepts_snapshot_vs_snapshot() {
        let dir = TempDir::new().unwrap();
        let base = create_snapshot_zip(&dir, "base.zip", "dre:proj", "[]");
        let target = create_snapshot_zip(
            &dir,
            "target.zip",
            "dre:proj",
            r#"[{"rule":"godre:S1","message":"Fix this","location":"10,2,10,7","secondaryLocations":[]}]"#,
        );
        let cli = make_path_cli(base, target, Format::Json);

        let result = run(&cli).unwrap();

        assert_eq!(result.exit_code, 1);
        assert_eq!(result.reports.len(), 1);
        let v: Value = serde_json::from_str(&result.reports[0].content).unwrap();
        assert_eq!(v["summary"]["base_count"], 0);
        assert_eq!(v["summary"]["target_count"], 1);
        assert_eq!(v["summary"]["new"], 1);
        assert_eq!(v["summary"]["removed"], 0);
        assert_eq!(v["summary"]["unchanged"], 0);
        assert_eq!(v["new_issues"][0]["rule_key"], "godre:S1");
        assert_eq!(v["new_issues"][0]["component_path"], "src/main.go");
        assert_eq!(v["new_issues"][0]["message"], "Fix this");
    }

    #[test]
    fn test_run_accepts_snapshot_vs_sit_export() {
        let dir = TempDir::new().unwrap();
        let base = create_snapshot_zip(
            &dir,
            "base.zip",
            "dre:proj",
            r#"[{"rule":"godre:S1","message":"Fix this","location":"10,2,10,7","secondaryLocations":[]}]"#,
        );
        let target = create_sit_export(
            &dir,
            "target",
            r#"{"rule_key":"godre:S1","component_path":"src/main.go","message":"Fix this","range":{"start_line":10,"end_line":10,"start_line_offset":2,"end_line_offset":7}}"#,
        );
        let cli = make_path_cli(base, target, Format::Json);

        let result = run(&cli).unwrap();

        assert_eq!(result.exit_code, 0);
        assert_eq!(result.reports.len(), 1);
        let v: Value = serde_json::from_str(&result.reports[0].content).unwrap();
        assert_eq!(v["summary"]["base_count"], 1);
        assert_eq!(v["summary"]["target_count"], 1);
        assert_eq!(v["summary"]["new"], 0);
        assert_eq!(v["summary"]["removed"], 0);
        assert_eq!(v["summary"]["unchanged"], 1);
        assert_eq!(v["new_issues"].as_array().unwrap().len(), 0);
        assert_eq!(v["removed_issues"].as_array().unwrap().len(), 0);
        assert_eq!(v["changed_issues"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_cli_rule_filter_accepts_repeated_flags() {
        let cli = Cli::try_parse_from([
            "diffsit",
            "base",
            "target",
            "--rule-filter",
            "go:S1",
            "--rule-filter",
            "go:S3",
        ])
        .unwrap();
        assert_eq!(
            cli.rule_filter,
            vec!["go:S1".to_string(), "go:S3".to_string()]
        );
    }

    #[test]
    fn test_cli_rule_filter_accepts_comma_separated_values() {
        let cli =
            Cli::try_parse_from(["diffsit", "base", "target", "--rule-filter", "go:S1,go:S3"])
                .unwrap();
        assert_eq!(
            cli.rule_filter,
            vec!["go:S1".to_string(), "go:S3".to_string()]
        );
    }

    #[test]
    fn test_cli_diff_mode_defaults_to_explain() {
        let cli = Cli::try_parse_from(["diffsit", "base", "target"]).unwrap();
        assert!(matches!(cli.diff_mode, DiffMode::Explain));
        assert_eq!(selected_formats(&cli).unwrap(), vec![Format::Text]);
    }

    #[test]
    fn test_cli_diff_mode_accepts_strict() {
        let cli =
            Cli::try_parse_from(["diffsit", "base", "target", "--diff-mode", "strict"]).unwrap();
        assert!(matches!(cli.diff_mode, DiffMode::Strict));
    }

    #[test]
    fn test_cli_formats_accepts_comma_separated_values() {
        let cli = Cli::try_parse_from([
            "diffsit",
            "base",
            "target",
            "--formats",
            "json,text,html",
            "--output",
            "reports",
        ])
        .unwrap();

        assert_eq!(cli.formats, vec![Format::Json, Format::Text, Format::Html]);
        assert_eq!(
            selected_formats(&cli).unwrap(),
            vec![Format::Json, Format::Text, Format::Html]
        );
    }

    #[test]
    fn test_cli_formats_accepts_repeated_flags() {
        let cli = Cli::try_parse_from([
            "diffsit",
            "base",
            "target",
            "--formats",
            "json",
            "--formats",
            "html",
            "--output",
            "reports",
        ])
        .unwrap();

        assert_eq!(cli.formats, vec![Format::Json, Format::Html]);
        assert_eq!(
            selected_formats(&cli).unwrap(),
            vec![Format::Json, Format::Html]
        );
    }

    #[test]
    fn test_cli_formats_requires_output() {
        let cli =
            Cli::try_parse_from(["diffsit", "base", "target", "--formats", "json,text"]).unwrap();
        let err = selected_formats(&cli).unwrap_err().to_string();
        assert_eq!(err, "--output is required when --formats is used");
    }

    #[test]
    fn test_cli_rejects_format_and_formats_together() {
        let cli = Cli::try_parse_from([
            "diffsit",
            "base",
            "target",
            "--format",
            "json",
            "--formats",
            "text,html",
            "--output",
            "reports",
        ])
        .unwrap();

        let err = selected_formats(&cli).unwrap_err().to_string();
        assert_eq!(err, "Use either --format or --formats, not both");
    }

    #[test]
    fn test_emit_reports_writes_one_file_for_format_output() {
        let output_dir = tempfile::tempdir().unwrap();
        let mut cli = make_cli(false, false, None, &[], None, Format::Json);
        cli.output = Some(output_dir.path().to_path_buf());
        let result = RunResult {
            reports: vec![RenderedReport {
                format: Format::Json,
                content: "{\"summary\":{\"new\":0}}\n".to_string(),
            }],
            exit_code: 0,
        };

        emit_reports(&cli, &result).unwrap();

        assert_report_file(
            &output_dir.path().join("diffsit-report.json"),
            "{\"summary\":{\"new\":0}}\n",
        );
        assert!(!output_dir.path().join("diffsit-report.txt").exists());
        assert!(!output_dir.path().join("diffsit-report.html").exists());
    }

    #[test]
    fn test_emit_reports_writes_multiple_format_files() {
        let output_dir = tempfile::tempdir().unwrap();
        let mut cli = make_cli(false, false, None, &[], None, Format::Text);
        cli.format = None;
        cli.formats = vec![Format::Json, Format::Text, Format::Html];
        cli.output = Some(output_dir.path().to_path_buf());
        let result = RunResult {
            reports: vec![
                RenderedReport {
                    format: Format::Json,
                    content: "{\"summary\":{\"new\":1}}\n".to_string(),
                },
                RenderedReport {
                    format: Format::Text,
                    content: "=== DiffSIT Report ===\n".to_string(),
                },
                RenderedReport {
                    format: Format::Html,
                    content: "<!DOCTYPE html>\n".to_string(),
                },
            ],
            exit_code: 1,
        };

        emit_reports(&cli, &result).unwrap();

        assert_report_file(
            &output_dir.path().join("diffsit-report.json"),
            "{\"summary\":{\"new\":1}}\n",
        );
        assert_report_file(
            &output_dir.path().join("diffsit-report.txt"),
            "=== DiffSIT Report ===\n",
        );
        assert_report_file(
            &output_dir.path().join("diffsit-report.html"),
            "<!DOCTYPE html>\n",
        );
    }

    #[test]
    fn test_run_single_project_reports_renders_selected_formats_once() {
        let output_dir = tempfile::tempdir().unwrap();
        let base = make_run(vec![]);
        let target = make_run(vec![make_issue("go:S1", "a.go", "multi format issue")]);
        let mut cli = make_cli(false, false, None, &[], None, Format::Text);
        cli.format = None;
        cli.formats = vec![Format::Json, Format::Text];
        cli.output = Some(output_dir.path().to_path_buf());

        let result = run_single_project_reports(&cli, &base, &target).unwrap();

        assert_eq!(result.exit_code, 1);
        assert_eq!(result.reports.len(), 2);
        assert_eq!(result.reports[0].format, Format::Json);
        assert_eq!(result.reports[1].format, Format::Text);
        let json: serde_json::Value = serde_json::from_str(&result.reports[0].content).unwrap();
        assert_eq!(json["summary"]["new"], 1);
        assert_eq!(
            result.reports[1].content,
            "=== DiffSIT Report ===\n\nBase:   \"unknown\" @ unknown (unknown)\nTarget: \"unknown\" @ unknown (unknown)\n\n--- Summary ---\n  Base issues:           0\n  Target issues:         1\n  New:                  +1\n  Changed:               0\n  Message changes:       0\n  Secondary changes:       0\n  Removed:               0\n  Unchanged:             0\n\n--- New Issues (by file) ---\n\n  a.go (+1)\n    [go:S1] L1: multi format issue\n\n--- Removed Issues (by file) ---\n\n  (none)\n\n--- Changed Issues (by file) ---\n\n  (none)\n\n"
        );
    }
}
