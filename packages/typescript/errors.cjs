class TypeScriptFailure extends Error {
  constructor(code, message, operation) {
    super(message);
    this.name = 'TypeScriptFailure';
    this.code = code;
    this.operation = operation;
  }
}
module.exports = { TypeScriptFailure };
