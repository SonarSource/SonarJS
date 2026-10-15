import control from './control.cjs';
export const {
  TypeScriptFailure,
  installCompilerGateway,
  getCompilerGateway,
  initializeCompiler,
  getCompilerInfo,
  prepareProgramRequest,
  finishProgramRequest,
  clearProgramCache,
  getProgramFileNames,
  getProjectCache,
  getCompilerCachePolicy,
} = control;
