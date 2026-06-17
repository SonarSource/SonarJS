/*
 * Copyright (C) SonarSource Sàrl
 * For more information, see https://sonarsource.com/legal/
 * mailto:info AT sonarsource DOT com
*/
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use serde::Deserialize;
use zip::ZipArchive;

use crate::models::{AnalysisRun, Flow, FlowLocation, Issue, Metadata, NamedProjectRun, Range};

pub enum InputKind {
    SingleProject(AnalysisRun),
    MultiProject(Vec<NamedProjectRun>),
}

pub fn read_input(path: &Path) -> Result<InputKind> {
    if path.is_dir() {
        let issues_path = path.join("issues.jsonl");
        if issues_path.exists() {
            let run = read_from_directory(path)
                .with_context(|| format!("Failed to read directory: {}", path.display()))?;
            Ok(InputKind::SingleProject(run))
        } else if path.join("snapshot.json").exists() && path.join("metadata.json").exists() {
            let run = read_snapshot_from_directory(path).with_context(|| {
                format!("Failed to read snapshot directory: {}", path.display())
            })?;
            Ok(InputKind::SingleProject(run))
        } else if has_sit_project_directories(path)? {
            let projects = read_multi_project_directory(path).with_context(|| {
                format!("Failed to read multi-project directory: {}", path.display())
            })?;
            Ok(InputKind::MultiProject(projects))
        } else {
            let projects = read_multi_project_snapshot_directory(path).with_context(|| {
                format!(
                    "Failed to read multi-project snapshot directory: {}",
                    path.display()
                )
            })?;
            Ok(InputKind::MultiProject(projects))
        }
    } else {
        let file = File::open(path).with_context(|| format!("Cannot open: {}", path.display()))?;
        let archive = ZipArchive::new(file)
            .with_context(|| format!("Failed to read zip: {}", path.display()))?;
        if zip_has_root_issues(&archive) {
            let run = read_from_zip(archive)
                .with_context(|| format!("Failed to read zip: {}", path.display()))?;
            Ok(InputKind::SingleProject(run))
        } else if zip_has_root_snapshot(&archive) {
            let run = read_snapshot_from_zip(archive)
                .with_context(|| format!("Failed to read snapshot zip: {}", path.display()))?;
            Ok(InputKind::SingleProject(run))
        } else {
            let projects = read_multi_project_from_zip(archive)
                .with_context(|| format!("Failed to read multi-project zip: {}", path.display()))?;
            Ok(InputKind::MultiProject(projects))
        }
    }
}

pub fn read_multi_project_directory(root: &Path) -> Result<Vec<NamedProjectRun>> {
    let mut entries = discover_sit_project_directories(root)?;

    if entries.is_empty() {
        bail!(
            "No project subdirectories with issues.jsonl found in: {}",
            root.display()
        );
    }

    entries.sort_by_key(|e| e.file_name());

    let mut projects = Vec::new();
    for entry in entries {
        let name = entry.file_name().to_string_lossy().into_owned();
        let run = read_from_directory(&entry.path()).with_context(|| {
            format!(
                "Failed to read project directory: {}",
                entry.path().display()
            )
        })?;
        projects.push(NamedProjectRun { name, run });
    }

    Ok(projects)
}

fn discover_sit_project_directories(root: &Path) -> Result<Vec<std::fs::DirEntry>> {
    let entries = std::fs::read_dir(root)
        .with_context(|| format!("Cannot read directory: {}", root.display()))?
        .collect::<std::io::Result<Vec<_>>>()
        .with_context(|| format!("Cannot read directory entry in: {}", root.display()))?
        .into_iter()
        .filter(|e| e.path().is_dir() && e.path().join("issues.jsonl").exists())
        .collect();
    Ok(entries)
}

fn has_sit_project_directories(root: &Path) -> Result<bool> {
    Ok(!discover_sit_project_directories(root)?.is_empty())
}

fn zip_has_root_issues(archive: &ZipArchive<File>) -> bool {
    archive.file_names().any(|name| name == "issues.jsonl")
}

fn zip_has_root_snapshot(archive: &ZipArchive<File>) -> bool {
    archive.file_names().any(|name| name == "snapshot.json")
        || archive.file_names().any(|name| name == "metadata.json")
}

/// Returns the sorted list of top-level project directory names that contain `issues.jsonl`.
/// Only single-level nesting is supported: `<project>/issues.jsonl`.
/// Entries like `a/b/issues.jsonl` are ignored.
fn discover_zip_projects(archive: &ZipArchive<File>) -> Vec<String> {
    let mut names = BTreeSet::new();
    for name in archive.file_names() {
        if let Some(prefix) = name.strip_suffix("/issues.jsonl") {
            if !prefix.is_empty() && !prefix.contains('/') {
                names.insert(prefix.to_string());
            }
        }
    }
    names.into_iter().collect()
}

