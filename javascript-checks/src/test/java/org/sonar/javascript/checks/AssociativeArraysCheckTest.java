package org.sonar.samples.javascript.checks;

import java.io.File;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;


public class AssociativeArraysCheckTest {

	@Test
	  public void test() throws Exception {
	    JavaScriptCheckVerifier.issues(new AssociativeArraysCheck(), new File("src/test/resources/checks/associativeArraysCheck.js"))
	      .next().atLine(3).withMessage("Only use a numeric index for Arrays")
	      .noMore();
	  }
	
}
