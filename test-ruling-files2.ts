import { Linter } from 'eslint';
import { rules as reactRules } from './packages/jsts/src/rules/external/react.js';
import { decorate } from './packages/jsts/src/rules/S6767/decorator.ts';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'fs';

const linter = new Linter({ configType: 'eslintrc' });
linter.defineParser('ts-parser', parser as any);
linter.defineRule('original', reactRules['no-unused-prop-types']);
linter.defineRule('decorated', decorate(reactRules['no-unused-prop-types']));

// Files that previously had "no pattern" - testing with current decorator
const files = [
  'its/sources/jsts/projects/desktop/app/src/ui/relative-time.tsx',
  'its/sources/jsts/projects/desktop/app/src/ui/notifications/pull-request-review.tsx',
  'its/sources/jsts/projects/desktop/app/src/ui/notifications/pull-request-checks-failed.tsx',
  'its/sources/jsts/projects/desktop/app/src/ui/check-runs/ci-check-run-list-item.tsx',
  'its/sources/jsts/projects/desktop/app/src/ui/history/selected-commit.tsx',
  'its/sources/jsts/projects/desktop/app/src/ui/welcome/welcome.tsx',
  'its/sources/jsts/projects/console/src/components/ToggleButton/ToggleButton.tsx',
  'its/sources/jsts/projects/console/src/views/RelationsPopup/SetMutation.tsx',
  'its/sources/jsts/projects/console/src/views/SchemaView/EnumsOverview/EnumBox.tsx',
  'its/sources/jsts/projects/console/src/views/SchemaView/SchemaOverview/TypeBox.tsx',
  'its/sources/jsts/projects/eigen/src/app/Components/ScrollableTabBar.tsx',
  // Also test files that SHOULD still be suppressed
  'its/sources/jsts/projects/eigen/src/app/Scenes/Home/Components/FairsRail.tsx',
  'its/sources/jsts/projects/courselit/packages/common-widgets/src/branding/widget.tsx',
  'its/sources/jsts/projects/ant-design/components/skeleton/Element.tsx',
  'its/sources/jsts/projects/eigen/src/app/Components/ArtistListItem.tsx',
  'its/sources/jsts/projects/eigen/src/app/Scenes/Partner/Partner.tsx',
  'its/sources/jsts/projects/eigen/src/app/Scenes/SavedSearchAlert/Components/SavedSearchAlertSwitch.tsx',
  'its/sources/jsts/projects/courselit/apps/web/components/admin/design/menus/links/index.tsx',
  'its/sources/jsts/projects/console/src/views/ProjectRootView/Onboarding/SelectExample.tsx',
];

for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    const config = {
      parser: 'ts-parser',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2020,
        sourceType: 'module',
      } as any,
      rules: { original: 'error' as const },
    };
    const origMsgs = linter.verify(code, config);
    const decConfig = {
      parser: 'ts-parser',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2020,
        sourceType: 'module',
      } as any,
      rules: { decorated: 'error' as const },
    };
    const decMsgs = linter.verify(code, decConfig);

    const suppressed = origMsgs.length - decMsgs.length;
    console.log(
      `${f.split('/').slice(-2).join('/')}: orig=${origMsgs.length} dec=${decMsgs.length} suppressed=${suppressed}`,
    );
    if (suppressed > 0) {
      const decLines = new Set(decMsgs.map(m => m.line));
      const suppressedLines = origMsgs.filter(m => !decLines.has(m.line));
      suppressedLines.forEach(m => console.log(`  SUPPRESSED line ${m.line}: ${m.message}`));
    }
    decMsgs.forEach(m => console.log(`  RAISED line ${m.line}: ${m.message}`));
  } catch (e: any) {
    console.log(`${f}: ERROR: ${e.message?.substring(0, 150)}`);
  }
}
