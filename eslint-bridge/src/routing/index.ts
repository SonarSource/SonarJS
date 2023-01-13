/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import express from 'express';
import onAnalyzeCss from './on-analyze-css';
import onAnalyzeJs from './on-analyze-js';
import onAnalyzeTs from './on-analyze-ts';
import onAnalyzeYaml from './on-analyze-yaml';
import onCreateProgram from './on-create-program';
import onDeleteProgram from './on-delete-program';
import onInitLinter from './on-init-linter';
import onNewTSConfig from './on-new-tsconfig';
import onStatus from './on-status';
import onTSConfigFiles from './on-tsconfig-files';
import onCreateTSConfigFile from './on-create-tsconfig-file';

const router = express.Router();

router.post('/analyze-css', onAnalyzeCss);
router.post('/analyze-js', onAnalyzeJs);
router.post('/analyze-ts', onAnalyzeTs);
router.post('/analyze-with-program', onAnalyzeTs);
router.post('/analyze-yaml', onAnalyzeYaml);
router.post('/create-program', onCreateProgram);
router.post('/delete-program', onDeleteProgram);
router.post('/init-linter', onInitLinter);
router.post('/new-tsconfig', onNewTSConfig);
router.get('/status', onStatus);
router.post('/tsconfig-files', onTSConfigFiles);
router.post('/create-tsconfig-file', onCreateTSConfigFile);

export default router;
