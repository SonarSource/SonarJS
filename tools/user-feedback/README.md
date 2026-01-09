# User Feedback Analysis Tool

Analyzes user feedback data from SonarCloud for JavaScript/TypeScript rules.

## Quick Start

```bash
./analyze-feedback.sh
```

The script will guide you through downloading and analyzing the feedback data.

## Workflow

### 1. Download CSV Files (Manual)

The S3 bucket requires AWS Console access (CLI is restricted by Service Control Policy).

1. Go to [JumpCloud](https://console.jumpcloud.com/)
2. Select AWS → `sonarcloud-prod` account (488059965635)
3. Open the [S3 bucket in AWS Console](https://eu-central-1.console.aws.amazon.com/s3/buckets/488059965635-issuefeedback-reports-eu-central-1-prod-rep?region=eu-central-1&prefix=reports/)
4. Download the last 4 weekly CSV files (`*-IssueFeedbackLast7Days.csv`)
5. Place them in `tools/user-feedback/data/`

### 2. Run Analysis

```bash
./analyze-feedback.sh
```

## Output

Reports are generated in `reports/`:

| File                                    | Description                                |
| --------------------------------------- | ------------------------------------------ |
| `feedback-report-YYYYMMDD.md`           | Full detailed report with all feedback     |
| `feedback-report-condensed-YYYYMMDD.md` | Summary with top rules and sample comments |

## Directory Structure

```
tools/user-feedback/
├── analyze-feedback.sh    # Main script
├── README.md              # This file
├── .gitignore             # Ignores data/ and reports/
├── data/                  # Place downloaded CSV files here
└── reports/               # Generated reports
```

## S3 Bucket Info

| Property     | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Bucket       | `488059965635-issuefeedback-reports-eu-central-1-prod-rep` |
| Region       | `eu-central-1`                                             |
| Reports      | `/reports/*-IssueFeedbackLast7Days.csv`                    |
| Code samples | `/files/{fileUuid}/{fileName}`                             |

## Creating Jira Tickets

After generating reports, create a Jira ticket:

```bash
acli jira workitem create \
  --project "JS" \
  --type "Task" \
  --summary "User Feedback Analysis: High FP Rate Rules" \
  --description-file "reports/feedback-report-condensed-YYYYMMDD.md"
```

Or use the `--from-json` option with ADF format for rich formatting (see `jira-edit.json` example in `user-feedback/`).
