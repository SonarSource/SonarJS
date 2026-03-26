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

export interface InternalMetricsSink {
  cognitiveComplexity?: number;
}

const SONAR_INTERNAL_SETTINGS_KEY = 'sonarInternal';
const SONAR_INTERNAL_METRICS_SINK_KEY = 'metricsSink';

export function toInternalMetricsSettings(
  metricsSink: InternalMetricsSink,
): Record<string, unknown> {
  return {
    [SONAR_INTERNAL_SETTINGS_KEY]: {
      [SONAR_INTERNAL_METRICS_SINK_KEY]: metricsSink,
    },
  };
}

export function getInternalMetricsSink(settings: unknown): InternalMetricsSink | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }

  const sonarInternal = (settings as Record<string, unknown>)[SONAR_INTERNAL_SETTINGS_KEY];
  if (!sonarInternal || typeof sonarInternal !== 'object') {
    return undefined;
  }

  const metricsSink = (sonarInternal as Record<string, unknown>)[SONAR_INTERNAL_METRICS_SINK_KEY];
  if (!metricsSink || typeof metricsSink !== 'object') {
    return undefined;
  }

  return metricsSink as InternalMetricsSink;
}
