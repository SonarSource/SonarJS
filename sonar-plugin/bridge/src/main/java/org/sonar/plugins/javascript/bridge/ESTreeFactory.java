package org.sonar.plugins.javascript.bridge;

import java.util.List;
import java.util.stream.Collectors;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;

public class ESTreeFactory {

  ESTree.Node from(Node node) {
    switch (node.getType()) {
      case ProgramType:
        return fromProgram(node);
      default:
        throw new IllegalArgumentException("Unsupported node type: " + node.getType());
    }
  }

  ESTree.Program fromProgram(Node node) {
    var program = node.getProgram();
    return new ESTree.Program(fromLocation(node.getLoc()), program.getSourceType(), from(program.getBodyList()));
  }

  private List<ESTree.Node> from(List<Node> bodyList) {
    return bodyList.stream().map(this::from).collect(Collectors.toList());
  }


  private static ESTree.Location fromLocation(SourceLocation location) {
    return new ESTree.Location(new ESTree.Position(location.getStart().getLine(), location.getStart().getEnd()),
        new ESTree.Position(location.getEnd().getLine(), location.getEnd().getEnd()));
  }

}
