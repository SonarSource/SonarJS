export { analyze, type AnalyzeOptions } from './analyze.js';
export * from './definition/index.js';
export {
  PatternVisitor,
  type PatternVisitorCallback,
  type PatternVisitorOptions,
} from './referencer/PatternVisitor.js';
export { Reference } from './referencer/Reference.js';
export { Visitor } from './referencer/Visitor.js';
export * from './scope/index.js';
export { ScopeManager } from './ScopeManager.js';
export * from './variable/index.js';
