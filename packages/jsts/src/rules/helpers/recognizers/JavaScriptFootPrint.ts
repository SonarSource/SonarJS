/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import Detector from './Detector.js';
import CamelCaseDetector from './detectors/CamelCaseDetector.js';
import ContainsDetector from './detectors/ContainsDetector.js';
import EndWithDetector from './detectors/EndWithDetector.js';
import KeywordsDetector from './detectors/KeywordsDetector.js';
import LanguageFootprint from './LanguageFootprint.js';

export class JavaScriptFootPrint implements LanguageFootprint {
  detectors: Set<Detector> = new Set();

  constructor() {
    this.detectors.add(new EndWithDetector(0.95, '}', ';', '{'));
    this.detectors.add(new KeywordsDetector(0.7, '++', '||', '&&', '===', '?.', '??'));
    this.detectors.add(
      new KeywordsDetector(
        0.3,
        'public',
        'abstract',
        'class',
        'implements',
        'extends',
        'return',
        'throw',
        'private',
        'protected',
        'enum',
        'continue',
        'assert',
        'boolean',
        'this',
        'instanceof',
        'interface',
        'static',
        'void',
        'super',
        'true',
        'case:',
        'let',
        'const',
        'var',
        'async',
        'await',
        'break',
        'yield',
        'typeof',
        'import',
        'export',
      ),
    );
    this.detectors.add(
      new ContainsDetector(
        0.95,
        'for(',
        'if(',
        'while(',
        'catch(',
        'switch(',
        'try{',
        'else{',
        'this.',
        'window.',
        /;\s+\/\//,
        "import '",
        'import "',
        'require(',
      ),
    );
    this.detectors.add(new CamelCaseDetector(0.5));
  }

  getDetectors(): Set<Detector> {
    return this.detectors;
  }
}
