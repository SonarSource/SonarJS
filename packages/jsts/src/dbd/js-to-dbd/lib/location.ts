export type Position = {
  /**
   * Line number (1-indexed)
   */
  line: number;
  /**
   * Column number on the line (0-indexed)
   */
  column: number;
};

export type Location = {
  readonly start: Position;
  readonly end: Position;
};