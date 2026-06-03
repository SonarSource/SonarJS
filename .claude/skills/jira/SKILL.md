# ACLI Jira Guide

Use this skill when viewing, editing, or commenting on Jira tickets. Covers `acli` commands for viewing issues, searching with JQL, creating/updating comments (including ADF rich text), and editing work items.

This document covers how to use `acli` (Atlassian CLI) to interact with Jira Cloud.

> **Version Note:** This guide was written based on `acli version 1.3.9-stable`. Some limitations documented here (e.g., `--body-adf` not available on `comment create`, `--description-file` not supporting ADF) may be resolved in newer versions. Check `acli --version` and consult the [official documentation](https://developer.atlassian.com/cloud/acli/) for updates.

## Getting Help

```bash
# Top-level help
acli --help

# Jira commands
acli jira --help

# Specific command help
acli jira workitem --help
acli jira workitem comment --help
```

## Viewing Work Items

### View a Single Issue

```bash
# View issue details
acli jira workitem view JS-1140

# Output as JSON (useful for scripting)
acli jira workitem view JS-1140 --json
```

The output includes:

- Key, Type, Summary, Status
- Description (full text)
- Other fields like assignee, labels, etc.

### Search for Issues

```bash
# Search using JQL
acli jira workitem search --jql "project = JS AND status = 'To Do'"

# Search with JSON output
acli jira workitem search --jql "project = JS AND type = Epic" --json
```

## Comments

### List Comments

```bash
# List all comments on an issue
acli jira workitem comment list --key JS-1140

# List with JSON output (includes comment IDs needed for updates)
acli jira workitem comment list --key JS-1140 --json
```

JSON output structure:

```json
{
  "comments": [
    {
      "author": "Name",
      "body": "Comment text...",
      "id": "864721",
      "visibility": "public"
    }
  ],
  "total": 1
}
```

### Create Comments

```bash
# Plain text comment
acli jira workitem comment create --key "JS-1140" --body "Plain text comment"

# Comment from file (plain text only)
acli jira workitem comment create --key "JS-1140" --body-file "/path/to/comment.txt"
```

**Note:** `comment create` does NOT support `--body-adf`. See "Formatted Comments with ADF" below.

### Update Comments

```bash
# Update comment text
acli jira workitem comment update --key "JS-1140" --id "864721" --body "Updated text"

# Update with ADF formatting (rich text)
acli jira workitem comment update --key "JS-1140" --id "864721" --body-adf "/path/to/comment.json"
```

### Delete Comments

```bash
acli jira workitem comment delete --key "JS-1140" --id "864721"
```

## Editing Work Items

### Edit Basic Fields

```bash
# Edit summary
acli jira workitem edit --key "JS-1140" --summary "New Title" --yes

# Edit description (plain text)
acli jira workitem edit --key "JS-1140" --description "New description" --yes

# Edit description from file (plain text only)
acli jira workitem edit --key "JS-1140" --description-file "/path/to/description.txt" --yes

# Edit assignee
acli jira workitem edit --key "JS-1140" --assignee "user@example.com" --yes

# Edit labels
acli jira workitem edit --key "JS-1140" --labels "label1,label2" --yes
```

### Edit with ADF Description

```bash
# Use --from-json for ADF-formatted descriptions
acli jira workitem edit --from-json "/path/to/workitem.json" --yes
```

**Warning:** `--description-file` does NOT support ADF despite what the help says. Use `--from-json` instead.

### Generate Edit Template

```bash
# See the expected JSON structure
acli jira workitem edit --generate-json
```

Output:

```json
{
  "assignee": "Assignee email or ID",
  "description": {
    "content": [...],
    "type": "doc",
    "version": 1
  },
  "issues": ["KEY-1", "KEY-2"],
  "labelsToAdd": ["feature"],
  "labelsToRemove": ["bug"],
  "summary": "Summary/Title",
  "type": "Task"
}
```

---

## Atlassian Document Format (ADF)

Jira Cloud uses **Atlassian Document Format (ADF)** for rich text content. ADF is a JSON-based format - NOT Markdown.

### When to Use ADF

| Operation                          | Plain Text | ADF Support            |
| ---------------------------------- | ---------- | ---------------------- |
| `comment create --body`            | ✅         | ❌                     |
| `comment update --body`            | ✅         | ✅ via `--body-adf`    |
| `workitem edit --description`      | ✅         | ❌                     |
| `workitem edit --description-file` | ✅         | ❌ (despite help text) |
| `workitem edit --from-json`        | N/A        | ✅                     |

### Basic ADF Structure

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    // Array of block-level nodes
  ]
}
```

### Supported Block Nodes

#### Paragraph

```json
{
  "type": "paragraph",
  "content": [{ "type": "text", "text": "Paragraph text" }]
}
```

#### Headings (levels 1-6)

```json
{
  "type": "heading",
  "attrs": { "level": 2 },
  "content": [{ "type": "text", "text": "Heading Text" }]
}
```

#### Bullet List

```json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Item text" }]
        }
      ]
    }
  ]
}
```

#### Ordered List

```json
{
  "type": "orderedList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Item text" }]
        }
      ]
    }
  ]
}
```

#### Code Block

```json
{
  "type": "codeBlock",
  "attrs": { "language": "json" },
  "content": [{ "type": "text", "text": "code here" }]
}
```

#### Table

```json
{
  "type": "table",
  "attrs": { "isNumberColumnEnabled": false, "layout": "default" },
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Header" }] }]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Cell" }] }]
        }
      ]
    }
  ]
}
```

#### Horizontal Rule

```json
{
  "type": "rule"
}
```

### Text Formatting (Marks)

#### Bold

```json
{ "type": "text", "text": "Bold text", "marks": [{ "type": "strong" }] }
```

#### Italic

```json
{ "type": "text", "text": "Italic text", "marks": [{ "type": "em" }] }
```

#### Code (inline)

```json
{ "type": "text", "text": "inline code", "marks": [{ "type": "code" }] }
```

#### Link

```json
{
  "type": "text",
  "text": "Link text",
  "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }]
}
```

#### Combined Marks

```json
{
  "type": "text",
  "text": "Bold link",
  "marks": [{ "type": "strong" }, { "type": "link", "attrs": { "href": "https://example.com" } }]
}
```

---

## Workflow Examples

### Adding a Formatted Comment (ADF)

Since `comment create` doesn't support ADF, use this two-step process:

```bash
# 1. Create the ADF JSON file
cat > /tmp/comment.json << 'EOF'
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Investigation Results" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Details here..." }]
    }
  ]
}
EOF

