package main

import "testing"

func TestDOMPurifyUnsafeConfigReportsDangerousTagsAndBooleanOptions(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"dompurify-unsafe-config",
		nil,
		"file.ts",
		`
declare module "dompurify" {
  const DOMPurify: {
    sanitize(html: string, config?: object): string;
  };
  export default DOMPurify;
}

import DOMPurify from "dompurify";

const html = "<div>test</div>";
DOMPurify.sanitize(html, { ADD_TAGS: ["script"], SANITIZE_DOM: false });
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unsafeConfig")
}

func TestDOMPurifyUnsafeConfigAllowsSafeConfiguration(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"dompurify-unsafe-config",
		nil,
		"file.ts",
		`
declare module "dompurify" {
  const DOMPurify: {
    sanitize(html: string, config?: object): string;
  };
  export default DOMPurify;
}

import DOMPurify from "dompurify";

const html = "<div>test</div>";
DOMPurify.sanitize(html, { ADD_TAGS: ["custom-element"], SANITIZE_DOM: true });
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
