/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

import java.util.List;
import org.junit.jupiter.api.Test;
import org.slf4j.event.Level;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;

public class AnalysisConsumersTest {

  @org.junit.jupiter.api.extension.RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void empty_consumer_list_is_disabled() {
    AnalysisConsumers consumers = new AnalysisConsumers();
    assertThat(consumers.isEnabled()).isFalse();
  }

  @Test
  void consumer_list_with_disabled_consumer_is_disabled() {
    AnalysisConsumers consumers = new AnalysisConsumers(List.of(new Consumer(false)));
    assertThat(consumers.isEnabled()).isFalse();
  }

  @Test
  void consumer_list_with_mix_of_disabled_and_enabled_consumer_is_enabled() {
    AnalysisConsumers consumers = new AnalysisConsumers(
      List.of(new Consumer(false), new Consumer(true))
    );
    assertThat(consumers.isEnabled()).isTrue();
  }

  /**
   * Some e2e tests relies on the AnalysisConsumers debug output.
   */
  @Test
  void produce_list_of_enabled_and_registered_plugins_in_debug_mode() {
    logTester.setLevel(Level.DEBUG);
    AnalysisConsumers consumers = new AnalysisConsumers(
      List.of(
        new Consumer("myConsumer1", false),
        new Consumer("myConsumer2", true),
        new Consumer("myConsumer3", true)
      )
    );
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Registered JsAnalysisConsumers [myConsumer2, myConsumer3]"
    );
  }

  static class Consumer implements JsAnalysisConsumer {

    private final boolean enabled;
    private final String name;

    Consumer(boolean enabled) {
      this("test", enabled);
    }

    Consumer(String name, boolean enabled) {
      this.name = name;
      this.enabled = enabled;
    }

    @Override
    public void accept(JsFile jsFile) {}

    @Override
    public void doneAnalysis(SensorContext context) {}

    @Override
    public boolean isEnabled() {
      return enabled;
    }

    public String toString() {
      return name;
    }
  }
}
