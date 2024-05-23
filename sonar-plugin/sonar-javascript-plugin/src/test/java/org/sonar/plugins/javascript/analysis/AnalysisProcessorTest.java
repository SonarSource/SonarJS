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
import org.sonar.plugins.javascript.bridge.BridgeServer;

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
    var location = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    var highlight = new BridgeServer.Highlight(location, "");
    var response = new BridgeServer.AnalysisResponse(null, List.of(), new BridgeServer.Highlight[]{highlight}, new BridgeServer.HighlightedSymbol[0], null, null, null);
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
    var declaration = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    var symbol = new BridgeServer.HighlightedSymbol(declaration, new BridgeServer.Location[] {});
    var response = new BridgeServer.AnalysisResponse(null, List.of(), null, new BridgeServer.HighlightedSymbol[]{symbol}, null, null, null);
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to create symbol declaration in " + file.uri() + " at 1:2-1:1");

    context = SensorContextTester.create(baseDir);
    symbol = new BridgeServer.HighlightedSymbol(new BridgeServer.Location(1, 1, 1, 2), new BridgeServer.Location[]{new BridgeServer.Location(2, 2, 2, 1)});
    response = new BridgeServer.AnalysisResponse(null, List.of(), null, new BridgeServer.HighlightedSymbol[]{symbol}, null, null, null);
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
    var location = new BridgeServer.Location(1, 2, 1, 1); // invalid range startCol > endCol
    var cpd = new BridgeServer.CpdToken(location, "img");
    var response = new BridgeServer.AnalysisResponse(null, List.of(), null, null, null, new BridgeServer.CpdToken[]{cpd}, null);
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(context.cpdTokens(file.key())).isNull();
    assertThat(logTester.logs())
      .contains("Failed to save CPD token in " + file.uri() + ". File will not be analyzed for duplications.");
  }
}
