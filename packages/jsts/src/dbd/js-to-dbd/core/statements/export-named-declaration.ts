import { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { handleIdentifier } from '../expressions/identifier';

export const handleExportNamedDeclaration: StatementHandler<TSESTree.ExportNamedDeclaration> = (
  node,
  functionInfo,
) => {
  if (node.declaration) {
    console.error(`Unsupported export named declaration with declaration`);
    return;
  } else {
    node.specifiers.forEach(specifier => {
      const localValue = handleIdentifier(specifier.local, functionInfo);
      const exportName = specifier.exported.name;
      functionInfo.addExport(exportName, localValue);
    });
  }
};
