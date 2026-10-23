import type { TSESTree } from '../../types/index.js';

import type { PatternVisitorCallback, PatternVisitorOptions } from './PatternVisitor.js';
import type { VisitorOptions } from './VisitorBase.js';

import { PatternVisitor } from './PatternVisitor.js';
import { VisitorBase } from './VisitorBase.js';

interface VisitPatternOptions extends PatternVisitorOptions {
  processRightHandNodes?: boolean;
}
export class Visitor extends VisitorBase {
  readonly #options: VisitorOptions;
  constructor(optionsOrVisitor: Visitor | VisitorOptions) {
    super(optionsOrVisitor instanceof Visitor ? optionsOrVisitor.#options : optionsOrVisitor);

    this.#options =
      optionsOrVisitor instanceof Visitor ? optionsOrVisitor.#options : optionsOrVisitor;
  }

  protected visitPattern(
    node: TSESTree.Node,
    callback: PatternVisitorCallback,
    options: VisitPatternOptions = { processRightHandNodes: false },
  ): void {
    // Call the callback at left hand identifier nodes, and Collect right hand nodes.
    const visitor = new PatternVisitor(this.#options, node, callback);

    visitor.visit(node);

    // Process the right hand nodes recursively.
    if (options.processRightHandNodes) {
      visitor.rightHandNodes.forEach(this.visit, this);
    }
  }
}

export { VisitorBase, type VisitorOptions } from './VisitorBase.js';
