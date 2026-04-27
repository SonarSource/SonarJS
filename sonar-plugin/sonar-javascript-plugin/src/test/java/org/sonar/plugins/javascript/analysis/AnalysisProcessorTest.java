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
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
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
}
