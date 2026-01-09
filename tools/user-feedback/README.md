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

**Detailed instructions:** [Access SonarCloud User Feedback](https://xtranet-sonarsource.atlassian.net/wiki/spaces/PM/pages/2867724422/Access+SonarCloud+User+Feedback)

**Quick steps:**

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

Three reports are generated in `reports/`:

| File                                    | Description                                | Git     |
| --------------------------------------- | ------------------------------------------ | ------- |
| `feedback-stats-YYYYMMDD.md`            | Statistics only (counts, no user comments) | Tracked |
| `feedback-report-YYYYMMDD.md`           | Full detailed report with all feedback     | Ignored |
| `feedback-report-condensed-YYYYMMDD.md` | Summary with top rules and sample comments | Ignored |

Reports containing user comments are gitignored for privacy. Only the stats report (counts only) is committed.

## Directory Structure

```
tools/user-feedback/
├── analyze-feedback.sh    # Main script
├── README.md              # This file
├── .gitignore             # Ignores data/ and reports with user comments
├── data/                  # Place downloaded CSV files here (gitignored)
└── reports/               # Generated reports (only stats tracked)
```

## S3 Bucket Info

| Property     | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Bucket       | `488059965635-issuefeedback-reports-eu-central-1-prod-rep` |
| Region       | `eu-central-1`                                             |
| Reports      | `/reports/*-IssueFeedbackLast7Days.csv`                    |
| Code samples | `/files/{fileUuid}/{fileName}`                             |

## Creating Jira Tickets

After generating reports locally, you can create a Jira ticket with the stats:

```bash
acli jira workitem create \
  --project "JS" \
  --type "Task" \
  --summary "User Feedback Analysis: High FP Rate Rules" \
  --description-file "reports/feedback-stats-YYYYMMDD.md"
```

For detailed feedback with user comments, use the local condensed report (not committed to git).
