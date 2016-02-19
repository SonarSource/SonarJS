package org.sonar.plugins.javascript.api.visitors;

import com.google.common.collect.ImmutableList;
import org.junit.Test;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import static org.fest.assertions.Assertions.assertThat;

public class IssueLocationTest {

  @Test
  public void several_lines_token() throws Exception {
    String tokenValue = "\"first line\\\n" +
      "second\"";

    IssueLocation location = new IssueLocation(createToken(3, 2, tokenValue));
    assertThat(location.endLine()).isEqualTo(4);
    assertThat(location.endLineOffset()).isEqualTo(7);
  }

  private Tree createToken(int line, int column, String tokenValue) {
    return new InternalSyntaxToken(line, column, tokenValue, ImmutableList.<SyntaxTrivia>of(), 0, false);
  }

}
