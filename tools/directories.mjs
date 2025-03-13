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
// todo: we need to move this to a proper Maven plugin, so that it is configurable during Maven lifecycle
import * as path from 'node:path';

/**
 * The local cache for node distributions
 */
export const DOWNLOAD_DIR = path.resolve('resources/downloads');

/**
 * Folder where the node runtimes are prepared
 */
export const RUNTIMES_DIR = path.resolve('resources/downloads/runtimes');