# 2. Create placeholder and get ID
acli jira workitem comment create --key "JS-1140" --body "placeholder"
acli jira workitem comment list --key JS-1140 --json

# 3. Update with ADF (use the ID from step 2)
acli jira workitem comment update --key "JS-1140" --id "COMMENT_ID" --body-adf "/tmp/comment.json"
```

### Updating an Epic Description with ADF

```bash
# 1. Create the workitem JSON file
cat > /tmp/workitem.json << 'EOF'
{
  "issues": ["JS-1140"],
  "description": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Overview" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Description content..." }]
      }
    ]
  }
}
EOF

# 2. Update the workitem
acli jira workitem edit --from-json "/tmp/workitem.json" --yes
```

### Quick View and Comment Workflow

```bash
# View issue
acli jira workitem view JS-1140

# Add a quick comment
acli jira workitem comment create --key "JS-1140" --body "Looked into this - see my analysis below."

# List existing comments
acli jira workitem comment list --key JS-1140
```

---

## Common Pitfalls

1. **`--description-file` doesn't support ADF** - Use `--from-json` instead for ADF descriptions

2. **`comment create` doesn't have `--body-adf`** - Create a placeholder first, then use `comment update --body-adf`

3. **Tables may cause INVALID_INPUT errors** - If ADF fails, try removing tables first to isolate the issue

4. **JSON validation** - Always validate JSON before sending:

   ```bash
   cat file.json | python -m json.tool > /dev/null && echo "Valid JSON"
   ```

5. **The `--yes` flag** - Required for non-interactive edits to skip confirmation prompts

6. **Comment IDs** - You need the comment ID to update/delete. Get it from `comment list --json`

---

## Quick Reference

| Task                 | Command                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| View issue           | `acli jira workitem view KEY`                                              |
| View issue (JSON)    | `acli jira workitem view KEY --json`                                       |
| Search issues        | `acli jira workitem search --jql "..."`                                    |
| List comments        | `acli jira workitem comment list --key KEY`                                |
| List comments (JSON) | `acli jira workitem comment list --key KEY --json`                         |
| Add comment          | `acli jira workitem comment create --key KEY --body "text"`                |
| Update comment       | `acli jira workitem comment update --key KEY --id ID --body "text"`        |
| Update comment (ADF) | `acli jira workitem comment update --key KEY --id ID --body-adf file.json` |
| Edit description     | `acli jira workitem edit --key KEY --description "text" --yes`             |
| Edit with ADF        | `acli jira workitem edit --from-json file.json --yes`                      |
| Generate template    | `acli jira workitem edit --generate-json`                                  |
