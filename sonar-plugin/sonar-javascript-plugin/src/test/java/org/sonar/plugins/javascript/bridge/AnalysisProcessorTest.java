package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;

class AnalysisProcessorTest {

  @TempDir
  Path baseDir;

  @org.junit.jupiter.api.extension.RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void should_not_fail_when_invalid_range() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(mock(NoSonarFilter.class), fileLinesContextFactory);
    var context = SensorContextTester.create(baseDir);
    var file = TestInputFileBuilder
      .create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .build();
    var response = new BridgeServer.AnalysisResponse();
    var highlight = new BridgeServer.Highlight();
    highlight.location = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    response.highlights = new BridgeServer.Highlight[] { highlight };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to save highlight in " + file.uri() + " at 1:2-1:1");
  }

  @Test
  void should_not_fail_when_invalid_symbol() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(mock(NoSonarFilter.class), fileLinesContextFactory);
    var context = SensorContextTester.create(baseDir);
    var file = TestInputFileBuilder
      .create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .build();
    var response = new BridgeServer.AnalysisResponse();
    var symbol = new BridgeServer.HighlightedSymbol();
    symbol.declaration = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    response.highlightedSymbols = new BridgeServer.HighlightedSymbol[] { symbol };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to create symbol declaration in " + file.uri() + " at 1:2-1:1");

    context = SensorContextTester.create(baseDir);
    symbol.declaration = new BridgeServer.Location(1, 1, 1, 2);
    symbol.references = new BridgeServer.Location[] { new BridgeServer.Location(2, 2, 2, 1) };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to create symbol reference in " + file.uri() + " at 2:2-2:1");
  }

  @Test
  void should_not_fail_when_invalid_cpd() {
    var fileLinesContextFactory = mock(FileLinesContextFactory.class);
    when(fileLinesContextFactory.createFor(any())).thenReturn(mock(FileLinesContext.class));
    var processor = new AnalysisProcessor(mock(NoSonarFilter.class), fileLinesContextFactory);
    var context = SensorContextTester.create(baseDir);
    var file = TestInputFileBuilder
      .create("moduleKey", "file.js")
      .setContents("var x  = 1;")
      .build();
    var response = new BridgeServer.AnalysisResponse();
    var cpd = new BridgeServer.CpdToken();
    cpd.location = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    response.cpdTokens = new BridgeServer.CpdToken[] { cpd };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to save CPD token in " + file.uri() + " at 1:2-1:1");
  }
}