fn read_from_zip(mut archive: ZipArchive<File>) -> Result<AnalysisRun> {
    let metadata = {
        match archive.by_name("metadata.json") {
            Ok(mut entry) => {
                let mut content = String::new();
                entry
                    .read_to_string(&mut content)
                    .context("Failed to read metadata.json")?;
                serde_json::from_str(&content).context("Failed to parse metadata.json")?
            }
            Err(_) => Metadata::default(),
        }
    };

    let issues = {
        let mut entry = archive
            .by_name("issues.jsonl")
            .context("issues.jsonl not found in zip")?;
        let mut content = String::new();
        entry
            .read_to_string(&mut content)
            .context("Failed to read issues.jsonl")?;
        parse_issues_jsonl(content.as_bytes())?
    };

    Ok(AnalysisRun { metadata, issues })
}

fn read_project_from_zip(
    archive: &mut ZipArchive<File>,
    project_name: &str,
) -> Result<AnalysisRun> {
    let metadata_path = format!("{}/metadata.json", project_name);
    let issues_path = format!("{}/issues.jsonl", project_name);

    let metadata = match archive.by_name(&metadata_path) {
        Ok(mut entry) => {
            let mut content = String::new();
            entry
                .read_to_string(&mut content)
                .with_context(|| format!("Failed to read {}", metadata_path))?;
            serde_json::from_str(&content)
                .with_context(|| format!("Failed to parse {}", metadata_path))?
        }
        Err(_) => Metadata::default(),
    };

    let issues = {
        let mut entry = archive
            .by_name(&issues_path)
            .with_context(|| format!("{} not found in zip", issues_path))?;
        let mut content = String::new();
        entry
            .read_to_string(&mut content)
            .with_context(|| format!("Failed to read {}", issues_path))?;
        parse_issues_jsonl(content.as_bytes())?
    };

    Ok(AnalysisRun { metadata, issues })
}

fn read_multi_project_from_zip(mut archive: ZipArchive<File>) -> Result<Vec<NamedProjectRun>> {
    let project_names = discover_zip_projects(&archive);

    if project_names.is_empty() {
        bail!("No issues.jsonl found at zip root or in any subdirectory, and no root snapshot.json/metadata.json snapshot was found");
    }

    let mut projects = Vec::new();
    for name in project_names {
        let run = read_project_from_zip(&mut archive, &name)
            .with_context(|| format!("Failed to read project '{}' from zip", name))?;
        projects.push(NamedProjectRun { name, run });
    }

    Ok(projects)
}

fn read_from_directory(path: &Path) -> Result<AnalysisRun> {
    let metadata_path = path.join("metadata.json");
    let metadata = if metadata_path.exists() {
        let content = std::fs::read_to_string(&metadata_path)
            .with_context(|| format!("Failed to read {}", metadata_path.display()))?;
        serde_json::from_str(&content).context("Failed to parse metadata.json")?
    } else {
        Metadata::default()
    };

    let issues_path = path.join("issues.jsonl");
    let content = std::fs::read_to_string(&issues_path)
        .with_context(|| format!("Failed to read {}", issues_path.display()))?;
    let issues = parse_issues_jsonl(content.as_bytes())?;

    Ok(AnalysisRun { metadata, issues })
}

fn read_snapshot_from_zip(mut archive: ZipArchive<File>) -> Result<AnalysisRun> {
    let snapshot: DiffValSnapshot = {
        let mut entry = archive
            .by_name("snapshot.json")
            .context("snapshot.json not found in snapshot zip")?;
        read_json_zip_entry(&mut entry, "snapshot.json")?
    };
    let metadata_file: DiffValMetadataFile = {
        let mut entry = archive
            .by_name("metadata.json")
            .context("metadata.json not found in snapshot zip")?;
        read_json_zip_entry(&mut entry, "metadata.json")?
    };

    snapshot_to_analysis_run(snapshot, metadata_file)
}

fn read_json_zip_entry<T: for<'de> Deserialize<'de>, R: Read>(
    entry: &mut R,
    name: &str,
) -> Result<T> {
    let mut content = String::new();
    entry
        .read_to_string(&mut content)
        .with_context(|| format!("Failed to read {}", name))?;
    serde_json::from_str(&content).with_context(|| format!("Failed to parse {}", name))
}

fn read_snapshot_from_directory(path: &Path) -> Result<AnalysisRun> {
    let snapshot_path = path.join("snapshot.json");
    let metadata_path = path.join("metadata.json");
    let snapshot: DiffValSnapshot = serde_json::from_str(
        &std::fs::read_to_string(&snapshot_path)
            .with_context(|| format!("Failed to read {}", snapshot_path.display()))?,
    )
    .context("Failed to parse snapshot.json")?;
    let metadata_file: DiffValMetadataFile = serde_json::from_str(
        &std::fs::read_to_string(&metadata_path)
            .with_context(|| format!("Failed to read {}", metadata_path.display()))?,
    )
    .context("Failed to parse metadata.json")?;

    snapshot_to_analysis_run(snapshot, metadata_file)
}

