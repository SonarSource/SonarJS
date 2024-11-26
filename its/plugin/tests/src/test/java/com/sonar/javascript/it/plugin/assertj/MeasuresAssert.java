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
package com.sonar.javascript.it.plugin.assertj;

import java.util.List;
import java.util.Map;
import org.assertj.core.api.AbstractAssert;
import org.assertj.core.api.Assertions;
import org.assertj.core.data.Offset;

public class MeasuresAssert extends AbstractAssert<MeasuresAssert, Measures> {

  public static final List<String> METRIC_KEYS = List.of(
    "duplicated_lines",
    "duplicated_blocks",
    "duplicated_files",
    "duplicated_lines_density"
  );

  private final Offset<Double> offset = Offset.offset(0.01d);
  private final Map<String, Double> measures;

  public MeasuresAssert(Measures measures, Class<?> selfType) {
    super(measures, selfType);
    this.measures = measures.load(METRIC_KEYS);
  }

  public static MeasuresAssert assertThat(Measures measures) {
    return new MeasuresAssert(measures, MeasuresAssert.class);
  }

  public MeasuresAssert has(String metricKey, double value) {
    Assertions
      .assertThat(measures.get(metricKey))
      .as("measure %s", metricKey, value)
      .isEqualTo(value, offset);
    return this;
  }
}
