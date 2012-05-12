package org.sonar.javascript.checks;

import com.sonar.sslr.squid.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squid.api.SourceFile;

import java.io.File;

public class EvalCheckTest {

  @Test
  public void test() {
    EvalCheck check = new EvalCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/eval.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(2).withMessage("Avoid use of eval.")
        .noMore();
  }

}
