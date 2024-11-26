/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependsUpon;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.scanner.sensor.ProjectSensor;
import org.sonar.plugins.javascript.api.JsFile;

@ScannerSide
// We depend on the "js-analysis" extension to make sure that the analysis is done before we consume it
@DependsUpon("js-analysis")
public class ConsumerSensor implements ProjectSensor {

  private static final Logger LOG = LoggerFactory.getLogger(ConsumerSensor.class);

  private final Consumer consumer;

  /**
   * We use Dependency Injection to get Consumer instance
   *
   * @param consumer Consumer instance
   */
  public ConsumerSensor(Consumer consumer) {
    this.consumer = consumer;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("Consumer Sensor");
  }

  @Override
  public void execute(SensorContext context) {
    if (!consumer.isDone()) {
      throw new IllegalStateException("Consumer is not done");
    }
    for (JsFile jsFile : consumer.getJsFiles()) {
      LOG.info("Processing file {}", jsFile.inputFile());
    }
  }
}
