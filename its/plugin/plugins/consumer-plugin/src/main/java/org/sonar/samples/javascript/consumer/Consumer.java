/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
package org.sonar.samples.javascript.consumer;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;

public class Consumer implements JsAnalysisConsumer {

  private static final Logger LOG = LoggerFactory.getLogger(Consumer.class);

  private final List<JsFile> jsFiles = new ArrayList<>();
  private boolean done;

  @Override
  public void accept(JsFile jsFile) {
    LOG.info("Accepted file: {}", jsFile.inputFile());
    jsFiles.add(jsFile);
  }

  @Override
  public void doneAnalysis(SensorContext context) {
    LOG.info("Done analysis");
    done = true;
  }

  public List<JsFile> getJsFiles() {
    return jsFiles;
  }

  public boolean isDone() {
    return done;
  }
}
