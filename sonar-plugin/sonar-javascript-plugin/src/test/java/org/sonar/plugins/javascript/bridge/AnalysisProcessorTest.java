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
    highlight.location = new BridgeServer.Location();
    highlight.location.startLine = 1;
    highlight.location.startCol = 2;
    highlight.location.endLine = 1;
    highlight.location.endCol = 1; // invalid range startCol > endCol
    response.highlights = new BridgeServer.Highlight[] { highlight };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains("Failed to save highlight");
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
    symbol.declaration = new BridgeServer.Location();
    symbol.declaration.startLine = 1;
    symbol.declaration.startCol = 2;
    symbol.declaration.endLine = 1;
    symbol.declaration.endCol = 1; // invalid range startCol > endCol
    response.highlightedSymbols = new BridgeServer.HighlightedSymbol[] { symbol };
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs()).contains("Failed to create symbol");
  }
}
