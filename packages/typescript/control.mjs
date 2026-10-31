import control from './control.cjs';
export const {
  TypeScriptFailure,
  installCompilerGateway,
  getCompilerGateway,
  initializeCompiler,
  getCompilerInfo,
  configureCompilerInstrumentation,
  getProgramInstrumentation,
  compilerOptionsToJson,
  prepareProgramRequest,
  finishProgramRequest,
  clearProgramCache,
  getProgramFileNames,
  getProjectCache,
  getCompilerCachePolicy,
} = control;
