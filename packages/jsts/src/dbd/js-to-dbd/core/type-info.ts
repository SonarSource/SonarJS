export type TypeInfo_Kind = 'primitive' | 'PRIMITIVE' | 'ARRAY' | 0;

export type TypeInfo = {
  kind: TypeInfo_Kind;
  qualifiedName: string;
  hasIncompleteSemantics: boolean;
};

export const createTypeInfo = (
  kind: TypeInfo_Kind,
  qualifiedName: string,
  hasIncompleteSemantics: boolean,
): TypeInfo => {
  return {
    kind,
    qualifiedName,
    hasIncompleteSemantics,
  };
};
