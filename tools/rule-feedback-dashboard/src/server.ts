import express from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

const app = express();
const PORT = 3000;

// Paths
const DIST_DIR = path.resolve(import.meta.dirname, '../dist');
const RSPEC_DIR = path.resolve(
  import.meta.dirname,
  '../../../sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript',
);

app.use(express.json());

// Serve static files
app.use(express.static(DIST_DIR));

// API: Get RSPEC HTML content for a rule
app.get('/api/rspec/:ruleKey', (req, res) => {
  const { ruleKey } = req.params;
  const htmlPath = path.join(RSPEC_DIR, `${ruleKey}.html`);

  if (!fs.existsSync(htmlPath)) {
    res.status(404).json({ error: 'RSPEC not found' });
    return;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  res.json({ html });
});

// Project root path (for Claude context)
const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

// API: Open Claude in a new terminal with rule context
app.post('/api/open-claude', async (req, res) => {
  const { ruleData, rspecHtml } = req.body;

  if (!ruleData) {
    res.status(400).json({ error: 'Missing ruleData' });
    return;
  }

  // Build the initial prompt with all context
  const prompt =
    buildSystemContext(ruleData, rspecHtml, PROJECT_ROOT) +
    '\n\nPlease analyze this rule and the user feedback. Identify the main issues and propose improvements.';

  // Save prompt to a temp file (command line has length limits)
  const tmpDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\Temp' : '/tmp';
  const promptFile = path.join(tmpDir, `claude-rule-${ruleData.ruleKey}-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, prompt);

  console.log(`[OpenClaude] Saved prompt to ${promptFile}`);

  try {
    if (process.platform === 'darwin') {
      // macOS: Use osascript to open Terminal
      const script = `
        tell application "Terminal"
          activate
          do script "cd '${PROJECT_ROOT}' && cat '${promptFile}' | claude"
        end tell
      `;
      spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'win32') {
      // Windows: Use cmd.exe or PowerShell
      const cmd = `cd /d "${PROJECT_ROOT}" && type "${promptFile}" | claude`;
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', cmd], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else {
      // Linux: Try common terminals
      const cmd = `cd '${PROJECT_ROOT}' && cat '${promptFile}' | claude`;
      // Try xterm, gnome-terminal, or konsole
      const terminals = [
        ['gnome-terminal', ['--', 'bash', '-c', cmd]],
        ['xterm', ['-e', `bash -c "${cmd}"`]],
        ['konsole', ['-e', 'bash', '-c', cmd]],
      ];

      let launched = false;
      for (const [term, args] of terminals) {
        try {
          spawn(term as string, args as string[], { detached: true, stdio: 'ignore' }).unref();
          launched = true;
          break;
        } catch {
          // Try next terminal
        }
      }

      if (!launched) {
        res
          .status(500)
          .json({
            error: 'No supported terminal found. Copy the prompt file manually: ' + promptFile,
          });
        return;
      }
    }

    res.json({ success: true, message: 'Opening Claude in Terminal...', promptFile });
  } catch (err) {
    console.error('Failed to open terminal:', err);
    res.status(500).json({ error: 'Failed to open terminal', promptFile });
  }
});

function buildSystemContext(ruleData: any, rspecHtml: string, projectRoot?: string): string {
  const atlanStats = ruleData.atlan
    ? `
- Atlan FP%: ${(ruleData.atlan.fpPercent * 100).toFixed(1)}%
- Atlan Net Ratio: ${ruleData.atlan.netRatio.toFixed(2)}
- Atlan Total Issues: ${ruleData.atlan.issuesCount.toLocaleString()}
- Atlan Projects Affected: ${ruleData.atlan.projectsCount.toLocaleString()}`
    : '- No Atlan data available';

  const userComments =
    ruleData.feedbackComments.length > 0
      ? ruleData.feedbackComments
          .slice(0, 20)
          .map(
            (c: any) =>
              `- [${c.resolution}] ${c.comment || '(no comment)'} (${c.fileName || 'unknown file'}${c.line ? `:${c.line}` : ''})`,
          )
          .join('\n')
      : '- No user comments';

  const jiraTickets =
    ruleData.jiraTickets.length > 0
      ? ruleData.jiraTickets.map((t: any) => `- ${t.key}: ${t.summary} [${t.status}]`).join('\n')
      : '- No existing Jira tickets';

  const projectInfo = projectRoot
    ? `
## Project Location
- **SonarJS Root**: ${projectRoot}
- **Rule Implementation**: ${projectRoot}/packages/jsts/src/rules/${ruleData.ruleKey}/
`
    : '';

  return `You are analyzing a SonarJS/SonarTS rule that may need improvement based on user feedback and statistics.
${projectInfo}
## Rule Information
- **Rule Key**: ${ruleData.ruleKey}
- **Title**: ${ruleData.title}
- **Type**: ${ruleData.type}
- **Severity**: ${ruleData.severity}
- **Sonar Way**: ${ruleData.sonarWay ? 'Yes' : 'No'}
- **Scope**: ${ruleData.scope}
- **Tags**: ${ruleData.tags.join(', ') || 'None'}

## Statistics
- User Feedback Reports: ${ruleData.feedbackCount} total (${ruleData.fpCount} false positives, ${ruleData.wontfixCount} won't fix)
${atlanStats}

## User Comments (most recent ${Math.min(20, ruleData.feedbackComments.length)})
${userComments}

## Existing Jira Tickets
${jiraTickets}

## RSPEC Description
${rspecHtml || 'RSPEC HTML not available'}

---

Your task is to help the user understand the issues with this rule and propose improvements. When you have a clear understanding and proposal, format your response to include a Jira ticket suggestion with:
- A clear ticket title
- A detailed description including the problem analysis and proposed solution

Be concise but thorough. Focus on actionable improvements.`;
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