fn read_multi_project_snapshot_directory(root: &Path) -> Result<Vec<NamedProjectRun>> {
    let snapshot_archives = discover_snapshot_zip_archives(root)?;
    if snapshot_archives.is_empty() {
        bail!(
            "No project subdirectories with issues.jsonl or diff-val snapshot zip files found in: {}",
            root.display()
        );
    }

    let mut projects = Vec::new();
    let mut names = HashSet::new();
    for (path, archive) in snapshot_archives {
        let fallback_name = path
            .file_stem()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.display().to_string());
        let run = read_snapshot_from_zip(archive)
            .with_context(|| format!("Failed to read snapshot zip: {}", path.display()))?;
        let name = run
            .metadata
            .project_key
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(fallback_name);
        if !names.insert(name.clone()) {
            bail!("Duplicate project name '{}' in snapshot directory", name);
        }
        projects.push(NamedProjectRun { name, run });
    }
    projects.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(projects)
}

fn discover_snapshot_zip_archives(root: &Path) -> Result<Vec<(PathBuf, ZipArchive<File>)>> {
    let mut archives = Vec::new();
    let mut zip_paths: Vec<PathBuf> = std::fs::read_dir(root)
        .with_context(|| format!("Cannot read directory: {}", root.display()))?
        .collect::<std::io::Result<Vec<_>>>()
        .with_context(|| format!("Cannot read directory entry in: {}", root.display()))?
        .into_iter()
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && path
                    .extension()
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("zip"))
        })
        .collect();
    zip_paths.sort();

    for path in zip_paths {
        let file = File::open(&path).with_context(|| format!("Cannot open: {}", path.display()))?;
        let archive = ZipArchive::new(file)
            .with_context(|| format!("Failed to read zip: {}", path.display()))?;
        if archive.file_names().any(|name| name == "snapshot.json") {
            archives.push((path, archive));
        }
    }
    Ok(archives)
}

fn parse_issues_jsonl(content: &[u8]) -> Result<Vec<Issue>> {
    let reader = BufReader::new(content);
    let mut issues = Vec::new();

    for (line_num, line) in reader.lines().enumerate() {
        let line = line.with_context(|| format!("Failed to read line {}", line_num + 1))?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let issue: Issue = serde_json::from_str(trimmed)
            .with_context(|| format!("Failed to parse issue on line {}", line_num + 1))?;
        issues.push(issue);
    }

    Ok(issues)
}

#[derive(Debug, Deserialize)]
struct DiffValSnapshot {
    #[serde(rename = "$schemaVersion")]
    schema_version: Option<String>,
    #[serde(rename = "projectName")]
    project_name: Option<String>,
    metadata: Option<DiffValSnapshotMetadata>,
    #[serde(default)]
    components: Vec<DiffValComponent>,
}

