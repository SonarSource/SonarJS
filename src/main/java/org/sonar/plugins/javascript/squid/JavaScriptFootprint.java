/**
 * Sonar JavaScript Plugin
 * Extension for Sonar, open source software quality management tool.
 * Copyright (C) 2011 Eriks Nukis
 * mailto: eriks.nukis@gmail.com
 *
 * Sonar JavaScript Plugin is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * Sonar JavaScript Plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with Sonar JavaScript Plugin; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

package org.sonar.plugins.javascript.squid;

import java.util.HashSet;
import java.util.Set;

import org.sonar.squid.recognizer.ContainsDetector;
import org.sonar.squid.recognizer.Detector;
import org.sonar.squid.recognizer.EndWithDetector;
import org.sonar.squid.recognizer.KeywordsDetector;
import org.sonar.squid.recognizer.LanguageFootprint;

public class JavaScriptFootprint implements LanguageFootprint {

  public Set<Detector> getDetectors() {
    final Set<Detector> detectors = new HashSet<Detector>();

    detectors.add(new EndWithDetector(0.95, '}', ';', '{'));

    // https://developer.mozilla.org/en/JavaScript/Reference/Reserved_Words
    detectors.add(new KeywordsDetector(0.3, "break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for",
        "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with"));

    // https://developer.mozilla.org/en/JavaScript/Reference
    detectors.add(new ContainsDetector(0.95, "++", "--"));
    detectors.add(new ContainsDetector(0.95, "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|="));
    detectors.add(new ContainsDetector(0.95, "==", "!=", "===", "!=="));

    return detectors;
  }
}
