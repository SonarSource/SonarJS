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
import type { FileResult, ProjectAnalysisMeta } from './projectAnalysis.js';

type AnalysisCancelled = { messageType: 'cancelled' };
type MetaResult = { messageType: 'meta' } & ProjectAnalysisMeta;
type FileResultMessage = { filename: string; messageType: 'fileResult' } & FileResult;
type ErrorResult = { messageType: 'error'; error: unknown };

export type WsIncrementalResult = FileResultMessage | MetaResult | AnalysisCancelled | ErrorResult;