#[derive(Debug, Deserialize)]
struct DiffValSnapshotMetadata {
    #[serde(rename = "lastCommitDate")]
    last_commit_date: Option<String>,
    #[serde(default)]
    data: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct DiffValMetadataFile {
    #[serde(rename = "$schemaVersion")]
    schema_version: Option<String>,
    #[serde(default)]
    rules: Vec<DiffValRule>,
}

#[derive(Debug, Deserialize)]
struct DiffValRule {
    key: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DiffValComponent {
    path: Option<String>,
    #[serde(default)]
    issues: Vec<DiffValIssue>,
}

#[derive(Debug, Deserialize)]
struct DiffValIssue {
    rule: String,
    message: String,
    location: Option<DiffValLocation>,
    #[serde(rename = "secondaryLocations", default)]
    secondary_locations: Vec<DiffValSecondaryLocation>,
}

#[derive(Debug, Deserialize)]
struct DiffValSecondaryLocation {
    path: Option<String>,
    message: Option<String>,
    location: Option<DiffValLocation>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DiffValLocation {
    Encoded(String),
    Object {
        #[serde(rename = "startLine")]
        start_line: Option<u32>,
        #[serde(rename = "startColumn")]
        start_column: Option<u32>,
        #[serde(rename = "endLine")]
        end_line: Option<u32>,
        #[serde(rename = "endColumn")]
        end_column: Option<u32>,
    },
}

fn snapshot_to_analysis_run(
    snapshot: DiffValSnapshot,
    metadata_file: DiffValMetadataFile,
) -> Result<AnalysisRun> {
    validate_snapshot_schema(snapshot.schema_version.as_deref(), "snapshot.json")?;
    validate_snapshot_schema(metadata_file.schema_version.as_deref(), "metadata.json")?;

    let metadata_data = snapshot
        .metadata
        .as_ref()
        .map(|metadata| &metadata.data)
        .cloned()
        .unwrap_or_default();
    let metadata = Metadata {
        project_key: snapshot.project_name.clone(),
        repo_url: metadata_data.get("projectRepo").cloned(),
        commit: metadata_data
            .get("projectCommitHash")
            .or_else(|| metadata_data.get("sourceCommitHash"))
            .cloned(),
        language: metadata_data.get("language").cloned(),
        rule_keys: metadata_file
            .rules
            .into_iter()
            .filter_map(|rule| rule.key)
            .collect(),
        analysis_timestamp: metadata_data.get("creationDate").cloned().or_else(|| {
            snapshot
                .metadata
                .and_then(|metadata| metadata.last_commit_date)
        }),
    };

    let mut issues = Vec::new();
    for component in snapshot.components {
        let component_path = normalize_snapshot_path(component.path.as_deref());
        for issue in component.issues {
            let range = issue.location.as_ref().and_then(location_to_range);
            let flows = secondary_locations_to_flows(issue.secondary_locations);
            issues.push(Issue {
                rule_key: issue.rule,
                component_path: component_path.clone(),
                message: issue.message,
                range,
                line: None,
                flows,
            });
        }
    }
    issues.sort_by(|a, b| {
        (
            a.component_path.as_deref().unwrap_or_default(),
            a.rule_key.as_str(),
            a.start_line().unwrap_or_default(),
            a.message.as_str(),
        )
            .cmp(&(
                b.component_path.as_deref().unwrap_or_default(),
                b.rule_key.as_str(),
                b.start_line().unwrap_or_default(),
                b.message.as_str(),
            ))
    });

    Ok(AnalysisRun { metadata, issues })
}

fn validate_snapshot_schema(schema_version: Option<&str>, file_name: &str) -> Result<()> {
    match schema_version {
        Some("1.0" | "1.1" | "1.2") => Ok(()),
        Some(version) => bail!(
            "Unsupported diff-val schema version '{}' in {}",
            version,
            file_name
        ),
        None => bail!("Missing $schemaVersion in {}", file_name),
    }
}

fn secondary_locations_to_flows(locations: Vec<DiffValSecondaryLocation>) -> Vec<Flow> {
    let mut flow_locations: Vec<FlowLocation> = locations
        .into_iter()
        .map(|location| FlowLocation {
            component_path: normalize_snapshot_path(location.path.as_deref()),
            range: location.location.as_ref().and_then(location_to_range),
            message: location.message,
        })
        .collect();
    flow_locations.sort_by(|a, b| {
        serde_json::to_string(a)
            .unwrap_or_default()
            .cmp(&serde_json::to_string(b).unwrap_or_default())
    });

    flow_locations
        .into_iter()
        .map(|location| Flow {
            flow_type: Some("UNDEFINED".to_string()),
            description: None,
            locations: vec![location],
        })
        .collect()
}

fn location_to_range(location: &DiffValLocation) -> Option<Range> {
    let (start_line, start_column, end_line, end_column) = location.coordinates()?;
    if start_line == 0 && start_column == 0 && end_line == 0 && end_column == 0 {
        return None;
    }

    Some(Range {
        start_line,
        end_line,
        start_line_offset: start_column,
        end_line_offset: end_column,
    })
}

impl DiffValLocation {
    fn coordinates(&self) -> Option<(u32, u32, u32, u32)> {
        match self {
            DiffValLocation::Encoded(encoded) => {
                let parts = encoded
                    .split(',')
                    .map(str::parse::<u32>)
                    .collect::<std::result::Result<Vec<_>, _>>()
                    .ok()?;
                match parts.as_slice() {
                    [start_line] => Some((*start_line, 0, *start_line, 0)),
                    [start_line, start_column] => {
                        Some((*start_line, *start_column, *start_line, 0))
                    }
                    [start_line, start_column, end_line] => {
                        Some((*start_line, *start_column, *end_line, 0))
                    }
                    [start_line, start_column, end_line, end_column] => {
                        Some((*start_line, *start_column, *end_line, *end_column))
                    }
                    _ => None,
                }
            }
            DiffValLocation::Object {
                start_line,
                start_column,
                end_line,
                end_column,
            } => {
                let start = (*start_line)?;
                Some((
                    start,
                    start_column.unwrap_or(0),
                    end_line.unwrap_or(start),
                    end_column.unwrap_or(0),
                ))
            }
        }
    }
}

fn normalize_snapshot_path(path: Option<&str>) -> Option<String> {
    let mut path = path?.trim().replace('\\', "/");
    if path.is_empty() {
        return None;
    }

    if path.contains(':') {
        let split_index = if path.contains('/') {
            path[..path.find('/').expect("path contains slash")]
                .rfind(':')
                .map(|index| index + 1)
        } else {
            path.rfind(':').map(|index| index + 1)
        };
        if let Some(index) = split_index {
            path = path[index..].to_string();
        }
    }

    Some(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_zip(dir: &TempDir, name: &str, entries: &[(&str, &str)]) -> PathBuf {
        let zip_path = dir.path().join(name);
        let file = File::create(&zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default();
        for (entry_name, content) in entries {
            zip.start_file(*entry_name, options).unwrap();
            zip.write_all(content.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        zip_path
    }

    fn write_temp_file(dir: &TempDir, name: &str, content: &str) {
        let path = dir.path().join(name);
        let mut file = std::fs::File::create(path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
    }

    fn write_temp_file_in(dir: &Path, name: &str, content: &str) {
        let path = dir.join(name);
        let mut file = std::fs::File::create(path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
    }

    fn create_snapshot_zip(
        dir: &TempDir,
        name: &str,
        project_name: &str,
        component_path: &str,
        rule_key: &str,
        location: &str,
    ) -> PathBuf {
        let snapshot = format!(
            r#"{{
  "$schemaVersion":"1.2",
  "projectName":"{project_name}",
  "metadata":{{
    "lastCommitDate":"2026-01-01T00:00:00Z",
    "data":{{
      "projectRepo":"https://github.com/SonarSource/example",
      "projectCommitHash":"abc1234",
      "creationDate":"2026-01-02 03:04:05"
    }}
  }},
  "components":[
    {{
      "path":"{component_path}",
      "issues":[
        {{
          "rule":"{rule_key}",
          "key":null,
          "status":"OPEN",
          "message":"Fix this",
          "location":"{location}",
          "secondaryLocations":[
            {{"path":"src/helper.go","message":"helper","location":"20,1,20,6"}}
          ]
        }}
      ]
    }}
  ]
}}"#
        );
        let metadata = r#"{"$schemaVersion":"1.2","plugins":[],"rules":[{"key":"godre:S1","title":"Rule 1"}]}"#;
        create_zip(
            dir,
            name,
            &[("snapshot.json", &snapshot), ("metadata.json", metadata)],
        )
    }

    #[test]
    fn test_read_from_directory() {
        let dir = TempDir::new().unwrap();
        write_temp_file(
            &dir,
            "metadata.json",
            r#"{"project_key":"my-proj","commit":"abc1234","analysis_timestamp":"2026-01-01T00:00:00Z"}"#,
        );
        write_temp_file(
            &dir,
            "issues.jsonl",
            r#"{"rule_key":"godre:S1","component_path":"src/main.go","message":"Fix this","range":{"start_line":10,"end_line":10,"start_line_offset":0,"end_line_offset":5}}
{"rule_key":"godre:S2","component_path":"src/other.go","message":"Other issue","range":{"start_line":20,"end_line":21,"start_line_offset":2,"end_line_offset":4}}
"#,
        );

        let run = match read_input(dir.path()).unwrap() {
            InputKind::SingleProject(r) => r,
            _ => panic!("expected single project"),
        };
        assert_eq!(run.metadata.project_key.as_deref(), Some("my-proj"));
        assert_eq!(run.metadata.commit.as_deref(), Some("abc1234"));
        assert_eq!(run.issues.len(), 2);
        assert_eq!(run.issues[0].rule_key, "godre:S1");
        assert_eq!(run.issues[0].component_path.as_deref(), Some("src/main.go"));
        assert_eq!(run.issues[1].rule_key, "godre:S2");
    }

    #[test]
    fn test_read_directory_without_metadata() {
        let dir = TempDir::new().unwrap();
        write_temp_file(&dir, "issues.jsonl", "");

        let run = match read_input(dir.path()).unwrap() {
            InputKind::SingleProject(r) => r,
            _ => panic!("expected single project"),
        };
        assert!(run.metadata.project_key.is_none());
        assert_eq!(run.issues.len(), 0);
    }

    #[test]
    fn test_parse_issues_jsonl_skips_blank_lines() {
        let content =
            b"\n{\"rule_key\":\"r:S1\",\"component_path\":\"f.go\",\"message\":\"m\"}\n\n";
        let issues = parse_issues_jsonl(content).unwrap();
        assert_eq!(issues.len(), 1);
    }

    #[test]
    fn test_parse_issues_jsonl_accepts_project_level_issue() {
        let content =
            b"{\"rule_key\":\"r:S1\",\"component_path\":null,\"message\":\"project issue\"}\n";
        let issues = parse_issues_jsonl(content).unwrap();
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].component_path, None);
        assert_eq!(issues[0].rule_key, "r:S1");
        assert_eq!(issues[0].message, "project issue");
    }

    #[test]
    fn test_auto_detect_single_project() {
        let dir = TempDir::new().unwrap();
        write_temp_file(&dir, "issues.jsonl", "");

        match read_input(dir.path()).unwrap() {
            InputKind::SingleProject(_) => {}
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_auto_detect_multi_project() {
        let root = TempDir::new().unwrap();
        let proj_a = root.path().join("proj_a");
        let proj_b = root.path().join("proj_b");
        std::fs::create_dir_all(&proj_a).unwrap();
        std::fs::create_dir_all(&proj_b).unwrap();
        write_temp_file_in(&proj_a, "issues.jsonl", "");
        write_temp_file_in(&proj_b, "issues.jsonl", "");

        match read_input(root.path()).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 2);
                assert_eq!(projects[0].name, "proj_a");
                assert_eq!(projects[1].name, "proj_b");
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_read_multi_project_directory() {
        let root = TempDir::new().unwrap();
        let proj_a = root.path().join("act");
        let proj_b = root.path().join("gin");
        std::fs::create_dir_all(&proj_a).unwrap();
        std::fs::create_dir_all(&proj_b).unwrap();
        write_temp_file_in(
            &proj_a,
            "issues.jsonl",
            r#"{"rule_key":"godre:S1","component_path":"src/main.go","message":"msg"}"#,
        );
        write_temp_file_in(&proj_b, "issues.jsonl", "");

        let projects = read_multi_project_directory(root.path()).unwrap();
        assert_eq!(projects.len(), 2);
        assert_eq!(projects[0].name, "act");
        assert_eq!(projects[0].run.issues.len(), 1);
        assert_eq!(projects[1].name, "gin");
        assert_eq!(projects[1].run.issues.len(), 0);
    }

    #[test]
    fn test_multi_project_empty_root_fails() {
        let root = TempDir::new().unwrap();
        // Create a subdirectory without issues.jsonl
        let sub = root.path().join("nosit");
        std::fs::create_dir_all(&sub).unwrap();

        let result = read_multi_project_directory(root.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_read_single_project_zip() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "single.zip",
            &[
                (
                    "metadata.json",
                    r#"{"project_key":"my-proj","commit":"abc1234","analysis_timestamp":"2026-01-01T00:00:00Z"}"#,
                ),
                (
                    "issues.jsonl",
                    r#"{"rule_key":"godre:S1","component_path":"src/main.go","message":"Fix this","range":{"start_line":10,"end_line":10,"start_line_offset":0,"end_line_offset":5}}"#,
                ),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.metadata.project_key.as_deref(), Some("my-proj"));
                assert_eq!(run.metadata.commit.as_deref(), Some("abc1234"));
                assert_eq!(run.issues.len(), 1);
                assert_eq!(run.issues[0].rule_key, "godre:S1");
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_single_project_diffval_snapshot_zip() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_snapshot_zip(
            &dir,
            "snapshot.zip",
            "dre:proj",
            "src/main.go",
            "godre:S1",
            "10,2,10,7",
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.metadata.project_key.as_deref(), Some("dre:proj"));
                assert_eq!(
                    run.metadata.repo_url.as_deref(),
                    Some("https://github.com/SonarSource/example")
                );
                assert_eq!(run.metadata.commit.as_deref(), Some("abc1234"));
                assert_eq!(
                    run.metadata.analysis_timestamp.as_deref(),
                    Some("2026-01-02 03:04:05")
                );
                assert_eq!(run.metadata.rule_keys, vec!["godre:S1"]);
                assert_eq!(run.issues.len(), 1);
                assert_eq!(run.issues[0].rule_key, "godre:S1");
                assert_eq!(run.issues[0].component_path.as_deref(), Some("src/main.go"));
                assert_eq!(run.issues[0].message, "Fix this");
                assert_eq!(
                    run.issues[0].range,
                    Some(Range {
                        start_line: 10,
                        end_line: 10,
                        start_line_offset: 2,
                        end_line_offset: 7,
                    })
                );
                assert_eq!(
                    run.issues[0].flows,
                    vec![Flow {
                        flow_type: Some("UNDEFINED".to_string()),
                        description: None,
                        locations: vec![FlowLocation {
                            component_path: Some("src/helper.go".to_string()),
                            range: Some(Range {
                                start_line: 20,
                                end_line: 20,
                                start_line_offset: 1,
                                end_line_offset: 6,
                            }),
                            message: Some("helper".to_string()),
                        }],
                    }]
                );
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_diffval_snapshot_secondary_locations_match_sit_export_flow_shape() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "snapshot.zip",
            &[
                (
                    "snapshot.json",
                    r#"{
  "$schemaVersion":"1.2",
  "projectName":"dre:proj",
  "metadata":{"data":{}},
  "components":[{"path":"src/main.go","issues":[{"rule":"godre:S1","message":"Fix this","location":"10,2,10,7","secondaryLocations":[{"path":"src/b.go","message":"second","location":"30,3,30,8"},{"path":"src/a.go","message":"first","location":"20,1,20,6"}]}]}]
}"#,
                ),
                ("metadata.json", r#"{"$schemaVersion":"1.2","rules":[]}"#),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(
                    run.issues[0].flows,
                    vec![
                        Flow {
                            flow_type: Some("UNDEFINED".to_string()),
                            description: None,
                            locations: vec![FlowLocation {
                                component_path: Some("src/a.go".to_string()),
                                range: Some(Range {
                                    start_line: 20,
                                    end_line: 20,
                                    start_line_offset: 1,
                                    end_line_offset: 6,
                                }),
                                message: Some("first".to_string()),
                            }],
                        },
                        Flow {
                            flow_type: Some("UNDEFINED".to_string()),
                            description: None,
                            locations: vec![FlowLocation {
                                component_path: Some("src/b.go".to_string()),
                                range: Some(Range {
                                    start_line: 30,
                                    end_line: 30,
                                    start_line_offset: 3,
                                    end_line_offset: 8,
                                }),
                                message: Some("second".to_string()),
                            }],
                        },
                    ]
                );
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_diffval_snapshot_accepts_object_location() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "snapshot.zip",
            &[
                (
                    "snapshot.json",
                    r#"{
  "$schemaVersion":"1.1",
  "projectName":"dre:proj",
  "metadata":{"data":{}},
  "components":[{"path":"project:src/main.go","issues":[{"rule":"godre:S1","message":"Fix this","location":{"startLine":3,"startColumn":4,"endLine":5,"endColumn":6},"secondaryLocations":[]}]}]
}"#,
                ),
                ("metadata.json", r#"{"$schemaVersion":"1.1","rules":[]}"#),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(run.issues[0].component_path.as_deref(), Some("src/main.go"));
                assert_eq!(
                    run.issues[0].range,
                    Some(Range {
                        start_line: 3,
                        end_line: 5,
                        start_line_offset: 4,
                        end_line_offset: 6,
                    })
                );
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_diffval_snapshot_preserves_object_location_start_line_without_columns() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "snapshot.zip",
            &[
                (
                    "snapshot.json",
                    r#"{
  "$schemaVersion":"1.1",
  "projectName":"dre:proj",
  "metadata":{"data":{}},
  "components":[{"path":"src/main.go","issues":[{"rule":"godre:S1","message":"Fix this","location":{"startLine":3},"secondaryLocations":[]}]}]
}"#,
                ),
                ("metadata.json", r#"{"$schemaVersion":"1.1","rules":[]}"#),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(
                    run.issues[0].range,
                    Some(Range {
                        start_line: 3,
                        end_line: 3,
                        start_line_offset: 0,
                        end_line_offset: 0,
                    })
                );
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_diffval_snapshot_preserves_short_encoded_location_start_line() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_snapshot_zip(
            &dir,
            "snapshot.zip",
            "dre:proj",
            "src/main.go",
            "godre:S1",
            "10",
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(
                    run.issues[0].range,
                    Some(Range {
                        start_line: 10,
                        end_line: 10,
                        start_line_offset: 0,
                        end_line_offset: 0,
                    })
                );
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_diffval_snapshot_zero_location_becomes_file_level_issue() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_snapshot_zip(
            &dir,
            "snapshot.zip",
            "dre:proj",
            "src/main.go",
            "godre:S1",
            "0,0,0,0",
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(run.issues[0].range, None);
                assert_eq!(run.issues[0].line, None);
            }
            InputKind::MultiProject(_) => panic!("expected single project"),
        }
    }

    #[test]
    fn test_read_multi_project_snapshot_directory() {
        let root = TempDir::new().unwrap();
        create_snapshot_zip(
            &root,
            "snapshot_beta_2026-01-01.zip",
            "dre:beta",
            "beta.go",
            "godre:S1",
            "1,0,1,1",
        );
        create_snapshot_zip(
            &root,
            "snapshot_alpha_2026-01-01.zip",
            "dre:alpha",
            "alpha.go",
            "godre:S1",
            "1,0,1,1",
        );

        match read_input(root.path()).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 2);
                assert_eq!(projects[0].name, "dre:alpha");
                assert_eq!(
                    projects[0].run.issues[0].component_path.as_deref(),
                    Some("alpha.go")
                );
                assert_eq!(projects[1].name, "dre:beta");
                assert_eq!(
                    projects[1].run.issues[0].component_path.as_deref(),
                    Some("beta.go")
                );
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_read_multi_project_snapshot_directory_skips_metadata_only_zip() {
        let root = TempDir::new().unwrap();
        create_zip(
            &root,
            "metadata_only.zip",
            &[("metadata.json", r#"{"$schemaVersion":"1.2","rules":[]}"#)],
        );
        create_snapshot_zip(
            &root,
            "snapshot_alpha_2026-01-01.zip",
            "dre:alpha",
            "alpha.go",
            "godre:S1",
            "1,0,1,1",
        );

        match read_input(root.path()).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 1);
                assert_eq!(projects[0].name, "dre:alpha");
                assert_eq!(
                    projects[0].run.issues[0].component_path.as_deref(),
                    Some("alpha.go")
                );
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_diffval_snapshot_zip_without_metadata_fails() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "snapshot.zip",
            &[(
                "snapshot.json",
                r#"{"$schemaVersion":"1.2","projectName":"dre:proj","components":[]}"#,
            )],
        );

        let result = read_input(&zip_path);
        let err = result.err().expect("expected an error");
        let chain: Vec<String> = err.chain().map(ToString::to_string).collect();
        assert_eq!(
            chain,
            vec![
                format!("Failed to read snapshot zip: {}", zip_path.display()),
                "metadata.json not found in snapshot zip".to_string(),
                "specified file not found in archive".to_string(),
            ]
        );
    }

    #[test]
    fn test_diffval_snapshot_zip_without_snapshot_fails() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "snapshot.zip",
            &[("metadata.json", r#"{"$schemaVersion":"1.2","rules":[]}"#)],
        );

        let result = read_input(&zip_path);
        let err = result.err().expect("expected an error");
        let chain: Vec<String> = err.chain().map(ToString::to_string).collect();
        assert_eq!(
            chain,
            vec![
                format!("Failed to read snapshot zip: {}", zip_path.display()),
                "snapshot.json not found in snapshot zip".to_string(),
                "specified file not found in archive".to_string(),
            ]
        );
    }

    #[test]
    fn test_read_multi_project_zip() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "multi.zip",
            &[
                ("proj_a/metadata.json", r#"{"project_key":"proj-a"}"#),
                (
                    "proj_a/issues.jsonl",
                    r#"{"rule_key":"godre:S1","component_path":"a.go","message":"msg a"}"#,
                ),
                (
                    "proj_b/issues.jsonl",
                    r#"{"rule_key":"godre:S2","component_path":"b.go","message":"msg b"}"#,
                ),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 2);
                assert_eq!(projects[0].name, "proj_a");
                assert_eq!(
                    projects[0].run.metadata.project_key.as_deref(),
                    Some("proj-a")
                );
                assert_eq!(projects[0].run.issues.len(), 1);
                assert_eq!(projects[0].run.issues[0].rule_key, "godre:S1");
                assert_eq!(projects[1].name, "proj_b");
                assert_eq!(projects[1].run.metadata.project_key, None);
                assert_eq!(projects[1].run.issues.len(), 1);
                assert_eq!(projects[1].run.issues[0].rule_key, "godre:S2");
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_multi_project_zip_sorted_alphabetically() {
        let dir = TempDir::new().unwrap();
        // Insert in reverse order to verify sorting
        let zip_path = create_zip(
            &dir,
            "sorted.zip",
            &[
                ("zebra/issues.jsonl", ""),
                ("alpha/issues.jsonl", ""),
                ("mango/issues.jsonl", ""),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 3);
                assert_eq!(projects[0].name, "alpha");
                assert_eq!(projects[1].name, "mango");
                assert_eq!(projects[2].name, "zebra");
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_zip_no_issues_anywhere_fails() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(&dir, "empty.zip", &[("some_dir/readme.txt", "hello")]);

        let result = read_input(&zip_path);
        let err_msg = format!("{:#}", result.err().expect("expected an error"));
        assert!(
            err_msg.contains("No issues.jsonl found"),
            "unexpected error: {}",
            err_msg
        );
    }

    #[test]
    fn test_zip_root_issues_wins_over_subdirs() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "ambiguous.zip",
            &[
                (
                    "issues.jsonl",
                    r#"{"rule_key":"godre:S1","component_path":"root.go","message":"root"}"#,
                ),
                (
                    "proj_a/issues.jsonl",
                    r#"{"rule_key":"godre:S2","component_path":"sub.go","message":"sub"}"#,
                ),
            ],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::SingleProject(run) => {
                assert_eq!(run.issues.len(), 1);
                assert_eq!(run.issues[0].rule_key, "godre:S1");
            }
            InputKind::MultiProject(_) => {
                panic!("expected single project (root issues.jsonl wins)")
            }
        }
    }

    #[test]
    fn test_zip_nested_deeper_than_one_level_ignored() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "deep.zip",
            &[(
                "a/b/issues.jsonl",
                r#"{"rule_key":"godre:S1","component_path":"f.go","message":"msg"}"#,
            )],
        );

        let result = read_input(&zip_path);
        let err_msg = format!("{:#}", result.err().expect("expected an error"));
        assert!(
            err_msg.contains("No issues.jsonl found"),
            "unexpected error: {}",
            err_msg
        );
    }

    #[test]
    fn test_multi_project_zip_empty_issues() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "empty_issues.zip",
            &[("proj_a/issues.jsonl", ""), ("proj_b/issues.jsonl", "")],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 2);
                assert_eq!(projects[0].run.issues.len(), 0);
                assert_eq!(projects[1].run.issues.len(), 0);
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }

    #[test]
    fn test_multi_project_zip_single_project() {
        let dir = TempDir::new().unwrap();
        let zip_path = create_zip(
            &dir,
            "one_proj.zip",
            &[(
                "only_project/issues.jsonl",
                r#"{"rule_key":"godre:S1","component_path":"f.go","message":"msg"}"#,
            )],
        );

        match read_input(&zip_path).unwrap() {
            InputKind::MultiProject(projects) => {
                assert_eq!(projects.len(), 1);
                assert_eq!(projects[0].name, "only_project");
                assert_eq!(projects[0].run.issues.len(), 1);
            }
            InputKind::SingleProject(_) => panic!("expected multi project"),
        }
    }
}
