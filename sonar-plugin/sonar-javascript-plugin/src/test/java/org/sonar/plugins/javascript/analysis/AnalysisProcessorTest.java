/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import org.sonar.plugins.javascript.bridge.BridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.bridge.BridgeServer.CpdToken;
import org.sonar.plugins.javascript.bridge.BridgeServer.Highlight;
import org.sonar.plugins.javascript.bridge.BridgeServer.HighlightedSymbol;
import org.sonar.plugins.javascript.bridge.BridgeServer.Location;
import org.sonar.plugins.javascript.bridge.BridgeServer.Metrics;

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
    var location = new Location(1, 2, 1, 1); // invalid range startCol > endCol
    var highlight = new Highlight(location, "");
    var response = new AnalysisResponse(null, List.of(), List.of(highlight), List.of(), new Metrics(), List.of(), List.of(), null);
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to create highlight in " + file.uri() + " at 1:2-1:1");
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
    var declaration = new Location(1, 2, 1, 1); // invalid range startCol > endCol
    var symbol = new HighlightedSymbol(declaration, List.of());
    var response = new AnalysisResponse(null, List.of(), List.of(), List.of(symbol), new Metrics(), List.of(), List.of(), null);
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(logTester.logs())
      .contains("Failed to create symbol declaration in " + file.uri() + " at 1:2-1:1");

    context = SensorContextTester.create(baseDir);
    symbol = new HighlightedSymbol(new Location(1, 1, 1, 2), List.of(new Location(2, 2, 2, 1)));
    response = new AnalysisResponse(null, List.of(), List.of(), List.of(symbol), new Metrics(), List.of(), List.of(), null);
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
    var location = new Location(1, 2, 1, 1); // invalid range startCol > endCol
    var cpd = new CpdToken(location, "img");
    var response = new AnalysisResponse(null, List.of(), List.of(), List.of(), new Metrics(), List.of(cpd), List.of(), null);
    processor.processResponse(context, mock(JsTsChecks.class), file, response);
    assertThat(context.cpdTokens(file.key())).isNull();
    assertThat(logTester.logs())
      .contains("Failed to save CPD token in " + file.uri() + ". File will not be analyzed for duplications.");
  }
}
