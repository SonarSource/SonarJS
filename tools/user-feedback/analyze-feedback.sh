#!/usr/bin/env bash
#
# User Feedback Analysis Tool for SonarJS
#
# This script analyzes issue feedback CSV files and generates reports
# for JavaScript/TypeScript rules.
#
# Usage:
#   ./analyze-feedback.sh              # Analyze CSV files in data/
#   ./analyze-feedback.sh --help       # Show help
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
REPORTS_DIR="${SCRIPT_DIR}/reports"

S3_BUCKET="488059965635-issuefeedback-reports-eu-central-1-prod-rep"
S3_CONSOLE_URL="https://eu-central-1.console.aws.amazon.com/s3/buckets/${S3_BUCKET}?region=eu-central-1&bucketType=general&prefix=reports/&showversions=false"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

show_help() {
    cat << 'EOF'
User Feedback Analysis Tool for SonarJS

USAGE:
    ./analyze-feedback.sh [OPTIONS]

OPTIONS:
    --help          Show this help message

WORKFLOW:
    1. Download CSV files manually from AWS Console (see below)
    2. Place CSV files in the data/ directory
    3. Run this script to generate analysis reports

DOWNLOADING CSV FILES:
    The S3 bucket requires AWS Console access (CLI is restricted).

    For detailed instructions, see:
    https://xtranet-sonarsource.atlassian.net/wiki/spaces/PM/pages/2867724422/Access+SonarCloud+User+Feedback

    Quick steps:
    1. Go to JumpCloud: https://console.jumpcloud.com/
    2. Select AWS → sonarcloud-prod account (488059965635)
    3. Open the S3 bucket in AWS Console:
       https://eu-central-1.console.aws.amazon.com/s3/buckets/488059965635-issuefeedback-reports-eu-central-1-prod-rep?region=eu-central-1&prefix=reports/

    4. Download the last 4 weekly CSV files (IssueFeedbackLast7Days.csv)
    5. Place them in: tools/user-feedback/data/

OUTPUT:
    - reports/feedback-report-YYYYMMDD.md           Full detailed report
    - reports/feedback-report-condensed-YYYYMMDD.md Summary report

EOF
}

show_download_instructions() {
    print_header "Download CSV Files"

    echo "The S3 bucket requires AWS Console access (CLI is restricted by SCP)."
    echo ""
    echo "For detailed instructions, see:"
    echo "  ${YELLOW}https://xtranet-sonarsource.atlassian.net/wiki/spaces/PM/pages/2867724422/Access+SonarCloud+User+Feedback${NC}"
    echo ""
    echo "Quick steps:"
    echo ""
    echo "  1. Go to JumpCloud: ${YELLOW}https://console.jumpcloud.com/${NC}"
    echo ""
    echo "  2. Select AWS → sonarcloud-prod account (488059965635)"
    echo ""
    echo "  3. Open S3 bucket in AWS Console:"
    echo "     ${YELLOW}${S3_CONSOLE_URL}${NC}"
    echo ""
    echo "  4. Download the last 4 weekly CSV files:"
    echo "     - Select each *-IssueFeedbackLast7Days.csv file"
    echo "     - Click 'Download'"
    echo ""
    echo "  5. Move downloaded files to:"
    echo "     ${YELLOW}${DATA_DIR}/${NC}"
    echo ""

    mkdir -p "$DATA_DIR"

    read -p "Press Enter after placing CSV files in data/ (or Ctrl+C to exit)..."
}

