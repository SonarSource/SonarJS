/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Metadata, Program } from './contract.cjs';
export const metadata: Metadata;
/** Release a program after its last consumer. Calls are idempotent. */
export function disposeProgram(program: Program): void;
/** Close this worker's compiler session. Existing native programs become invalid. */
export function close(): void;
/** Batch programs are released on success, cancellation and failure. IDE caches retain ownership. */
export function withProgramScope<T>(operation: () => Promise<T>): Promise<T>;
/** Optional backend diagnostics. These are not part of rule semantics. */
export function getTiming(): unknown;
