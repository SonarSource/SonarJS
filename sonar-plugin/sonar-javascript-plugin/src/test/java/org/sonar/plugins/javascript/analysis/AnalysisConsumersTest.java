/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;

public class AnalysisConsumersTest {

  @Test
  public void empty_consumer_list_is_disabled() {
    AnalysisConsumers consumers = new AnalysisConsumers();
    assertThat(consumers.isEnabled()).isFalse();
  }

  @Test
  public void consumer_list_with_disabled_consumer_is_disabled() {
    AnalysisConsumers consumers = new AnalysisConsumers(List.of(new Consumer(false)));
    assertThat(consumers.isEnabled()).isFalse();
  }

  @Test
  public void consumer_list_with_mix_of_disabled_and_enabled_consumer_is_enabled() {
    AnalysisConsumers consumers = new AnalysisConsumers(
      List.of(new Consumer(false), new Consumer(true))
    );
    assertThat(consumers.isEnabled()).isTrue();
  }

  static class Consumer implements JsAnalysisConsumer {

    private final boolean enabled;

    Consumer(boolean enabled) {
      this.enabled = enabled;
    }

    @Override
    public void accept(JsFile jsFile) {}

    @Override
    public void doneAnalysis() {}

    @Override
    public boolean isEnabled() {
      return enabled;
    }
  }
}
