/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.IssueResolution;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisLanguage;
import org.sonar.plugins.javascript.analyzeproject.grpc.CpdToken;
import org.sonar.plugins.javascript.analyzeproject.grpc.Highlight;
import org.sonar.plugins.javascript.analyzeproject.grpc.HighlightedSymbol;
import org.sonar.plugins.javascript.analyzeproject.grpc.Issue;
import org.sonar.plugins.javascript.analyzeproject.grpc.Location;
import org.sonar.plugins.javascript.analyzeproject.grpc.Metrics;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingError;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingErrorCode;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.SonarResolveComment;
import org.sonar.plugins.javascript.analyzeproject.grpc.TextType;

class AnalysisProcessorTest {

  @TempDir
  Path baseDir;

  @org.junit.jupiter.api.extension.RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void should_not_fail_when_invalid_range() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var sensorContext = SensorContextTester.create(baseDir);
    var context = new JsTsContext(sensorContext);
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .setLanguage("js")
      .build();
    var location = Location.newBuilder()
      .setStartLine(1)
      .setStartCol(2)
      .setEndLine(1)
      .setEndCol(1)
      .build();
    var highlight = Highlight.newBuilder()
      .setLocation(location)
      .setTextType(TextType.TEXT_TYPE_KEYWORD)
      .build();
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addHighlights(highlight)
      .build();
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains(
      "Failed to create highlight in " + file.uri() + " at 1:2-1:1"
    );
  }

  @Test
  void should_skip_unsupported_highlight_text_type() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var sensorContext = SensorContextTester.create(baseDir);
    var context = new JsTsContext(sensorContext);
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .setLanguage("js")
      .build();
    var highlight = Highlight.newBuilder()
      .setLocation(Location.newBuilder().setStartLine(1).setStartCol(0).setEndLine(1).setEndCol(3))
      .setTextType(TextType.TEXT_TYPE_UNSPECIFIED)
      .build();
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addHighlights(highlight)
      .build();

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(sensorContext.highlightingTypeAt(file.key(), 1, 0)).isEmpty();
    assertThat(logTester.logs()).doesNotContain(
      "Failed to create highlight in " + file.uri() + " at 1:0-1:3"
    );
  }

  @Test
  void should_not_fail_when_invalid_symbol() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var context = new JsTsContext(SensorContextTester.create(baseDir));
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .setLanguage("js")
      .build();
    var declaration = Location.newBuilder()
      .setStartLine(1)
      .setStartCol(2)
      .setEndLine(1)
      .setEndCol(1)
      .build();
    var symbol = HighlightedSymbol.newBuilder().setDeclaration(declaration).build();
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addHighlightedSymbols(symbol)
      .build();
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains(
      "Failed to create symbol declaration in " + file.uri() + " at 1:2-1:1"
    );

    context = new JsTsContext(SensorContextTester.create(baseDir));
    symbol = HighlightedSymbol.newBuilder()
      .setDeclaration(
        Location.newBuilder().setStartLine(1).setStartCol(1).setEndLine(1).setEndCol(2)
      )
      .addReferences(
        Location.newBuilder().setStartLine(2).setStartCol(2).setEndLine(2).setEndCol(1)
      )
      .build();
    response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addHighlightedSymbols(symbol)
      .build();
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains(
      "Failed to create symbol reference in " + file.uri() + " at 2:2-2:1"
    );
  }

  @Test
  void should_not_fail_when_invalid_cpd() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var context = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .setLanguage("js")
      .build();
    var location = Location.newBuilder()
      .setStartLine(1)
      .setStartCol(2)
      .setEndLine(1)
      .setEndCol(1)
      .build();
    var cpd = CpdToken.newBuilder().setLocation(location).setImage("img").build();
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addCpdTokens(cpd)
      .build();
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(context.getSensorContext().cpdTokens(file.key())).isNull();
    assertThat(logTester.logs()).contains(
      "Failed to save CPD token in " + file.uri() + ". File will not be analyzed for duplications."
    );
  }

  @Test
  void should_not_fail_when_invalid_issue() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var context = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .build();
    var issue = Issue.newBuilder()
      .setLine(2)
      .setColumn(1)
      .setEndLine(1)
      .setEndColumn(2)
      .setMessage("message")
      .setRuleId("ruleId")
      .setLanguage(AnalysisLanguage.ANALYSIS_LANGUAGE_JS)
      .setCost(3.14)
      .addRuleEslintKeys("foo")
      .setFilePath("file.js")
      .build(); // invalid location startLine > endLine
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addIssues(issue)
      .build();
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains("Failed to save issue in " + file.uri() + " at line 2");
  }

  @Test
  void should_not_fail_when_invalid_parsing_error_pointer() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
    var context = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    var file = TestInputFileBuilder.create("moduleKey", "file.js")
      .setContents("x")
      .setLanguage("js")
      .build();

    var parsingError = ParsingError.newBuilder()
      .setMessage("Parse error message")
      .setLine(1)
      .setColumn(2)
      .setCode(ParsingErrorCode.PARSING_ERROR_CODE_PARSING)
      .setLanguage(AnalysisLanguage.ANALYSIS_LANGUAGE_JS)
      .build();
    var response = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addParsingErrors(parsingError)
      .build();

    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(context.getSensorContext().allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs()).contains(
      "Failed to create parsing error pointer in " +
        file.uri() +
        " at line 1, column 2. Falling back to file start."
    );
  }

  @Test
  void should_save_sonar_resolve_at_supported_runtime() {
    var processor = createProcessor();
    var sensorContext = SensorContextTester.create(baseDir);
    sensorContext.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(13, 5),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    var context = new JsTsContext<>(sensorContext);
    var file = createInputFile(sensorContext, "js", "file.js", "const x = 1;\nconst y = 2;\n");
    var response = responseWithSonarResolveComments(
      SonarResolveComment.newBuilder()
        .setLine(1)
        .setText("sonar-resolve javascript:S1116 \"reason\"")
        .build()
    );

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(issueResolutions(sensorContext, file))
      .singleElement()
      .satisfies(issueResolution -> {
        assertThat(issueResolution.status()).isEqualTo(IssueResolution.Status.DEFAULT);
        assertThat(issueResolution.ruleKeys()).containsExactly(RuleKey.of("javascript", "S1116"));
        assertThat(issueResolution.comment()).isEqualTo("reason");
        assertThat(issueResolution.textRange().start().line()).isEqualTo(1);
      });
  }

  @Test
  void should_ignore_sonar_resolve_before_supported_runtime() {
    var processor = createProcessor();
    var sensorContext = SensorContextTester.create(baseDir);
    sensorContext.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(13, 4),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    var context = new JsTsContext<>(sensorContext);
    var file = createInputFile(sensorContext, "js", "file.js", "const x = 1;\n");
    var response = responseWithSonarResolveComments(
      SonarResolveComment.newBuilder()
        .setLine(1)
        .setText("sonar-resolve javascript:S1116 \"reason\"")
        .build()
    );

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(issueResolutions(sensorContext, file)).isEmpty();
  }

  @Test
  void should_ignore_sonar_resolve_in_sonarlint() {
    var processor = createProcessor();
    var sensorContext = SensorContextTester.create(baseDir);
    sensorContext.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(13, 6)));
    var context = new JsTsContext<>(sensorContext);
    var file = createInputFile(sensorContext, "js", "file.js", "const x = 1;\n");
    var response = responseWithSonarResolveComments(
      SonarResolveComment.newBuilder()
        .setLine(1)
        .setText("sonar-resolve javascript:S1116 \"reason\"")
        .build()
    );

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(issueResolutions(sensorContext, file)).isEmpty();
  }

  @Test
  void should_warn_and_continue_on_invalid_sonar_resolve_directive() {
    var processor = createProcessor();
    var sensorContext = SensorContextTester.create(baseDir);
    sensorContext.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(13, 5),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    var context = new JsTsContext<>(sensorContext);
    var file = createInputFile(sensorContext, "js", "file.js", "const x = 1;\nconst y = 2;\n");
    var response = responseWithSonarResolveComments(
      SonarResolveComment.newBuilder().setLine(1).setText("sonar-resolve [oops]").build(),
      SonarResolveComment.newBuilder()
        .setLine(2)
        .setText("sonar-resolve javascript:S1116 \"reason\"")
        .build()
    );

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(issueResolutions(sensorContext, file))
      .singleElement()
      .satisfies(issueResolution ->
        assertThat(issueResolution.textRange().start().line()).isEqualTo(2)
      );
    assertThat(logTester.logs()).anySatisfy(log ->
      assertThat(log).contains("Invalid sonar-resolve directive:")
    );
  }

  @Test
  void should_save_sonar_resolve_for_non_js_owned_files() {
    var processor = createProcessor();
    var sensorContext = SensorContextTester.create(baseDir);
    sensorContext.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(13, 5),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    var context = new JsTsContext<>(sensorContext);
    var file = createInputFile(sensorContext, "yaml", "file.yaml", "key: value\n");
    var response = responseWithSonarResolveComments(
      SonarResolveComment.newBuilder()
        .setLine(1)
        .setText("sonar-resolve javascript:S1116 \"reason\"")
        .build()
    );

    processor.processResponse(context, mock(JsTsChecks.class), file, response);

    assertThat(issueResolutions(sensorContext, file)).hasSize(1);
  }

  private AnalysisProcessor createProcessor() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    return new AnalysisProcessor(
      mock(NoSonarFilter.class),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
  }

  private InputFile createInputFile(
    SensorContextTester sensorContext,
    String language,
    String filename,
    String contents
  ) {
    var inputFile = TestInputFileBuilder.create("moduleKey", filename)
      .setContents(contents)
      .setLanguage(language)
      .build();
    sensorContext.fileSystem().add(inputFile);
    return inputFile;
  }

  private ProjectAnalysisFileResult responseWithSonarResolveComments(
    SonarResolveComment... sonarResolveComments
  ) {
    return ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addAllSonarResolveComments(List.of(sonarResolveComments))
      .build();
  }

  private List<IssueResolution> issueResolutions(SensorContextTester tester, InputFile inputFile) {
    return tester.getIssueResolutions().getOrDefault(inputFile.key(), List.of());
  }
}
