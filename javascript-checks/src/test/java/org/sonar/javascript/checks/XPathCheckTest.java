/*
 * Copyright (C) 2010 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package org.sonar.javascript.checks;

import com.sonar.sslr.squid.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squid.api.SourceFile;

import java.io.File;

public class XPathCheckTest {

  @Test
  public void check() {
    XPathCheck check = new XPathCheck();
    check.xpathQuery = "//IDENTIFIER[string-length(@tokenValue) >= 10]";
    check.message = "Avoid identifiers which are too long!";

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/xpath.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(2).withMessage("Avoid identifiers which are too long!")
        .noMore();
  }

}
