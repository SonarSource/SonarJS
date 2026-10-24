/** Fail benchmark validation if application/dependency imports escaped the
 * selected facade, even when a consumer caught the original boundary failure. */
export function assertCompilerRouting(gateway, compiler) {
  gateway.assertHealthy();
  const observations = gateway.observations();
  const own = observations.filter(item =>
    /\/(?:packages|lib)\/analysis\/src\//.test(item.importer),
  );
  const dependencies = observations.filter(item =>
    item.importer.includes('/node_modules/@typescript-eslint/'),
  );
  if (gateway.facade !== compiler || !own.length || !dependencies.length)
    throw new Error(
      `Missing shared compiler routing evidence: sameFacade=${gateway.facade === compiler}, application=${own.length}, typescript-eslint=${dependencies.length}`,
    );
  return {
    provider: gateway.provider,
    sameFacade: true,
    ownedImporters: own.length,
    typescriptEslintImporters: dependencies.length,
    observations,
  };
}
