package main

import (
	"sync"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/fixtures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2819_post_message"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

func TestPostMessageReportsWildcardTargetOrigin(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
window.postMessage('hello', '*');
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertSingleDiagnosticMessageID(t, diagnostics, "specifyTarget")
}

func TestPostMessageReportsWildcardTargetOriginOnWindowLikeReceiver(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
window.frames[1].postMessage('hello', '*');
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertSingleDiagnosticMessageID(t, diagnostics, "specifyTarget")
}

func TestPostMessageReportsMissingOriginVerification(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
function handle(value: unknown) {}

window.addEventListener('message', event => {
  handle(event.data);
});
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertSingleDiagnosticMessageID(t, diagnostics, "verifyOrigin")
}

func TestPostMessageReportsMissingOriginVerificationForMessageConstant(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
const eventType = 'message';

function eventHandler(event: MessageEvent) {
  console.log(event.data);
}

window.addEventListener(eventType, eventHandler);
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertSingleDiagnosticMessageID(t, diagnostics, "verifyOrigin")
}

func TestPostMessageSkipsVerifiedEventOrigin(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
function handle(value: unknown) {}

window.addEventListener('message', event => {
  if (event.origin === 'https://trusted.example') {
    handle(event.data);
  }
});
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

func TestPostMessageSkipsVerifiedOriginOnNamedHandler(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
function processEvent(event: MessageEvent) {
  if (event.origin !== 'https://trusted.example') {
    return;
  }
}

window.addEventListener('message', processEvent);
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

func TestPostMessageSkipsVerifiedOriginalEventOrigin(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

function handle(value: unknown) {}

window.addEventListener('message', (event: WrappedMessageEvent) => {
  if (event.originalEvent.origin === 'https://trusted.example') {
    handle(event.data);
  }
});
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

func TestPostMessageSkipsWrapperListenerCall(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
const processEvent = (event: MessageEvent) => {
  if (event.origin !== 'https://trusted.example') {
    return;
  }
};

window.addEventListener('message', event => processEvent(event));
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

func TestPostMessageSkipsVerifiedAliasedEventOrigin(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

window.addEventListener('message', (event: WrappedMessageEvent) => {
  const currentEvent = event.originalEvent || event;
  if (currentEvent.origin !== 'https://trusted.example') {
    return;
  }
});
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

func TestPostMessageSkipsVerifiedAliasedOriginValue(t *testing.T) {
	t.Parallel()

	diagnostics := s2819RunRuleOnCode(
		t,
		s2819_post_message.PostMessageRule,
		nil,
		"file.ts",
		`
type WrappedMessageEvent = MessageEvent & { originalEvent: MessageEvent };

window.addEventListener('message', (event: WrappedMessageEvent) => {
  const origin = event.originalEvent.origin || event.origin;
  if (origin !== 'https://trusted.example') {
    return;
  }
});
`,
		"tsconfig.minimal.json",
		"",
	)

	s2819AssertDiagnosticCount(t, diagnostics, 0)
}

var s2819DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func s2819RunRuleOnCode(
	t *testing.T,
	availableRule rulepkg.Rule,
	options any,
	fileName string,
	code string,
	tsconfigName string,
	tsconfigContent string,
) []rulepkg.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	if tsconfigContent != "" {
		overlays[tspath.ResolvePath(rootDir, tsconfigName)] = tsconfigContent
	}

	fs := utils.NewOverlayVFS(s2819DirectRuleTestFS, overlays)
	host := utils.CreateCompilerHost(rootDir, fs)

	program, _, err := utils.CreateProgram(true, fs, rootDir, tsconfigName, host, false)
	if err != nil {
		t.Fatalf("could not create program: %v", err)
	}

	sourceFile := program.GetSourceFile(filePath)
	if sourceFile == nil {
		t.Fatalf("could not load source file %q", filePath)
	}

	var (
		mu          sync.Mutex
		diagnostics []rulepkg.RuleDiagnostic
	)

	err = linter.RunLinterOnFile(
		utils.LogLevelNormal,
		program,
		sourceFile,
		[]linter.ConfiguredRule{{
			Name: availableRule.Name,
			Run: func(ctx rulepkg.RuleContext) rulepkg.RuleListeners {
				return availableRule.Run(ctx, options)
			},
		}},
		func(diagnostic rulepkg.RuleDiagnostic) {
			mu.Lock()
			defer mu.Unlock()
			diagnostics = append(diagnostics, diagnostic)
		},
		func(diagnostic.Internal) {},
		linter.Fixes{Fix: false, FixSuggestions: false},
		linter.TypeErrors{ReportSyntactic: false, ReportSemantic: false},
	)
	if err != nil {
		t.Fatalf("unexpected linter error: %v", err)
	}

	return diagnostics
}

func s2819AssertDiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func s2819AssertSingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	s2819AssertDiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}
