/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import com.sonar.sslr.api.AuditListener;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptGrammar;

import java.io.PrintWriter;
import java.io.StringWriter;

@Rule(
  key = "ParsingError",
  priority = Priority.MAJOR,
  name = "JavaScript parser failure",
  description = "<p>" +
      "When the JavaScript parser fails, it is possible to record the failure as a violation on the file. " +
      "This way, not only it is possible to track the number of files that do not parse but also to easily find out why they do not parse." +
      "</p>")
public class ParsingErrorCheck extends SquidCheck<EcmaScriptGrammar> implements AuditListener {

  public void processException(Exception e) {
    StringWriter exception = new StringWriter();
    e.printStackTrace(new PrintWriter(exception));
    getContext().createFileViolation(this, exception.toString());
  }

  public void processRecognitionException(RecognitionException e) {
    getContext().createLineViolation(this, e.getMessage(), e.getLine());
  }

}