check_csv_files() {
    mkdir -p "$DATA_DIR"

    local csv_files=("$DATA_DIR"/*.csv)

    if [ ! -f "${csv_files[0]}" ]; then
        return 1
    fi

    return 0
}

analyze_feedback() {
    print_header "Analyzing Feedback Data"

    mkdir -p "$REPORTS_DIR"

    local csv_files=("$DATA_DIR"/*.csv)
    local csv_count=${#csv_files[@]}

    print_step "Found ${csv_count} CSV file(s)"
    for f in "${csv_files[@]}"; do
        echo "     - $(basename "$f")"
    done
    echo ""

    local report_file="${REPORTS_DIR}/feedback-report-$(date +%Y%m%d).md"
    local condensed_file="${REPORTS_DIR}/feedback-report-condensed-$(date +%Y%m%d).md"

    # Generate summary
    print_step "Generating full report..."

    cat > "$report_file" << HEADER
# User Feedback Report - JavaScript/TypeScript Rules

**Generated:** $(date '+%Y-%m-%d %H:%M')
**Source:** SonarCloud Issue Feedback S3 Bucket
**Files analyzed:** ${csv_count}

---

## Summary by Rule (sorted by FP count)

| Rule | FP | WONTFIX | Total |
|------|---:|--------:|------:|
HEADER

    # Count by rule and resolution
    cat "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
    awk -F',' '
    {
        gsub(/"/, "", $5); gsub(/"/, "", $6); gsub(/"/, "", $14)
        if($5=="javascript" || $5=="typescript") {
            rule=$6
            total[rule]++
            if($14=="FALSE-POSITIVE") fp[rule]++
            else if($14=="WONTFIX") wontfix[rule]++
        }
    }
    END {
        for(rule in total) {
            f = (rule in fp) ? fp[rule] : 0
            w = (rule in wontfix) ? wontfix[rule] : 0
            print f, w, total[rule], rule
        }
    }' | sort -rn | while read fp wontfix total rule; do
        echo "| $rule | $fp | $wontfix | $total |" >> "$report_file"
    done

    # Add detailed section header
    cat >> "$report_file" << 'SECTION'

---

## Detailed Feedback by Rule

SECTION

    # Get all rules with feedback
    local rules=$(cat "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
        awk -F',' '{gsub(/"/, "", $5); gsub(/"/, "", $6); if($5=="javascript" || $5=="typescript") print $6}' | \
        sort | uniq)

    for rule in $rules; do
        local count=$(grep -h "$rule" "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | wc -l | tr -d ' ')
        if [ "$count" -gt 0 ]; then
            echo "" >> "$report_file"
            echo "### $rule ($count reports)" >> "$report_file"
            echo "" >> "$report_file"
            echo "| Resolution | Comment | File |" >> "$report_file"
            echo "|------------|---------|------|" >> "$report_file"

            grep -h "$rule" "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
            awk -F',' -v rule="$rule" '
            {
                gsub(/"/, "", $5); gsub(/"/, "", $6); gsub(/"/, "", $14)
                if(($5=="javascript" || $5=="typescript") && $6==rule) {
                    resolution = $14
                    comment = $3
                    gsub(/^"/, "", comment)
                    gsub(/"$/, "", comment)
                    gsub(/\|/, "-", comment)
                    if(length(comment) > 100) comment = substr(comment, 1, 100) "..."

                    fileUuid = $2
                    fileName = $16
                    gsub(/"/, "", fileUuid)
                    gsub(/"/, "", fileName)

                    if(length(fileUuid) > 0 && length(fileName) > 0) {
                        fileRef = "`" substr(fileUuid,1,8) ".../" fileName "`"
                    } else {
                        fileRef = "-"
                    }

                    if(length(comment) < 2) comment = "(no comment)"

                    print "| " resolution " | " comment " | " fileRef " |"
                }
            }' >> "$report_file"
        fi
    done

    # Add footer
    cat >> "$report_file" << FOOTER

---

## Accessing Code Samples

Code samples are stored in S3 and can be accessed via AWS Console:

**Bucket:** \`${S3_BUCKET}\`
**Path:** \`files/{fileUuid}/{fileName}\`

Note: Code samples are retained for ~1 month from feedback date.

FOOTER

    print_success "Generated: $report_file"

    # Generate condensed report
    print_step "Generating condensed report..."

    cat > "$condensed_file" << HEADER
# User Feedback Report - JS/TS Rules (Condensed)

**Generated:** $(date '+%Y-%m-%d %H:%M')

## Summary (FP >= 3)

| Rule | FP | WONTFIX | Total |
|------|---:|--------:|------:|
HEADER

    cat "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
    awk -F',' '
    {
        gsub(/"/, "", $5); gsub(/"/, "", $6); gsub(/"/, "", $14)
        if($5=="javascript" || $5=="typescript") {
            rule=$6
            total[rule]++
            if($14=="FALSE-POSITIVE") fp[rule]++
            else if($14=="WONTFIX") wontfix[rule]++
        }
    }
    END {
        for(rule in total) {
            f = (rule in fp) ? fp[rule] : 0
            w = (rule in wontfix) ? wontfix[rule] : 0
            if(f >= 3 || w >= 3) print f, w, total[rule], rule
        }
    }' | sort -rn | while read fp wontfix total rule; do
        echo "| $rule | $fp | $wontfix | $total |" >> "$condensed_file"
    done

    echo "" >> "$condensed_file"
    echo "---" >> "$condensed_file"
    echo "" >> "$condensed_file"
    echo "## Key Feedback (2-3 examples per rule)" >> "$condensed_file"

    # Add sample comments for top rules
    local top_rules=$(cat "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
        awk -F',' '
        {
            gsub(/"/, "", $5); gsub(/"/, "", $6); gsub(/"/, "", $14)
            if(($5=="javascript" || $5=="typescript") && $14=="FALSE-POSITIVE") {
                fp[$6]++
            }
        }
        END {
            for(rule in fp) if(fp[rule] >= 3) print fp[rule], rule
        }' | sort -rn | head -20 | awk '{print $2}')

    for rule in $top_rules; do
        local fp_count=$(grep -h "$rule" "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | grep "FALSE-POSITIVE" | wc -l | tr -d ' ')
        echo "" >> "$condensed_file"
        echo "### $rule ($fp_count FP)" >> "$condensed_file"

        grep -h "$rule" "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
        awk -F',' -v rule="$rule" '
        BEGIN { count = 0 }
        {
            gsub(/"/, "", $5); gsub(/"/, "", $6)
            if(($5=="javascript" || $5=="typescript") && $6==rule && length($3) > 5) {
                comment = $3
                gsub(/^"/, "", comment)
                gsub(/"$/, "", comment)
                if(length(comment) > 120) comment = substr(comment, 1, 120) "..."
                if(count < 3) {
                    print "- \"" comment "\""
                    count++
                }
            }
        }' >> "$condensed_file"
    done

    cat >> "$condensed_file" << FOOTER

---

**S3 Bucket:** \`${S3_BUCKET}\`
**Full report:** \`feedback-report-*.md\`
FOOTER

    print_success "Generated: $condensed_file"

    # Print summary to console
    print_header "Analysis Complete"

    echo "Total JS/TS feedback entries:"
    cat "${DATA_DIR}"/*.csv | grep -cE "(javascript|typescript)" || echo "0"
    echo ""

    echo "Top 10 rules by FP count:"
    cat "${DATA_DIR}"/*.csv | grep -E "(javascript|typescript)" | \
    awk -F',' '{gsub(/"/, "", $5); gsub(/"/, "", $6); gsub(/"/, "", $14); if(($5=="javascript" || $5=="typescript") && $14=="FALSE-POSITIVE") print $6}' | \
    sort | uniq -c | sort -rn | head -10

    echo ""
    echo "Reports generated:"
    echo "  - ${report_file}"
    echo "  - ${condensed_file}"
    echo ""
    print_success "Done!"
}

# Main
main() {
    print_header "SonarJS User Feedback Analysis Tool"

    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
    esac

    if ! check_csv_files; then
        print_warning "No CSV files found in ${DATA_DIR}/"
        echo ""
        show_download_instructions

        if ! check_csv_files; then
            print_error "Still no CSV files found. Please download and try again."
            exit 1
        fi
    fi

    analyze_feedback
}

main "$@"
