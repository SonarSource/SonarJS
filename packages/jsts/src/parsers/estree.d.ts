import * as $protobuf from 'protobufjs';
import Long = require('long');
/** Namespace estree. */
export namespace estree {
  /** Properties of a SourceLocation. */
  interface ISourceLocation {
    /** SourceLocation source */
    source?: string | null;

    /** SourceLocation start */
    start?: estree.IPosition | null;

    /** SourceLocation end */
    end?: estree.IPosition | null;
  }

  /** Represents a SourceLocation. */
  class SourceLocation implements ISourceLocation {
    /**
     * Constructs a new SourceLocation.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISourceLocation);

    /** SourceLocation source. */
    public source: string;

    /** SourceLocation start. */
    public start?: estree.IPosition | null;

    /** SourceLocation end. */
    public end?: estree.IPosition | null;

    /**
     * Creates a new SourceLocation instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SourceLocation instance
     */
    public static create(properties?: estree.ISourceLocation): estree.SourceLocation;

    /**
     * Encodes the specified SourceLocation message. Does not implicitly {@link estree.SourceLocation.verify|verify} messages.
     * @param message SourceLocation message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ISourceLocation,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SourceLocation message, length delimited. Does not implicitly {@link estree.SourceLocation.verify|verify} messages.
     * @param message SourceLocation message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISourceLocation,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SourceLocation message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SourceLocation
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.SourceLocation;

    /**
     * Decodes a SourceLocation message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SourceLocation
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.SourceLocation;

    /**
     * Verifies a SourceLocation message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SourceLocation message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SourceLocation
     */
    public static fromObject(object: { [k: string]: any }): estree.SourceLocation;

    /**
     * Creates a plain object from a SourceLocation message. Also converts values to other types if specified.
     * @param message SourceLocation
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.SourceLocation,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SourceLocation to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SourceLocation
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a Position. */
  interface IPosition {
    /** Position line */
    line?: number | null;

    /** Position column */
    column?: number | null;
  }

  /** Represents a Position. */
  class Position implements IPosition {
    /**
     * Constructs a new Position.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IPosition);

    /** Position line. */
    public line: number;

    /** Position column. */
    public column: number;

    /**
     * Creates a new Position instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Position instance
     */
    public static create(properties?: estree.IPosition): estree.Position;

    /**
     * Encodes the specified Position message. Does not implicitly {@link estree.Position.verify|verify} messages.
     * @param message Position message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IPosition, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Position message, length delimited. Does not implicitly {@link estree.Position.verify|verify} messages.
     * @param message Position message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IPosition,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Position message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Position
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Position;

    /**
     * Decodes a Position message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Position
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Position;

    /**
     * Verifies a Position message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Position message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Position
     */
    public static fromObject(object: { [k: string]: any }): estree.Position;

    /**
     * Creates a plain object from a Position message. Also converts values to other types if specified.
     * @param message Position
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Position,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Position to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Position
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** NodeType enum. */
  enum NodeType {
    ProgramType = 0,
    ExportAllDeclarationType = 1,
    IdentifierType = 2,
    ExportDefaultDeclarationType = 3,
    YieldExpressionType = 4,
    UpdateExpressionType = 5,
    UnaryExpressionType = 6,
    ThisExpressionType = 7,
    TemplateLiteralType = 8,
    TaggedTemplateExpressionType = 9,
    SequenceExpressionType = 10,
    ObjectExpressionType = 11,
    SpreadElementType = 12,
    PropertyType = 13,
    AssignmentPatternType = 14,
    RestElementType = 15,
    ArrayPatternType = 16,
    ObjectPatternType = 17,
    PrivateIdentifierType = 18,
    NewExpressionType = 19,
    SuperType = 20,
    MetaPropertyType = 21,
    MemberExpressionType = 22,
    LogicalExpressionType = 23,
    ImportExpressionType = 24,
    BlockStatementType = 25,
    ConditionalExpressionType = 26,
    ClassExpressionType = 27,
    ClassBodyType = 28,
    StaticBlockType = 29,
    PropertyDefinitionType = 30,
    MethodDefinitionType = 31,
    ChainExpressionType = 32,
    CallExpressionType = 33,
    BinaryExpressionType = 34,
    AwaitExpressionType = 35,
    AssignmentExpressionType = 36,
    ArrowFunctionExpressionType = 37,
    ArrayExpressionType = 38,
    ClassDeclarationType = 39,
    FunctionDeclarationType = 40,
    ExportNamedDeclarationType = 41,
    ExportSpecifierType = 42,
    VariableDeclarationType = 43,
    VariableDeclaratorType = 44,
    ImportDeclarationType = 45,
    ImportNamespaceSpecifierType = 46,
    ImportDefaultSpecifierType = 47,
    ImportSpecifierType = 48,
    ForOfStatementType = 49,
    ForInStatementType = 50,
    ForStatementType = 51,
    DoWhileStatementType = 52,
    WhileStatementType = 53,
    TryStatementType = 54,
    CatchClauseType = 55,
    ThrowStatementType = 56,
    SwitchStatementType = 57,
    SwitchCaseType = 58,
    IfStatementType = 59,
    ContinueStatementType = 60,
    BreakStatementType = 61,
    LabeledStatementType = 62,
    ReturnStatementType = 63,
    WithStatementType = 64,
    DebuggerStatementType = 65,
    EmptyStatementType = 66,
    ExpressionStatementType = 67,
    LiteralType = 68,
    TemplateElementType = 69,
    FunctionExpressionType = 70,
    TSExportAssignmentType = 71,
    TSImportEqualsDeclarationType = 72,
    TSQualifiedNameType = 73,
    TSExternalModuleReferenceType = 74,
    TSModuleBlockType = 75,
    TSModuleDeclarationType = 76,
    TSParameterPropertyType = 77,
    TSTypeAliasDeclarationType = 78,
    TSInterfaceDeclarationType = 79,
    TSEmptyBodyFunctionExpressionType = 80,
    TSEnumDeclarationType = 81,
    TSDeclareFunctionType = 82,
    TSAbstractMethodDefinitionType = 83,
    TSTypeParameterInstantiationType = 84,
    JSXFragmentType = 85,
    JSXOpeningElementType = 86,
    JSXClosingElementType = 87,
    JSXOpeningFragmentType = 88,
    JSXClosingFragmentType = 89,
    JSXAttributeType = 90,
    JSXIdentifierType = 91,
    JSXMemberExpressionType = 92,
    JSXNamespacedNameType = 93,
    JSXSpreadAttributeType = 94,
    JSXExpressionContainerType = 95,
    JSXSpreadChildType = 96,
    JSXTextType = 97,
    JSXEmptyExpressionType = 98,
    JSXElementType = 99,
    UnknownNodeType = 1000,
  }

  /** Properties of a Node. */
  interface INode {
    /** Node type */
    type?: estree.NodeType | null;

    /** Node loc */
    loc?: estree.ISourceLocation | null;

    /** Node program */
    program?: estree.IProgram | null;

    /** Node exportAllDeclaration */
    exportAllDeclaration?: estree.IExportAllDeclaration | null;

    /** Node identifier */
    identifier?: estree.IIdentifier | null;

    /** Node exportDefaultDeclaration */
    exportDefaultDeclaration?: estree.IExportDefaultDeclaration | null;

    /** Node yieldExpression */
    yieldExpression?: estree.IYieldExpression | null;

    /** Node updateExpression */
    updateExpression?: estree.IUpdateExpression | null;

    /** Node unaryExpression */
    unaryExpression?: estree.IUnaryExpression | null;

    /** Node thisExpression */
    thisExpression?: estree.IThisExpression | null;

    /** Node templateLiteral */
    templateLiteral?: estree.ITemplateLiteral | null;

    /** Node taggedTemplateExpression */
    taggedTemplateExpression?: estree.ITaggedTemplateExpression | null;

    /** Node sequenceExpression */
    sequenceExpression?: estree.ISequenceExpression | null;

    /** Node objectExpression */
    objectExpression?: estree.IObjectExpression | null;

    /** Node spreadElement */
    spreadElement?: estree.ISpreadElement | null;

    /** Node property */
    property?: estree.IProperty | null;

    /** Node assignmentPattern */
    assignmentPattern?: estree.IAssignmentPattern | null;

    /** Node restElement */
    restElement?: estree.IRestElement | null;

    /** Node arrayPattern */
    arrayPattern?: estree.IArrayPattern | null;

    /** Node objectPattern */
    objectPattern?: estree.IObjectPattern | null;

    /** Node privateIdentifier */
    privateIdentifier?: estree.IPrivateIdentifier | null;

    /** Node newExpression */
    newExpression?: estree.INewExpression | null;

    /** Node super */
    super?: estree.ISuper | null;

    /** Node metaProperty */
    metaProperty?: estree.IMetaProperty | null;

    /** Node memberExpression */
    memberExpression?: estree.IMemberExpression | null;

    /** Node logicalExpression */
    logicalExpression?: estree.ILogicalExpression | null;

    /** Node importExpression */
    importExpression?: estree.IImportExpression | null;

    /** Node blockStatement */
    blockStatement?: estree.IBlockStatement | null;

    /** Node conditionalExpression */
    conditionalExpression?: estree.IConditionalExpression | null;

    /** Node classExpression */
    classExpression?: estree.IClassExpression | null;

    /** Node classBody */
    classBody?: estree.IClassBody | null;

    /** Node staticBlock */
    staticBlock?: estree.IStaticBlock | null;

    /** Node propertyDefinition */
    propertyDefinition?: estree.IPropertyDefinition | null;

    /** Node methodDefinition */
    methodDefinition?: estree.IMethodDefinition | null;

    /** Node chainExpression */
    chainExpression?: estree.IChainExpression | null;

    /** Node callExpression */
    callExpression?: estree.ICallExpression | null;

    /** Node binaryExpression */
    binaryExpression?: estree.IBinaryExpression | null;

    /** Node awaitExpression */
    awaitExpression?: estree.IAwaitExpression | null;

    /** Node assignmentExpression */
    assignmentExpression?: estree.IAssignmentExpression | null;

    /** Node arrowFunctionExpression */
    arrowFunctionExpression?: estree.IArrowFunctionExpression | null;

    /** Node arrayExpression */
    arrayExpression?: estree.IArrayExpression | null;

    /** Node classDeclaration */
    classDeclaration?: estree.IClassDeclaration | null;

    /** Node functionDeclaration */
    functionDeclaration?: estree.IFunctionDeclaration | null;

    /** Node exportNamedDeclaration */
    exportNamedDeclaration?: estree.IExportNamedDeclaration | null;

    /** Node exportSpecifier */
    exportSpecifier?: estree.IExportSpecifier | null;

    /** Node variableDeclaration */
    variableDeclaration?: estree.IVariableDeclaration | null;

    /** Node variableDeclarator */
    variableDeclarator?: estree.IVariableDeclarator | null;

    /** Node importDeclaration */
    importDeclaration?: estree.IImportDeclaration | null;

    /** Node importNamespaceSpecifier */
    importNamespaceSpecifier?: estree.IImportNamespaceSpecifier | null;

    /** Node importDefaultSpecifier */
    importDefaultSpecifier?: estree.IImportDefaultSpecifier | null;

    /** Node importSpecifier */
    importSpecifier?: estree.IImportSpecifier | null;

    /** Node forOfStatement */
    forOfStatement?: estree.IForOfStatement | null;

    /** Node forInStatement */
    forInStatement?: estree.IForInStatement | null;

    /** Node forStatement */
    forStatement?: estree.IForStatement | null;

    /** Node doWhileStatement */
    doWhileStatement?: estree.IDoWhileStatement | null;

    /** Node whileStatement */
    whileStatement?: estree.IWhileStatement | null;

    /** Node tryStatement */
    tryStatement?: estree.ITryStatement | null;

    /** Node catchClause */
    catchClause?: estree.ICatchClause | null;

    /** Node throwStatement */
    throwStatement?: estree.IThrowStatement | null;

    /** Node switchStatement */
    switchStatement?: estree.ISwitchStatement | null;

    /** Node switchCase */
    switchCase?: estree.ISwitchCase | null;

    /** Node ifStatement */
    ifStatement?: estree.IIfStatement | null;

    /** Node continueStatement */
    continueStatement?: estree.IContinueStatement | null;

    /** Node breakStatement */
    breakStatement?: estree.IBreakStatement | null;

    /** Node labeledStatement */
    labeledStatement?: estree.ILabeledStatement | null;

    /** Node returnStatement */
    returnStatement?: estree.IReturnStatement | null;

    /** Node withStatement */
    withStatement?: estree.IWithStatement | null;

    /** Node debuggerStatement */
    debuggerStatement?: estree.IDebuggerStatement | null;

    /** Node emptyStatement */
    emptyStatement?: estree.IEmptyStatement | null;

    /** Node expressionStatement */
    expressionStatement?: estree.IExpressionStatement | null;

    /** Node literal */
    literal?: estree.ILiteral | null;

    /** Node templateElement */
    templateElement?: estree.ITemplateElement | null;

    /** Node functionExpression */
    functionExpression?: estree.IFunctionExpression | null;

    /** Node exportAssignment */
    exportAssignment?: estree.IExportAssignment | null;

    /** Node tSImportEqualsDeclaration */
    tSImportEqualsDeclaration?: estree.ITSImportEqualsDeclaration | null;

    /** Node tSQualifiedName */
    tSQualifiedName?: estree.ITSQualifiedName | null;

    /** Node tSExternalModuleReference */
    tSExternalModuleReference?: estree.ITSExternalModuleReference | null;

    /** Node tSModuleBlock */
    tSModuleBlock?: estree.ITSModuleBlock | null;

    /** Node tSModuleDeclaration */
    tSModuleDeclaration?: estree.ITSModuleDeclaration | null;

    /** Node tSParameterProperty */
    tSParameterProperty?: estree.ITSParameterProperty | null;

    /** Node jSXElement */
    jSXElement?: estree.IJSXElement | null;

    /** Node jSXFragment */
    jSXFragment?: estree.IJSXFragment | null;

    /** Node jSXOpeningElement */
    jSXOpeningElement?: estree.IJSXOpeningElement | null;

    /** Node jSXClosingElement */
    jSXClosingElement?: estree.IJSXClosingElement | null;

    /** Node jSXOpeningFragment */
    jSXOpeningFragment?: estree.IJSXOpeningFragment | null;

    /** Node jSXClosingFragment */
    jSXClosingFragment?: estree.IJSXClosingFragment | null;

    /** Node jSXAttribute */
    jSXAttribute?: estree.IJSXAttribute | null;

    /** Node jSXIdentifier */
    jSXIdentifier?: estree.IJSXIdentifier | null;

    /** Node jSXMemberExpression */
    jSXMemberExpression?: estree.IJSXMemberExpression | null;

    /** Node jSXNamespacedName */
    jSXNamespacedName?: estree.IJSXNamespacedName | null;

    /** Node jSXSpreadAttribute */
    jSXSpreadAttribute?: estree.IJSXSpreadAttribute | null;

    /** Node jSXExpressionContainer */
    jSXExpressionContainer?: estree.IJSXExpressionContainer | null;

    /** Node jSXSpreadChild */
    jSXSpreadChild?: estree.IJSXSpreadChild | null;

    /** Node jSXText */
    jSXText?: estree.IJSXText | null;

    /** Node jSXEmptyExpression */
    jSXEmptyExpression?: estree.IJSXEmptyExpression | null;

    /** Node unknownNode */
    unknownNode?: estree.IUnknownNode | null;
  }

  /** Represents a Node. */
  class Node implements INode {
    /**
     * Constructs a new Node.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.INode);

    /** Node type. */
    public type: estree.NodeType;

    /** Node loc. */
    public loc?: estree.ISourceLocation | null;

    /** Node program. */
    public program?: estree.IProgram | null;

    /** Node exportAllDeclaration. */
    public exportAllDeclaration?: estree.IExportAllDeclaration | null;

    /** Node identifier. */
    public identifier?: estree.IIdentifier | null;

    /** Node exportDefaultDeclaration. */
    public exportDefaultDeclaration?: estree.IExportDefaultDeclaration | null;

    /** Node yieldExpression. */
    public yieldExpression?: estree.IYieldExpression | null;

    /** Node updateExpression. */
    public updateExpression?: estree.IUpdateExpression | null;

    /** Node unaryExpression. */
    public unaryExpression?: estree.IUnaryExpression | null;

    /** Node thisExpression. */
    public thisExpression?: estree.IThisExpression | null;

    /** Node templateLiteral. */
    public templateLiteral?: estree.ITemplateLiteral | null;

    /** Node taggedTemplateExpression. */
    public taggedTemplateExpression?: estree.ITaggedTemplateExpression | null;

    /** Node sequenceExpression. */
    public sequenceExpression?: estree.ISequenceExpression | null;

    /** Node objectExpression. */
    public objectExpression?: estree.IObjectExpression | null;

    /** Node spreadElement. */
    public spreadElement?: estree.ISpreadElement | null;

    /** Node property. */
    public property?: estree.IProperty | null;

    /** Node assignmentPattern. */
    public assignmentPattern?: estree.IAssignmentPattern | null;

    /** Node restElement. */
    public restElement?: estree.IRestElement | null;

    /** Node arrayPattern. */
    public arrayPattern?: estree.IArrayPattern | null;

    /** Node objectPattern. */
    public objectPattern?: estree.IObjectPattern | null;

    /** Node privateIdentifier. */
    public privateIdentifier?: estree.IPrivateIdentifier | null;

    /** Node newExpression. */
    public newExpression?: estree.INewExpression | null;

    /** Node super. */
    public super?: estree.ISuper | null;

    /** Node metaProperty. */
    public metaProperty?: estree.IMetaProperty | null;

    /** Node memberExpression. */
    public memberExpression?: estree.IMemberExpression | null;

    /** Node logicalExpression. */
    public logicalExpression?: estree.ILogicalExpression | null;

    /** Node importExpression. */
    public importExpression?: estree.IImportExpression | null;

    /** Node blockStatement. */
    public blockStatement?: estree.IBlockStatement | null;

    /** Node conditionalExpression. */
    public conditionalExpression?: estree.IConditionalExpression | null;

    /** Node classExpression. */
    public classExpression?: estree.IClassExpression | null;

    /** Node classBody. */
    public classBody?: estree.IClassBody | null;

    /** Node staticBlock. */
    public staticBlock?: estree.IStaticBlock | null;

    /** Node propertyDefinition. */
    public propertyDefinition?: estree.IPropertyDefinition | null;

    /** Node methodDefinition. */
    public methodDefinition?: estree.IMethodDefinition | null;

    /** Node chainExpression. */
    public chainExpression?: estree.IChainExpression | null;

    /** Node callExpression. */
    public callExpression?: estree.ICallExpression | null;

    /** Node binaryExpression. */
    public binaryExpression?: estree.IBinaryExpression | null;

    /** Node awaitExpression. */
    public awaitExpression?: estree.IAwaitExpression | null;

    /** Node assignmentExpression. */
    public assignmentExpression?: estree.IAssignmentExpression | null;

    /** Node arrowFunctionExpression. */
    public arrowFunctionExpression?: estree.IArrowFunctionExpression | null;

    /** Node arrayExpression. */
    public arrayExpression?: estree.IArrayExpression | null;

    /** Node classDeclaration. */
    public classDeclaration?: estree.IClassDeclaration | null;

    /** Node functionDeclaration. */
    public functionDeclaration?: estree.IFunctionDeclaration | null;

    /** Node exportNamedDeclaration. */
    public exportNamedDeclaration?: estree.IExportNamedDeclaration | null;

    /** Node exportSpecifier. */
    public exportSpecifier?: estree.IExportSpecifier | null;

    /** Node variableDeclaration. */
    public variableDeclaration?: estree.IVariableDeclaration | null;

    /** Node variableDeclarator. */
    public variableDeclarator?: estree.IVariableDeclarator | null;

    /** Node importDeclaration. */
    public importDeclaration?: estree.IImportDeclaration | null;

    /** Node importNamespaceSpecifier. */
    public importNamespaceSpecifier?: estree.IImportNamespaceSpecifier | null;

    /** Node importDefaultSpecifier. */
    public importDefaultSpecifier?: estree.IImportDefaultSpecifier | null;

    /** Node importSpecifier. */
    public importSpecifier?: estree.IImportSpecifier | null;

    /** Node forOfStatement. */
    public forOfStatement?: estree.IForOfStatement | null;

    /** Node forInStatement. */
    public forInStatement?: estree.IForInStatement | null;

    /** Node forStatement. */
    public forStatement?: estree.IForStatement | null;

    /** Node doWhileStatement. */
    public doWhileStatement?: estree.IDoWhileStatement | null;

    /** Node whileStatement. */
    public whileStatement?: estree.IWhileStatement | null;

    /** Node tryStatement. */
    public tryStatement?: estree.ITryStatement | null;

    /** Node catchClause. */
    public catchClause?: estree.ICatchClause | null;

    /** Node throwStatement. */
    public throwStatement?: estree.IThrowStatement | null;

    /** Node switchStatement. */
    public switchStatement?: estree.ISwitchStatement | null;

    /** Node switchCase. */
    public switchCase?: estree.ISwitchCase | null;

    /** Node ifStatement. */
    public ifStatement?: estree.IIfStatement | null;

    /** Node continueStatement. */
    public continueStatement?: estree.IContinueStatement | null;

    /** Node breakStatement. */
    public breakStatement?: estree.IBreakStatement | null;

    /** Node labeledStatement. */
    public labeledStatement?: estree.ILabeledStatement | null;

    /** Node returnStatement. */
    public returnStatement?: estree.IReturnStatement | null;

    /** Node withStatement. */
    public withStatement?: estree.IWithStatement | null;

    /** Node debuggerStatement. */
    public debuggerStatement?: estree.IDebuggerStatement | null;

    /** Node emptyStatement. */
    public emptyStatement?: estree.IEmptyStatement | null;

    /** Node expressionStatement. */
    public expressionStatement?: estree.IExpressionStatement | null;

    /** Node literal. */
    public literal?: estree.ILiteral | null;

    /** Node templateElement. */
    public templateElement?: estree.ITemplateElement | null;

    /** Node functionExpression. */
    public functionExpression?: estree.IFunctionExpression | null;

    /** Node exportAssignment. */
    public exportAssignment?: estree.IExportAssignment | null;

    /** Node tSImportEqualsDeclaration. */
    public tSImportEqualsDeclaration?: estree.ITSImportEqualsDeclaration | null;

    /** Node tSQualifiedName. */
    public tSQualifiedName?: estree.ITSQualifiedName | null;

    /** Node tSExternalModuleReference. */
    public tSExternalModuleReference?: estree.ITSExternalModuleReference | null;

    /** Node tSModuleBlock. */
    public tSModuleBlock?: estree.ITSModuleBlock | null;

    /** Node tSModuleDeclaration. */
    public tSModuleDeclaration?: estree.ITSModuleDeclaration | null;

    /** Node tSParameterProperty. */
    public tSParameterProperty?: estree.ITSParameterProperty | null;

    /** Node jSXElement. */
    public jSXElement?: estree.IJSXElement | null;

    /** Node jSXFragment. */
    public jSXFragment?: estree.IJSXFragment | null;

    /** Node jSXOpeningElement. */
    public jSXOpeningElement?: estree.IJSXOpeningElement | null;

    /** Node jSXClosingElement. */
    public jSXClosingElement?: estree.IJSXClosingElement | null;

    /** Node jSXOpeningFragment. */
    public jSXOpeningFragment?: estree.IJSXOpeningFragment | null;

    /** Node jSXClosingFragment. */
    public jSXClosingFragment?: estree.IJSXClosingFragment | null;

    /** Node jSXAttribute. */
    public jSXAttribute?: estree.IJSXAttribute | null;

    /** Node jSXIdentifier. */
    public jSXIdentifier?: estree.IJSXIdentifier | null;

    /** Node jSXMemberExpression. */
    public jSXMemberExpression?: estree.IJSXMemberExpression | null;

    /** Node jSXNamespacedName. */
    public jSXNamespacedName?: estree.IJSXNamespacedName | null;

    /** Node jSXSpreadAttribute. */
    public jSXSpreadAttribute?: estree.IJSXSpreadAttribute | null;

    /** Node jSXExpressionContainer. */
    public jSXExpressionContainer?: estree.IJSXExpressionContainer | null;

    /** Node jSXSpreadChild. */
    public jSXSpreadChild?: estree.IJSXSpreadChild | null;

    /** Node jSXText. */
    public jSXText?: estree.IJSXText | null;

    /** Node jSXEmptyExpression. */
    public jSXEmptyExpression?: estree.IJSXEmptyExpression | null;

    /** Node unknownNode. */
    public unknownNode?: estree.IUnknownNode | null;

    /** Node node. */
    public node?:
      | 'program'
      | 'exportAllDeclaration'
      | 'identifier'
      | 'exportDefaultDeclaration'
      | 'yieldExpression'
      | 'updateExpression'
      | 'unaryExpression'
      | 'thisExpression'
      | 'templateLiteral'
      | 'taggedTemplateExpression'
      | 'sequenceExpression'
      | 'objectExpression'
      | 'spreadElement'
      | 'property'
      | 'assignmentPattern'
      | 'restElement'
      | 'arrayPattern'
      | 'objectPattern'
      | 'privateIdentifier'
      | 'newExpression'
      | 'super'
      | 'metaProperty'
      | 'memberExpression'
      | 'logicalExpression'
      | 'importExpression'
      | 'blockStatement'
      | 'conditionalExpression'
      | 'classExpression'
      | 'classBody'
      | 'staticBlock'
      | 'propertyDefinition'
      | 'methodDefinition'
      | 'chainExpression'
      | 'callExpression'
      | 'binaryExpression'
      | 'awaitExpression'
      | 'assignmentExpression'
      | 'arrowFunctionExpression'
      | 'arrayExpression'
      | 'classDeclaration'
      | 'functionDeclaration'
      | 'exportNamedDeclaration'
      | 'exportSpecifier'
      | 'variableDeclaration'
      | 'variableDeclarator'
      | 'importDeclaration'
      | 'importNamespaceSpecifier'
      | 'importDefaultSpecifier'
      | 'importSpecifier'
      | 'forOfStatement'
      | 'forInStatement'
      | 'forStatement'
      | 'doWhileStatement'
      | 'whileStatement'
      | 'tryStatement'
      | 'catchClause'
      | 'throwStatement'
      | 'switchStatement'
      | 'switchCase'
      | 'ifStatement'
      | 'continueStatement'
      | 'breakStatement'
      | 'labeledStatement'
      | 'returnStatement'
      | 'withStatement'
      | 'debuggerStatement'
      | 'emptyStatement'
      | 'expressionStatement'
      | 'literal'
      | 'templateElement'
      | 'functionExpression'
      | 'exportAssignment'
      | 'tSImportEqualsDeclaration'
      | 'tSQualifiedName'
      | 'tSExternalModuleReference'
      | 'tSModuleBlock'
      | 'tSModuleDeclaration'
      | 'tSParameterProperty'
      | 'jSXElement'
      | 'jSXFragment'
      | 'jSXOpeningElement'
      | 'jSXClosingElement'
      | 'jSXOpeningFragment'
      | 'jSXClosingFragment'
      | 'jSXAttribute'
      | 'jSXIdentifier'
      | 'jSXMemberExpression'
      | 'jSXNamespacedName'
      | 'jSXSpreadAttribute'
      | 'jSXExpressionContainer'
      | 'jSXSpreadChild'
      | 'jSXText'
      | 'jSXEmptyExpression'
      | 'unknownNode';

    /**
     * Creates a new Node instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Node instance
     */
    public static create(properties?: estree.INode): estree.Node;

    /**
     * Encodes the specified Node message. Does not implicitly {@link estree.Node.verify|verify} messages.
     * @param message Node message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.INode, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Node message, length delimited. Does not implicitly {@link estree.Node.verify|verify} messages.
     * @param message Node message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.INode,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Node message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Node
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Node;

    /**
     * Decodes a Node message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Node
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Node;

    /**
     * Verifies a Node message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Node message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Node
     */
    public static fromObject(object: { [k: string]: any }): estree.Node;

    /**
     * Creates a plain object from a Node message. Also converts values to other types if specified.
     * @param message Node
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Node,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Node to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Node
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a Program. */
  interface IProgram {
    /** Program sourceType */
    sourceType?: string | null;

    /** Program body */
    body?: estree.INode[] | null;
  }

  /** Represents a Program. */
  class Program implements IProgram {
    /**
     * Constructs a new Program.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IProgram);

    /** Program sourceType. */
    public sourceType: string;

    /** Program body. */
    public body: estree.INode[];

    /**
     * Creates a new Program instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Program instance
     */
    public static create(properties?: estree.IProgram): estree.Program;

    /**
     * Encodes the specified Program message. Does not implicitly {@link estree.Program.verify|verify} messages.
     * @param message Program message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IProgram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Program message, length delimited. Does not implicitly {@link estree.Program.verify|verify} messages.
     * @param message Program message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IProgram,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Program message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Program
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Program;

    /**
     * Decodes a Program message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Program
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Program;

    /**
     * Verifies a Program message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Program message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Program
     */
    public static fromObject(object: { [k: string]: any }): estree.Program;

    /**
     * Creates a plain object from a Program message. Also converts values to other types if specified.
     * @param message Program
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Program,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Program to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Program
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExportAllDeclaration. */
  interface IExportAllDeclaration {
    /** ExportAllDeclaration exported */
    exported?: estree.INode | null;

    /** ExportAllDeclaration source */
    source?: estree.INode | null;
  }

  /** Represents an ExportAllDeclaration. */
  class ExportAllDeclaration implements IExportAllDeclaration {
    /**
     * Constructs a new ExportAllDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExportAllDeclaration);

    /** ExportAllDeclaration exported. */
    public exported?: estree.INode | null;

    /** ExportAllDeclaration source. */
    public source?: estree.INode | null;

    /**
     * Creates a new ExportAllDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExportAllDeclaration instance
     */
    public static create(properties?: estree.IExportAllDeclaration): estree.ExportAllDeclaration;

    /**
     * Encodes the specified ExportAllDeclaration message. Does not implicitly {@link estree.ExportAllDeclaration.verify|verify} messages.
     * @param message ExportAllDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExportAllDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExportAllDeclaration message, length delimited. Does not implicitly {@link estree.ExportAllDeclaration.verify|verify} messages.
     * @param message ExportAllDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExportAllDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExportAllDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExportAllDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExportAllDeclaration;

    /**
     * Decodes an ExportAllDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExportAllDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ExportAllDeclaration;

    /**
     * Verifies an ExportAllDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExportAllDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExportAllDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.ExportAllDeclaration;

    /**
     * Creates a plain object from an ExportAllDeclaration message. Also converts values to other types if specified.
     * @param message ExportAllDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExportAllDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExportAllDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExportAllDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a Literal. */
  interface ILiteral {
    /** Literal raw */
    raw?: string | null;

    /** Literal bigint */
    bigint?: string | null;

    /** Literal pattern */
    pattern?: string | null;

    /** Literal flags */
    flags?: string | null;

    /** Literal valueString */
    valueString?: string | null;

    /** Literal valueBoolean */
    valueBoolean?: boolean | null;

    /** Literal valueNumber */
    valueNumber?: number | null;
  }

  /** Represents a Literal. */
  class Literal implements ILiteral {
    /**
     * Constructs a new Literal.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ILiteral);

    /** Literal raw. */
    public raw: string;

    /** Literal bigint. */
    public bigint?: string | null;

    /** Literal pattern. */
    public pattern?: string | null;

    /** Literal flags. */
    public flags?: string | null;

    /** Literal valueString. */
    public valueString?: string | null;

    /** Literal valueBoolean. */
    public valueBoolean?: boolean | null;

    /** Literal valueNumber. */
    public valueNumber?: number | null;

    /** Literal value. */
    public value?: 'valueString' | 'valueBoolean' | 'valueNumber';

    /**
     * Creates a new Literal instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Literal instance
     */
    public static create(properties?: estree.ILiteral): estree.Literal;

    /**
     * Encodes the specified Literal message. Does not implicitly {@link estree.Literal.verify|verify} messages.
     * @param message Literal message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.ILiteral, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Literal message, length delimited. Does not implicitly {@link estree.Literal.verify|verify} messages.
     * @param message Literal message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ILiteral,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Literal message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Literal
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Literal;

    /**
     * Decodes a Literal message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Literal
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Literal;

    /**
     * Verifies a Literal message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Literal message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Literal
     */
    public static fromObject(object: { [k: string]: any }): estree.Literal;

    /**
     * Creates a plain object from a Literal message. Also converts values to other types if specified.
     * @param message Literal
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Literal,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Literal to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Literal
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an Identifier. */
  interface IIdentifier {
    /** Identifier name */
    name?: string | null;
  }

  /** Represents an Identifier. */
  class Identifier implements IIdentifier {
    /**
     * Constructs a new Identifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IIdentifier);

    /** Identifier name. */
    public name: string;

    /**
     * Creates a new Identifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Identifier instance
     */
    public static create(properties?: estree.IIdentifier): estree.Identifier;

    /**
     * Encodes the specified Identifier message. Does not implicitly {@link estree.Identifier.verify|verify} messages.
     * @param message Identifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IIdentifier, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Identifier message, length delimited. Does not implicitly {@link estree.Identifier.verify|verify} messages.
     * @param message Identifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IIdentifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an Identifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Identifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Identifier;

    /**
     * Decodes an Identifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Identifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Identifier;

    /**
     * Verifies an Identifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an Identifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Identifier
     */
    public static fromObject(object: { [k: string]: any }): estree.Identifier;

    /**
     * Creates a plain object from an Identifier message. Also converts values to other types if specified.
     * @param message Identifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Identifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Identifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Identifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExportDefaultDeclaration. */
  interface IExportDefaultDeclaration {
    /** ExportDefaultDeclaration declaration */
    declaration?: estree.INode | null;
  }

  /** Represents an ExportDefaultDeclaration. */
  class ExportDefaultDeclaration implements IExportDefaultDeclaration {
    /**
     * Constructs a new ExportDefaultDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExportDefaultDeclaration);

    /** ExportDefaultDeclaration declaration. */
    public declaration?: estree.INode | null;

    /**
     * Creates a new ExportDefaultDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExportDefaultDeclaration instance
     */
    public static create(
      properties?: estree.IExportDefaultDeclaration,
    ): estree.ExportDefaultDeclaration;

    /**
     * Encodes the specified ExportDefaultDeclaration message. Does not implicitly {@link estree.ExportDefaultDeclaration.verify|verify} messages.
     * @param message ExportDefaultDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExportDefaultDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExportDefaultDeclaration message, length delimited. Does not implicitly {@link estree.ExportDefaultDeclaration.verify|verify} messages.
     * @param message ExportDefaultDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExportDefaultDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExportDefaultDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExportDefaultDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExportDefaultDeclaration;

    /**
     * Decodes an ExportDefaultDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExportDefaultDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ExportDefaultDeclaration;

    /**
     * Verifies an ExportDefaultDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExportDefaultDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExportDefaultDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.ExportDefaultDeclaration;

    /**
     * Creates a plain object from an ExportDefaultDeclaration message. Also converts values to other types if specified.
     * @param message ExportDefaultDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExportDefaultDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExportDefaultDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExportDefaultDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a YieldExpression. */
  interface IYieldExpression {
    /** YieldExpression argument */
    argument?: estree.INode | null;

    /** YieldExpression delegate */
    delegate?: boolean | null;
  }

  /** Represents a YieldExpression. */
  class YieldExpression implements IYieldExpression {
    /**
     * Constructs a new YieldExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IYieldExpression);

    /** YieldExpression argument. */
    public argument?: estree.INode | null;

    /** YieldExpression delegate. */
    public delegate: boolean;

    /**
     * Creates a new YieldExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns YieldExpression instance
     */
    public static create(properties?: estree.IYieldExpression): estree.YieldExpression;

    /**
     * Encodes the specified YieldExpression message. Does not implicitly {@link estree.YieldExpression.verify|verify} messages.
     * @param message YieldExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IYieldExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified YieldExpression message, length delimited. Does not implicitly {@link estree.YieldExpression.verify|verify} messages.
     * @param message YieldExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IYieldExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a YieldExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns YieldExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.YieldExpression;

    /**
     * Decodes a YieldExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns YieldExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.YieldExpression;

    /**
     * Verifies a YieldExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a YieldExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns YieldExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.YieldExpression;

    /**
     * Creates a plain object from a YieldExpression message. Also converts values to other types if specified.
     * @param message YieldExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.YieldExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this YieldExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for YieldExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an UpdateExpression. */
  interface IUpdateExpression {
    /** UpdateExpression operator */
    operator?: string | null;

    /** UpdateExpression argument */
    argument?: estree.INode | null;

    /** UpdateExpression prefix */
    prefix?: boolean | null;
  }

  /** Represents an UpdateExpression. */
  class UpdateExpression implements IUpdateExpression {
    /**
     * Constructs a new UpdateExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IUpdateExpression);

    /** UpdateExpression operator. */
    public operator: string;

    /** UpdateExpression argument. */
    public argument?: estree.INode | null;

    /** UpdateExpression prefix. */
    public prefix: boolean;

    /**
     * Creates a new UpdateExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UpdateExpression instance
     */
    public static create(properties?: estree.IUpdateExpression): estree.UpdateExpression;

    /**
     * Encodes the specified UpdateExpression message. Does not implicitly {@link estree.UpdateExpression.verify|verify} messages.
     * @param message UpdateExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IUpdateExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified UpdateExpression message, length delimited. Does not implicitly {@link estree.UpdateExpression.verify|verify} messages.
     * @param message UpdateExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IUpdateExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an UpdateExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UpdateExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.UpdateExpression;

    /**
     * Decodes an UpdateExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UpdateExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.UpdateExpression;

    /**
     * Verifies an UpdateExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an UpdateExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UpdateExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.UpdateExpression;

    /**
     * Creates a plain object from an UpdateExpression message. Also converts values to other types if specified.
     * @param message UpdateExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.UpdateExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this UpdateExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UpdateExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an UnaryExpression. */
  interface IUnaryExpression {
    /** UnaryExpression operator */
    operator?: string | null;

    /** UnaryExpression prefix */
    prefix?: boolean | null;

    /** UnaryExpression argument */
    argument?: estree.INode | null;
  }

  /** Represents an UnaryExpression. */
  class UnaryExpression implements IUnaryExpression {
    /**
     * Constructs a new UnaryExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IUnaryExpression);

    /** UnaryExpression operator. */
    public operator: string;

    /** UnaryExpression prefix. */
    public prefix: boolean;

    /** UnaryExpression argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new UnaryExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UnaryExpression instance
     */
    public static create(properties?: estree.IUnaryExpression): estree.UnaryExpression;

    /**
     * Encodes the specified UnaryExpression message. Does not implicitly {@link estree.UnaryExpression.verify|verify} messages.
     * @param message UnaryExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IUnaryExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified UnaryExpression message, length delimited. Does not implicitly {@link estree.UnaryExpression.verify|verify} messages.
     * @param message UnaryExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IUnaryExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an UnaryExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UnaryExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.UnaryExpression;

    /**
     * Decodes an UnaryExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UnaryExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.UnaryExpression;

    /**
     * Verifies an UnaryExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an UnaryExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UnaryExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.UnaryExpression;

    /**
     * Creates a plain object from an UnaryExpression message. Also converts values to other types if specified.
     * @param message UnaryExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.UnaryExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this UnaryExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UnaryExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ThisExpression. */
  interface IThisExpression {}

  /** Represents a ThisExpression. */
  class ThisExpression implements IThisExpression {
    /**
     * Constructs a new ThisExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IThisExpression);

    /**
     * Creates a new ThisExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ThisExpression instance
     */
    public static create(properties?: estree.IThisExpression): estree.ThisExpression;

    /**
     * Encodes the specified ThisExpression message. Does not implicitly {@link estree.ThisExpression.verify|verify} messages.
     * @param message ThisExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IThisExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ThisExpression message, length delimited. Does not implicitly {@link estree.ThisExpression.verify|verify} messages.
     * @param message ThisExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IThisExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ThisExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ThisExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ThisExpression;

    /**
     * Decodes a ThisExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ThisExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ThisExpression;

    /**
     * Verifies a ThisExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ThisExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ThisExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ThisExpression;

    /**
     * Creates a plain object from a ThisExpression message. Also converts values to other types if specified.
     * @param message ThisExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ThisExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ThisExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ThisExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TemplateLiteral. */
  interface ITemplateLiteral {
    /** TemplateLiteral quasis */
    quasis?: estree.INode[] | null;

    /** TemplateLiteral expressions */
    expressions?: estree.INode[] | null;
  }

  /** Represents a TemplateLiteral. */
  class TemplateLiteral implements ITemplateLiteral {
    /**
     * Constructs a new TemplateLiteral.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITemplateLiteral);

    /** TemplateLiteral quasis. */
    public quasis: estree.INode[];

    /** TemplateLiteral expressions. */
    public expressions: estree.INode[];

    /**
     * Creates a new TemplateLiteral instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TemplateLiteral instance
     */
    public static create(properties?: estree.ITemplateLiteral): estree.TemplateLiteral;

    /**
     * Encodes the specified TemplateLiteral message. Does not implicitly {@link estree.TemplateLiteral.verify|verify} messages.
     * @param message TemplateLiteral message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITemplateLiteral,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TemplateLiteral message, length delimited. Does not implicitly {@link estree.TemplateLiteral.verify|verify} messages.
     * @param message TemplateLiteral message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITemplateLiteral,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TemplateLiteral message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TemplateLiteral
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TemplateLiteral;

    /**
     * Decodes a TemplateLiteral message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TemplateLiteral
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.TemplateLiteral;

    /**
     * Verifies a TemplateLiteral message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TemplateLiteral message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TemplateLiteral
     */
    public static fromObject(object: { [k: string]: any }): estree.TemplateLiteral;

    /**
     * Creates a plain object from a TemplateLiteral message. Also converts values to other types if specified.
     * @param message TemplateLiteral
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TemplateLiteral,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TemplateLiteral to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TemplateLiteral
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TaggedTemplateExpression. */
  interface ITaggedTemplateExpression {
    /** TaggedTemplateExpression tag */
    tag?: estree.INode | null;

    /** TaggedTemplateExpression quasi */
    quasi?: estree.INode | null;
  }

  /** Represents a TaggedTemplateExpression. */
  class TaggedTemplateExpression implements ITaggedTemplateExpression {
    /**
     * Constructs a new TaggedTemplateExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITaggedTemplateExpression);

    /** TaggedTemplateExpression tag. */
    public tag?: estree.INode | null;

    /** TaggedTemplateExpression quasi. */
    public quasi?: estree.INode | null;

    /**
     * Creates a new TaggedTemplateExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TaggedTemplateExpression instance
     */
    public static create(
      properties?: estree.ITaggedTemplateExpression,
    ): estree.TaggedTemplateExpression;

    /**
     * Encodes the specified TaggedTemplateExpression message. Does not implicitly {@link estree.TaggedTemplateExpression.verify|verify} messages.
     * @param message TaggedTemplateExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITaggedTemplateExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TaggedTemplateExpression message, length delimited. Does not implicitly {@link estree.TaggedTemplateExpression.verify|verify} messages.
     * @param message TaggedTemplateExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITaggedTemplateExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TaggedTemplateExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TaggedTemplateExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TaggedTemplateExpression;

    /**
     * Decodes a TaggedTemplateExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TaggedTemplateExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.TaggedTemplateExpression;

    /**
     * Verifies a TaggedTemplateExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TaggedTemplateExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TaggedTemplateExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.TaggedTemplateExpression;

    /**
     * Creates a plain object from a TaggedTemplateExpression message. Also converts values to other types if specified.
     * @param message TaggedTemplateExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TaggedTemplateExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TaggedTemplateExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TaggedTemplateExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SequenceExpression. */
  interface ISequenceExpression {
    /** SequenceExpression expressions */
    expressions?: estree.INode[] | null;
  }

  /** Represents a SequenceExpression. */
  class SequenceExpression implements ISequenceExpression {
    /**
     * Constructs a new SequenceExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISequenceExpression);

    /** SequenceExpression expressions. */
    public expressions: estree.INode[];

    /**
     * Creates a new SequenceExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SequenceExpression instance
     */
    public static create(properties?: estree.ISequenceExpression): estree.SequenceExpression;

    /**
     * Encodes the specified SequenceExpression message. Does not implicitly {@link estree.SequenceExpression.verify|verify} messages.
     * @param message SequenceExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ISequenceExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SequenceExpression message, length delimited. Does not implicitly {@link estree.SequenceExpression.verify|verify} messages.
     * @param message SequenceExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISequenceExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SequenceExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SequenceExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.SequenceExpression;

    /**
     * Decodes a SequenceExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SequenceExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.SequenceExpression;

    /**
     * Verifies a SequenceExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SequenceExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SequenceExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.SequenceExpression;

    /**
     * Creates a plain object from a SequenceExpression message. Also converts values to other types if specified.
     * @param message SequenceExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.SequenceExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SequenceExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SequenceExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ObjectExpression. */
  interface IObjectExpression {
    /** ObjectExpression properties */
    properties?: estree.INode[] | null;
  }

  /** Represents an ObjectExpression. */
  class ObjectExpression implements IObjectExpression {
    /**
     * Constructs a new ObjectExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IObjectExpression);

    /** ObjectExpression properties. */
    public properties: estree.INode[];

    /**
     * Creates a new ObjectExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ObjectExpression instance
     */
    public static create(properties?: estree.IObjectExpression): estree.ObjectExpression;

    /**
     * Encodes the specified ObjectExpression message. Does not implicitly {@link estree.ObjectExpression.verify|verify} messages.
     * @param message ObjectExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IObjectExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ObjectExpression message, length delimited. Does not implicitly {@link estree.ObjectExpression.verify|verify} messages.
     * @param message ObjectExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IObjectExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ObjectExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ObjectExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ObjectExpression;

    /**
     * Decodes an ObjectExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ObjectExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ObjectExpression;

    /**
     * Verifies an ObjectExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ObjectExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ObjectExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ObjectExpression;

    /**
     * Creates a plain object from an ObjectExpression message. Also converts values to other types if specified.
     * @param message ObjectExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ObjectExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ObjectExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ObjectExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SpreadElement. */
  interface ISpreadElement {
    /** SpreadElement argument */
    argument?: estree.INode | null;
  }

  /** Represents a SpreadElement. */
  class SpreadElement implements ISpreadElement {
    /**
     * Constructs a new SpreadElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISpreadElement);

    /** SpreadElement argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new SpreadElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SpreadElement instance
     */
    public static create(properties?: estree.ISpreadElement): estree.SpreadElement;

    /**
     * Encodes the specified SpreadElement message. Does not implicitly {@link estree.SpreadElement.verify|verify} messages.
     * @param message SpreadElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ISpreadElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SpreadElement message, length delimited. Does not implicitly {@link estree.SpreadElement.verify|verify} messages.
     * @param message SpreadElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISpreadElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SpreadElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SpreadElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.SpreadElement;

    /**
     * Decodes a SpreadElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SpreadElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.SpreadElement;

    /**
     * Verifies a SpreadElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SpreadElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SpreadElement
     */
    public static fromObject(object: { [k: string]: any }): estree.SpreadElement;

    /**
     * Creates a plain object from a SpreadElement message. Also converts values to other types if specified.
     * @param message SpreadElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.SpreadElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SpreadElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SpreadElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a Property. */
  interface IProperty {
    /** Property key */
    key?: estree.INode | null;

    /** Property value */
    value?: estree.INode | null;

    /** Property kind */
    kind?: string | null;

    /** Property method */
    method?: boolean | null;

    /** Property shorthand */
    shorthand?: boolean | null;

    /** Property computed */
    computed?: boolean | null;
  }

  /** Represents a Property. */
  class Property implements IProperty {
    /**
     * Constructs a new Property.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IProperty);

    /** Property key. */
    public key?: estree.INode | null;

    /** Property value. */
    public value?: estree.INode | null;

    /** Property kind. */
    public kind: string;

    /** Property method. */
    public method: boolean;

    /** Property shorthand. */
    public shorthand: boolean;

    /** Property computed. */
    public computed: boolean;

    /**
     * Creates a new Property instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Property instance
     */
    public static create(properties?: estree.IProperty): estree.Property;

    /**
     * Encodes the specified Property message. Does not implicitly {@link estree.Property.verify|verify} messages.
     * @param message Property message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IProperty, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Property message, length delimited. Does not implicitly {@link estree.Property.verify|verify} messages.
     * @param message Property message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IProperty,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Property message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Property
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Property;

    /**
     * Decodes a Property message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Property
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Property;

    /**
     * Verifies a Property message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Property message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Property
     */
    public static fromObject(object: { [k: string]: any }): estree.Property;

    /**
     * Creates a plain object from a Property message. Also converts values to other types if specified.
     * @param message Property
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Property,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Property to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Property
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AssignmentPattern. */
  interface IAssignmentPattern {
    /** AssignmentPattern left */
    left?: estree.INode | null;

    /** AssignmentPattern right */
    right?: estree.INode | null;
  }

  /** Represents an AssignmentPattern. */
  class AssignmentPattern implements IAssignmentPattern {
    /**
     * Constructs a new AssignmentPattern.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IAssignmentPattern);

    /** AssignmentPattern left. */
    public left?: estree.INode | null;

    /** AssignmentPattern right. */
    public right?: estree.INode | null;

    /**
     * Creates a new AssignmentPattern instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AssignmentPattern instance
     */
    public static create(properties?: estree.IAssignmentPattern): estree.AssignmentPattern;

    /**
     * Encodes the specified AssignmentPattern message. Does not implicitly {@link estree.AssignmentPattern.verify|verify} messages.
     * @param message AssignmentPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IAssignmentPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified AssignmentPattern message, length delimited. Does not implicitly {@link estree.AssignmentPattern.verify|verify} messages.
     * @param message AssignmentPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IAssignmentPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AssignmentPattern message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AssignmentPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.AssignmentPattern;

    /**
     * Decodes an AssignmentPattern message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AssignmentPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.AssignmentPattern;

    /**
     * Verifies an AssignmentPattern message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AssignmentPattern message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AssignmentPattern
     */
    public static fromObject(object: { [k: string]: any }): estree.AssignmentPattern;

    /**
     * Creates a plain object from an AssignmentPattern message. Also converts values to other types if specified.
     * @param message AssignmentPattern
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.AssignmentPattern,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AssignmentPattern to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AssignmentPattern
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a RestElement. */
  interface IRestElement {
    /** RestElement argument */
    argument?: estree.INode | null;
  }

  /** Represents a RestElement. */
  class RestElement implements IRestElement {
    /**
     * Constructs a new RestElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IRestElement);

    /** RestElement argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new RestElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RestElement instance
     */
    public static create(properties?: estree.IRestElement): estree.RestElement;

    /**
     * Encodes the specified RestElement message. Does not implicitly {@link estree.RestElement.verify|verify} messages.
     * @param message RestElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IRestElement, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RestElement message, length delimited. Does not implicitly {@link estree.RestElement.verify|verify} messages.
     * @param message RestElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IRestElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a RestElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RestElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.RestElement;

    /**
     * Decodes a RestElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RestElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.RestElement;

    /**
     * Verifies a RestElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a RestElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RestElement
     */
    public static fromObject(object: { [k: string]: any }): estree.RestElement;

    /**
     * Creates a plain object from a RestElement message. Also converts values to other types if specified.
     * @param message RestElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.RestElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this RestElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for RestElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ArrayPattern. */
  interface IArrayPattern {
    /** ArrayPattern elements */
    elements?: estree.IArrayElement[] | null;
  }

  /** Represents an ArrayPattern. */
  class ArrayPattern implements IArrayPattern {
    /**
     * Constructs a new ArrayPattern.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IArrayPattern);

    /** ArrayPattern elements. */
    public elements: estree.IArrayElement[];

    /**
     * Creates a new ArrayPattern instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArrayPattern instance
     */
    public static create(properties?: estree.IArrayPattern): estree.ArrayPattern;

    /**
     * Encodes the specified ArrayPattern message. Does not implicitly {@link estree.ArrayPattern.verify|verify} messages.
     * @param message ArrayPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IArrayPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ArrayPattern message, length delimited. Does not implicitly {@link estree.ArrayPattern.verify|verify} messages.
     * @param message ArrayPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IArrayPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ArrayPattern message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArrayPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ArrayPattern;

    /**
     * Decodes an ArrayPattern message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArrayPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ArrayPattern;

    /**
     * Verifies an ArrayPattern message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ArrayPattern message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArrayPattern
     */
    public static fromObject(object: { [k: string]: any }): estree.ArrayPattern;

    /**
     * Creates a plain object from an ArrayPattern message. Also converts values to other types if specified.
     * @param message ArrayPattern
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ArrayPattern,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ArrayPattern to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArrayPattern
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ObjectPattern. */
  interface IObjectPattern {
    /** ObjectPattern properties */
    properties?: estree.INode[] | null;
  }

  /** Represents an ObjectPattern. */
  class ObjectPattern implements IObjectPattern {
    /**
     * Constructs a new ObjectPattern.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IObjectPattern);

    /** ObjectPattern properties. */
    public properties: estree.INode[];

    /**
     * Creates a new ObjectPattern instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ObjectPattern instance
     */
    public static create(properties?: estree.IObjectPattern): estree.ObjectPattern;

    /**
     * Encodes the specified ObjectPattern message. Does not implicitly {@link estree.ObjectPattern.verify|verify} messages.
     * @param message ObjectPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IObjectPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ObjectPattern message, length delimited. Does not implicitly {@link estree.ObjectPattern.verify|verify} messages.
     * @param message ObjectPattern message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IObjectPattern,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ObjectPattern message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ObjectPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ObjectPattern;

    /**
     * Decodes an ObjectPattern message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ObjectPattern
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ObjectPattern;

    /**
     * Verifies an ObjectPattern message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ObjectPattern message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ObjectPattern
     */
    public static fromObject(object: { [k: string]: any }): estree.ObjectPattern;

    /**
     * Creates a plain object from an ObjectPattern message. Also converts values to other types if specified.
     * @param message ObjectPattern
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ObjectPattern,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ObjectPattern to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ObjectPattern
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a PrivateIdentifier. */
  interface IPrivateIdentifier {
    /** PrivateIdentifier name */
    name?: string | null;
  }

  /** Represents a PrivateIdentifier. */
  class PrivateIdentifier implements IPrivateIdentifier {
    /**
     * Constructs a new PrivateIdentifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IPrivateIdentifier);

    /** PrivateIdentifier name. */
    public name: string;

    /**
     * Creates a new PrivateIdentifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns PrivateIdentifier instance
     */
    public static create(properties?: estree.IPrivateIdentifier): estree.PrivateIdentifier;

    /**
     * Encodes the specified PrivateIdentifier message. Does not implicitly {@link estree.PrivateIdentifier.verify|verify} messages.
     * @param message PrivateIdentifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IPrivateIdentifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified PrivateIdentifier message, length delimited. Does not implicitly {@link estree.PrivateIdentifier.verify|verify} messages.
     * @param message PrivateIdentifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IPrivateIdentifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a PrivateIdentifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns PrivateIdentifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.PrivateIdentifier;

    /**
     * Decodes a PrivateIdentifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns PrivateIdentifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.PrivateIdentifier;

    /**
     * Verifies a PrivateIdentifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a PrivateIdentifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns PrivateIdentifier
     */
    public static fromObject(object: { [k: string]: any }): estree.PrivateIdentifier;

    /**
     * Creates a plain object from a PrivateIdentifier message. Also converts values to other types if specified.
     * @param message PrivateIdentifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.PrivateIdentifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this PrivateIdentifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for PrivateIdentifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a NewExpression. */
  interface INewExpression {
    /** NewExpression callee */
    callee?: estree.INode | null;

    /** NewExpression arguments */
    arguments?: estree.INode[] | null;
  }

  /** Represents a NewExpression. */
  class NewExpression implements INewExpression {
    /**
     * Constructs a new NewExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.INewExpression);

    /** NewExpression callee. */
    public callee?: estree.INode | null;

    /** NewExpression arguments. */
    public arguments: estree.INode[];

    /**
     * Creates a new NewExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns NewExpression instance
     */
    public static create(properties?: estree.INewExpression): estree.NewExpression;

    /**
     * Encodes the specified NewExpression message. Does not implicitly {@link estree.NewExpression.verify|verify} messages.
     * @param message NewExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.INewExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified NewExpression message, length delimited. Does not implicitly {@link estree.NewExpression.verify|verify} messages.
     * @param message NewExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.INewExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a NewExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns NewExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.NewExpression;

    /**
     * Decodes a NewExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns NewExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.NewExpression;

    /**
     * Verifies a NewExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a NewExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns NewExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.NewExpression;

    /**
     * Creates a plain object from a NewExpression message. Also converts values to other types if specified.
     * @param message NewExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.NewExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this NewExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for NewExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a Super. */
  interface ISuper {}

  /** Represents a Super. */
  class Super implements ISuper {
    /**
     * Constructs a new Super.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISuper);

    /**
     * Creates a new Super instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Super instance
     */
    public static create(properties?: estree.ISuper): estree.Super;

    /**
     * Encodes the specified Super message. Does not implicitly {@link estree.Super.verify|verify} messages.
     * @param message Super message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.ISuper, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Super message, length delimited. Does not implicitly {@link estree.Super.verify|verify} messages.
     * @param message Super message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISuper,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a Super message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Super
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.Super;

    /**
     * Decodes a Super message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Super
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.Super;

    /**
     * Verifies a Super message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a Super message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Super
     */
    public static fromObject(object: { [k: string]: any }): estree.Super;

    /**
     * Creates a plain object from a Super message. Also converts values to other types if specified.
     * @param message Super
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.Super,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this Super to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Super
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a MetaProperty. */
  interface IMetaProperty {
    /** MetaProperty meta */
    meta?: estree.INode | null;

    /** MetaProperty property */
    property?: estree.INode | null;
  }

  /** Represents a MetaProperty. */
  class MetaProperty implements IMetaProperty {
    /**
     * Constructs a new MetaProperty.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IMetaProperty);

    /** MetaProperty meta. */
    public meta?: estree.INode | null;

    /** MetaProperty property. */
    public property?: estree.INode | null;

    /**
     * Creates a new MetaProperty instance using the specified properties.
     * @param [properties] Properties to set
     * @returns MetaProperty instance
     */
    public static create(properties?: estree.IMetaProperty): estree.MetaProperty;

    /**
     * Encodes the specified MetaProperty message. Does not implicitly {@link estree.MetaProperty.verify|verify} messages.
     * @param message MetaProperty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IMetaProperty,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified MetaProperty message, length delimited. Does not implicitly {@link estree.MetaProperty.verify|verify} messages.
     * @param message MetaProperty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IMetaProperty,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a MetaProperty message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns MetaProperty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.MetaProperty;

    /**
     * Decodes a MetaProperty message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns MetaProperty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.MetaProperty;

    /**
     * Verifies a MetaProperty message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a MetaProperty message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns MetaProperty
     */
    public static fromObject(object: { [k: string]: any }): estree.MetaProperty;

    /**
     * Creates a plain object from a MetaProperty message. Also converts values to other types if specified.
     * @param message MetaProperty
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.MetaProperty,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this MetaProperty to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for MetaProperty
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a MemberExpression. */
  interface IMemberExpression {
    /** MemberExpression object */
    object?: estree.INode | null;

    /** MemberExpression property */
    property?: estree.INode | null;

    /** MemberExpression computed */
    computed?: boolean | null;

    /** MemberExpression optional */
    optional?: boolean | null;
  }

  /** Represents a MemberExpression. */
  class MemberExpression implements IMemberExpression {
    /**
     * Constructs a new MemberExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IMemberExpression);

    /** MemberExpression object. */
    public object?: estree.INode | null;

    /** MemberExpression property. */
    public property?: estree.INode | null;

    /** MemberExpression computed. */
    public computed: boolean;

    /** MemberExpression optional. */
    public optional: boolean;

    /**
     * Creates a new MemberExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns MemberExpression instance
     */
    public static create(properties?: estree.IMemberExpression): estree.MemberExpression;

    /**
     * Encodes the specified MemberExpression message. Does not implicitly {@link estree.MemberExpression.verify|verify} messages.
     * @param message MemberExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IMemberExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified MemberExpression message, length delimited. Does not implicitly {@link estree.MemberExpression.verify|verify} messages.
     * @param message MemberExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IMemberExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a MemberExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns MemberExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.MemberExpression;

    /**
     * Decodes a MemberExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns MemberExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.MemberExpression;

    /**
     * Verifies a MemberExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a MemberExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns MemberExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.MemberExpression;

    /**
     * Creates a plain object from a MemberExpression message. Also converts values to other types if specified.
     * @param message MemberExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.MemberExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this MemberExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for MemberExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a LogicalExpression. */
  interface ILogicalExpression {
    /** LogicalExpression operator */
    operator?: string | null;

    /** LogicalExpression left */
    left?: estree.INode | null;

    /** LogicalExpression right */
    right?: estree.INode | null;
  }

  /** Represents a LogicalExpression. */
  class LogicalExpression implements ILogicalExpression {
    /**
     * Constructs a new LogicalExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ILogicalExpression);

    /** LogicalExpression operator. */
    public operator: string;

    /** LogicalExpression left. */
    public left?: estree.INode | null;

    /** LogicalExpression right. */
    public right?: estree.INode | null;

    /**
     * Creates a new LogicalExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns LogicalExpression instance
     */
    public static create(properties?: estree.ILogicalExpression): estree.LogicalExpression;

    /**
     * Encodes the specified LogicalExpression message. Does not implicitly {@link estree.LogicalExpression.verify|verify} messages.
     * @param message LogicalExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ILogicalExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified LogicalExpression message, length delimited. Does not implicitly {@link estree.LogicalExpression.verify|verify} messages.
     * @param message LogicalExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ILogicalExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a LogicalExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns LogicalExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.LogicalExpression;

    /**
     * Decodes a LogicalExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns LogicalExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.LogicalExpression;

    /**
     * Verifies a LogicalExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a LogicalExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns LogicalExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.LogicalExpression;

    /**
     * Creates a plain object from a LogicalExpression message. Also converts values to other types if specified.
     * @param message LogicalExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.LogicalExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this LogicalExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for LogicalExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ImportExpression. */
  interface IImportExpression {
    /** ImportExpression source */
    source?: estree.INode | null;
  }

  /** Represents an ImportExpression. */
  class ImportExpression implements IImportExpression {
    /**
     * Constructs a new ImportExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IImportExpression);

    /** ImportExpression source. */
    public source?: estree.INode | null;

    /**
     * Creates a new ImportExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImportExpression instance
     */
    public static create(properties?: estree.IImportExpression): estree.ImportExpression;

    /**
     * Encodes the specified ImportExpression message. Does not implicitly {@link estree.ImportExpression.verify|verify} messages.
     * @param message ImportExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IImportExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ImportExpression message, length delimited. Does not implicitly {@link estree.ImportExpression.verify|verify} messages.
     * @param message ImportExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IImportExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ImportExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImportExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ImportExpression;

    /**
     * Decodes an ImportExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImportExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ImportExpression;

    /**
     * Verifies an ImportExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ImportExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImportExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ImportExpression;

    /**
     * Creates a plain object from an ImportExpression message. Also converts values to other types if specified.
     * @param message ImportExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ImportExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ImportExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImportExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a BlockStatement. */
  interface IBlockStatement {
    /** BlockStatement body */
    body?: estree.INode[] | null;
  }

  /** Represents a BlockStatement. */
  class BlockStatement implements IBlockStatement {
    /**
     * Constructs a new BlockStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IBlockStatement);

    /** BlockStatement body. */
    public body: estree.INode[];

    /**
     * Creates a new BlockStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns BlockStatement instance
     */
    public static create(properties?: estree.IBlockStatement): estree.BlockStatement;

    /**
     * Encodes the specified BlockStatement message. Does not implicitly {@link estree.BlockStatement.verify|verify} messages.
     * @param message BlockStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IBlockStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified BlockStatement message, length delimited. Does not implicitly {@link estree.BlockStatement.verify|verify} messages.
     * @param message BlockStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IBlockStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a BlockStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns BlockStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.BlockStatement;

    /**
     * Decodes a BlockStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns BlockStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.BlockStatement;

    /**
     * Verifies a BlockStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a BlockStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns BlockStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.BlockStatement;

    /**
     * Creates a plain object from a BlockStatement message. Also converts values to other types if specified.
     * @param message BlockStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.BlockStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this BlockStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for BlockStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ConditionalExpression. */
  interface IConditionalExpression {
    /** ConditionalExpression test */
    test?: estree.INode | null;

    /** ConditionalExpression alternate */
    alternate?: estree.INode | null;

    /** ConditionalExpression consequent */
    consequent?: estree.INode | null;
  }

  /** Represents a ConditionalExpression. */
  class ConditionalExpression implements IConditionalExpression {
    /**
     * Constructs a new ConditionalExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IConditionalExpression);

    /** ConditionalExpression test. */
    public test?: estree.INode | null;

    /** ConditionalExpression alternate. */
    public alternate?: estree.INode | null;

    /** ConditionalExpression consequent. */
    public consequent?: estree.INode | null;

    /**
     * Creates a new ConditionalExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ConditionalExpression instance
     */
    public static create(properties?: estree.IConditionalExpression): estree.ConditionalExpression;

    /**
     * Encodes the specified ConditionalExpression message. Does not implicitly {@link estree.ConditionalExpression.verify|verify} messages.
     * @param message ConditionalExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IConditionalExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ConditionalExpression message, length delimited. Does not implicitly {@link estree.ConditionalExpression.verify|verify} messages.
     * @param message ConditionalExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IConditionalExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ConditionalExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ConditionalExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ConditionalExpression;

    /**
     * Decodes a ConditionalExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ConditionalExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ConditionalExpression;

    /**
     * Verifies a ConditionalExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ConditionalExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ConditionalExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ConditionalExpression;

    /**
     * Creates a plain object from a ConditionalExpression message. Also converts values to other types if specified.
     * @param message ConditionalExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ConditionalExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ConditionalExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ConditionalExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ClassExpression. */
  interface IClassExpression {
    /** ClassExpression id */
    id?: estree.INode | null;

    /** ClassExpression superClass */
    superClass?: estree.INode | null;

    /** ClassExpression body */
    body?: estree.INode | null;
  }

  /** Represents a ClassExpression. */
  class ClassExpression implements IClassExpression {
    /**
     * Constructs a new ClassExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IClassExpression);

    /** ClassExpression id. */
    public id?: estree.INode | null;

    /** ClassExpression superClass. */
    public superClass?: estree.INode | null;

    /** ClassExpression body. */
    public body?: estree.INode | null;

    /**
     * Creates a new ClassExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ClassExpression instance
     */
    public static create(properties?: estree.IClassExpression): estree.ClassExpression;

    /**
     * Encodes the specified ClassExpression message. Does not implicitly {@link estree.ClassExpression.verify|verify} messages.
     * @param message ClassExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IClassExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ClassExpression message, length delimited. Does not implicitly {@link estree.ClassExpression.verify|verify} messages.
     * @param message ClassExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IClassExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ClassExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ClassExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ClassExpression;

    /**
     * Decodes a ClassExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ClassExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ClassExpression;

    /**
     * Verifies a ClassExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ClassExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ClassExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ClassExpression;

    /**
     * Creates a plain object from a ClassExpression message. Also converts values to other types if specified.
     * @param message ClassExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ClassExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ClassExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ClassExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ClassBody. */
  interface IClassBody {
    /** ClassBody body */
    body?: estree.INode[] | null;
  }

  /** Represents a ClassBody. */
  class ClassBody implements IClassBody {
    /**
     * Constructs a new ClassBody.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IClassBody);

    /** ClassBody body. */
    public body: estree.INode[];

    /**
     * Creates a new ClassBody instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ClassBody instance
     */
    public static create(properties?: estree.IClassBody): estree.ClassBody;

    /**
     * Encodes the specified ClassBody message. Does not implicitly {@link estree.ClassBody.verify|verify} messages.
     * @param message ClassBody message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IClassBody, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ClassBody message, length delimited. Does not implicitly {@link estree.ClassBody.verify|verify} messages.
     * @param message ClassBody message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IClassBody,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ClassBody message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ClassBody
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.ClassBody;

    /**
     * Decodes a ClassBody message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ClassBody
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ClassBody;

    /**
     * Verifies a ClassBody message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ClassBody message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ClassBody
     */
    public static fromObject(object: { [k: string]: any }): estree.ClassBody;

    /**
     * Creates a plain object from a ClassBody message. Also converts values to other types if specified.
     * @param message ClassBody
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ClassBody,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ClassBody to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ClassBody
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a StaticBlock. */
  interface IStaticBlock {
    /** StaticBlock body */
    body?: estree.INode[] | null;
  }

  /** Represents a StaticBlock. */
  class StaticBlock implements IStaticBlock {
    /**
     * Constructs a new StaticBlock.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IStaticBlock);

    /** StaticBlock body. */
    public body: estree.INode[];

    /**
     * Creates a new StaticBlock instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StaticBlock instance
     */
    public static create(properties?: estree.IStaticBlock): estree.StaticBlock;

    /**
     * Encodes the specified StaticBlock message. Does not implicitly {@link estree.StaticBlock.verify|verify} messages.
     * @param message StaticBlock message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IStaticBlock, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StaticBlock message, length delimited. Does not implicitly {@link estree.StaticBlock.verify|verify} messages.
     * @param message StaticBlock message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IStaticBlock,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a StaticBlock message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StaticBlock
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.StaticBlock;

    /**
     * Decodes a StaticBlock message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StaticBlock
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.StaticBlock;

    /**
     * Verifies a StaticBlock message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a StaticBlock message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StaticBlock
     */
    public static fromObject(object: { [k: string]: any }): estree.StaticBlock;

    /**
     * Creates a plain object from a StaticBlock message. Also converts values to other types if specified.
     * @param message StaticBlock
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.StaticBlock,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this StaticBlock to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for StaticBlock
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a PropertyDefinition. */
  interface IPropertyDefinition {
    /** PropertyDefinition key */
    key?: estree.INode | null;

    /** PropertyDefinition value */
    value?: estree.INode | null;

    /** PropertyDefinition computed */
    computed?: boolean | null;

    /** PropertyDefinition static */
    static?: boolean | null;
  }

  /** Represents a PropertyDefinition. */
  class PropertyDefinition implements IPropertyDefinition {
    /**
     * Constructs a new PropertyDefinition.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IPropertyDefinition);

    /** PropertyDefinition key. */
    public key?: estree.INode | null;

    /** PropertyDefinition value. */
    public value?: estree.INode | null;

    /** PropertyDefinition computed. */
    public computed: boolean;

    /** PropertyDefinition static. */
    public static: boolean;

    /**
     * Creates a new PropertyDefinition instance using the specified properties.
     * @param [properties] Properties to set
     * @returns PropertyDefinition instance
     */
    public static create(properties?: estree.IPropertyDefinition): estree.PropertyDefinition;

    /**
     * Encodes the specified PropertyDefinition message. Does not implicitly {@link estree.PropertyDefinition.verify|verify} messages.
     * @param message PropertyDefinition message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IPropertyDefinition,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified PropertyDefinition message, length delimited. Does not implicitly {@link estree.PropertyDefinition.verify|verify} messages.
     * @param message PropertyDefinition message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IPropertyDefinition,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a PropertyDefinition message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns PropertyDefinition
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.PropertyDefinition;

    /**
     * Decodes a PropertyDefinition message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns PropertyDefinition
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.PropertyDefinition;

    /**
     * Verifies a PropertyDefinition message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a PropertyDefinition message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns PropertyDefinition
     */
    public static fromObject(object: { [k: string]: any }): estree.PropertyDefinition;

    /**
     * Creates a plain object from a PropertyDefinition message. Also converts values to other types if specified.
     * @param message PropertyDefinition
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.PropertyDefinition,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this PropertyDefinition to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for PropertyDefinition
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a MethodDefinition. */
  interface IMethodDefinition {
    /** MethodDefinition key */
    key?: estree.INode | null;

    /** MethodDefinition value */
    value?: estree.INode | null;

    /** MethodDefinition kind */
    kind?: string | null;

    /** MethodDefinition computed */
    computed?: boolean | null;

    /** MethodDefinition static */
    static?: boolean | null;
  }

  /** Represents a MethodDefinition. */
  class MethodDefinition implements IMethodDefinition {
    /**
     * Constructs a new MethodDefinition.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IMethodDefinition);

    /** MethodDefinition key. */
    public key?: estree.INode | null;

    /** MethodDefinition value. */
    public value?: estree.INode | null;

    /** MethodDefinition kind. */
    public kind: string;

    /** MethodDefinition computed. */
    public computed: boolean;

    /** MethodDefinition static. */
    public static: boolean;

    /**
     * Creates a new MethodDefinition instance using the specified properties.
     * @param [properties] Properties to set
     * @returns MethodDefinition instance
     */
    public static create(properties?: estree.IMethodDefinition): estree.MethodDefinition;

    /**
     * Encodes the specified MethodDefinition message. Does not implicitly {@link estree.MethodDefinition.verify|verify} messages.
     * @param message MethodDefinition message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IMethodDefinition,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified MethodDefinition message, length delimited. Does not implicitly {@link estree.MethodDefinition.verify|verify} messages.
     * @param message MethodDefinition message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IMethodDefinition,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a MethodDefinition message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns MethodDefinition
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.MethodDefinition;

    /**
     * Decodes a MethodDefinition message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns MethodDefinition
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.MethodDefinition;

    /**
     * Verifies a MethodDefinition message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a MethodDefinition message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns MethodDefinition
     */
    public static fromObject(object: { [k: string]: any }): estree.MethodDefinition;

    /**
     * Creates a plain object from a MethodDefinition message. Also converts values to other types if specified.
     * @param message MethodDefinition
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.MethodDefinition,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this MethodDefinition to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for MethodDefinition
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ChainExpression. */
  interface IChainExpression {
    /** ChainExpression expression */
    expression?: estree.INode | null;
  }

  /** Represents a ChainExpression. */
  class ChainExpression implements IChainExpression {
    /**
     * Constructs a new ChainExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IChainExpression);

    /** ChainExpression expression. */
    public expression?: estree.INode | null;

    /**
     * Creates a new ChainExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ChainExpression instance
     */
    public static create(properties?: estree.IChainExpression): estree.ChainExpression;

    /**
     * Encodes the specified ChainExpression message. Does not implicitly {@link estree.ChainExpression.verify|verify} messages.
     * @param message ChainExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IChainExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ChainExpression message, length delimited. Does not implicitly {@link estree.ChainExpression.verify|verify} messages.
     * @param message ChainExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IChainExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ChainExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ChainExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ChainExpression;

    /**
     * Decodes a ChainExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ChainExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ChainExpression;

    /**
     * Verifies a ChainExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ChainExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ChainExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ChainExpression;

    /**
     * Creates a plain object from a ChainExpression message. Also converts values to other types if specified.
     * @param message ChainExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ChainExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ChainExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ChainExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a CallExpression. */
  interface ICallExpression {
    /** CallExpression optional */
    optional?: boolean | null;

    /** CallExpression callee */
    callee?: estree.INode | null;

    /** CallExpression arguments */
    arguments?: estree.INode[] | null;
  }

  /** Represents a CallExpression. */
  class CallExpression implements ICallExpression {
    /**
     * Constructs a new CallExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ICallExpression);

    /** CallExpression optional. */
    public optional: boolean;

    /** CallExpression callee. */
    public callee?: estree.INode | null;

    /** CallExpression arguments. */
    public arguments: estree.INode[];

    /**
     * Creates a new CallExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CallExpression instance
     */
    public static create(properties?: estree.ICallExpression): estree.CallExpression;

    /**
     * Encodes the specified CallExpression message. Does not implicitly {@link estree.CallExpression.verify|verify} messages.
     * @param message CallExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ICallExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified CallExpression message, length delimited. Does not implicitly {@link estree.CallExpression.verify|verify} messages.
     * @param message CallExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ICallExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a CallExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CallExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.CallExpression;

    /**
     * Decodes a CallExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CallExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.CallExpression;

    /**
     * Verifies a CallExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a CallExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CallExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.CallExpression;

    /**
     * Creates a plain object from a CallExpression message. Also converts values to other types if specified.
     * @param message CallExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.CallExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this CallExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for CallExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a BinaryExpression. */
  interface IBinaryExpression {
    /** BinaryExpression operator */
    operator?: string | null;

    /** BinaryExpression left */
    left?: estree.INode | null;

    /** BinaryExpression right */
    right?: estree.INode | null;
  }

  /** Represents a BinaryExpression. */
  class BinaryExpression implements IBinaryExpression {
    /**
     * Constructs a new BinaryExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IBinaryExpression);

    /** BinaryExpression operator. */
    public operator: string;

    /** BinaryExpression left. */
    public left?: estree.INode | null;

    /** BinaryExpression right. */
    public right?: estree.INode | null;

    /**
     * Creates a new BinaryExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns BinaryExpression instance
     */
    public static create(properties?: estree.IBinaryExpression): estree.BinaryExpression;

    /**
     * Encodes the specified BinaryExpression message. Does not implicitly {@link estree.BinaryExpression.verify|verify} messages.
     * @param message BinaryExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IBinaryExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified BinaryExpression message, length delimited. Does not implicitly {@link estree.BinaryExpression.verify|verify} messages.
     * @param message BinaryExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IBinaryExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a BinaryExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns BinaryExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.BinaryExpression;

    /**
     * Decodes a BinaryExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns BinaryExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.BinaryExpression;

    /**
     * Verifies a BinaryExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a BinaryExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns BinaryExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.BinaryExpression;

    /**
     * Creates a plain object from a BinaryExpression message. Also converts values to other types if specified.
     * @param message BinaryExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.BinaryExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this BinaryExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for BinaryExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AwaitExpression. */
  interface IAwaitExpression {
    /** AwaitExpression argument */
    argument?: estree.INode | null;
  }

  /** Represents an AwaitExpression. */
  class AwaitExpression implements IAwaitExpression {
    /**
     * Constructs a new AwaitExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IAwaitExpression);

    /** AwaitExpression argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new AwaitExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AwaitExpression instance
     */
    public static create(properties?: estree.IAwaitExpression): estree.AwaitExpression;

    /**
     * Encodes the specified AwaitExpression message. Does not implicitly {@link estree.AwaitExpression.verify|verify} messages.
     * @param message AwaitExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IAwaitExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified AwaitExpression message, length delimited. Does not implicitly {@link estree.AwaitExpression.verify|verify} messages.
     * @param message AwaitExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IAwaitExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AwaitExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AwaitExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.AwaitExpression;

    /**
     * Decodes an AwaitExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AwaitExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.AwaitExpression;

    /**
     * Verifies an AwaitExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AwaitExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AwaitExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.AwaitExpression;

    /**
     * Creates a plain object from an AwaitExpression message. Also converts values to other types if specified.
     * @param message AwaitExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.AwaitExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AwaitExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AwaitExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AssignmentExpression. */
  interface IAssignmentExpression {
    /** AssignmentExpression operator */
    operator?: string | null;

    /** AssignmentExpression left */
    left?: estree.INode | null;

    /** AssignmentExpression right */
    right?: estree.INode | null;
  }

  /** Represents an AssignmentExpression. */
  class AssignmentExpression implements IAssignmentExpression {
    /**
     * Constructs a new AssignmentExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IAssignmentExpression);

    /** AssignmentExpression operator. */
    public operator: string;

    /** AssignmentExpression left. */
    public left?: estree.INode | null;

    /** AssignmentExpression right. */
    public right?: estree.INode | null;

    /**
     * Creates a new AssignmentExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AssignmentExpression instance
     */
    public static create(properties?: estree.IAssignmentExpression): estree.AssignmentExpression;

    /**
     * Encodes the specified AssignmentExpression message. Does not implicitly {@link estree.AssignmentExpression.verify|verify} messages.
     * @param message AssignmentExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IAssignmentExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified AssignmentExpression message, length delimited. Does not implicitly {@link estree.AssignmentExpression.verify|verify} messages.
     * @param message AssignmentExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IAssignmentExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AssignmentExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AssignmentExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.AssignmentExpression;

    /**
     * Decodes an AssignmentExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AssignmentExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.AssignmentExpression;

    /**
     * Verifies an AssignmentExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AssignmentExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AssignmentExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.AssignmentExpression;

    /**
     * Creates a plain object from an AssignmentExpression message. Also converts values to other types if specified.
     * @param message AssignmentExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.AssignmentExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AssignmentExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AssignmentExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ArrowFunctionExpression. */
  interface IArrowFunctionExpression {
    /** ArrowFunctionExpression expression */
    expression?: boolean | null;

    /** ArrowFunctionExpression body */
    body?: estree.INode | null;

    /** ArrowFunctionExpression params */
    params?: estree.INode[] | null;

    /** ArrowFunctionExpression generator */
    generator?: boolean | null;

    /** ArrowFunctionExpression async */
    async?: boolean | null;
  }

  /** Represents an ArrowFunctionExpression. */
  class ArrowFunctionExpression implements IArrowFunctionExpression {
    /**
     * Constructs a new ArrowFunctionExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IArrowFunctionExpression);

    /** ArrowFunctionExpression expression. */
    public expression: boolean;

    /** ArrowFunctionExpression body. */
    public body?: estree.INode | null;

    /** ArrowFunctionExpression params. */
    public params: estree.INode[];

    /** ArrowFunctionExpression generator. */
    public generator?: boolean | null;

    /** ArrowFunctionExpression async. */
    public async?: boolean | null;

    /**
     * Creates a new ArrowFunctionExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArrowFunctionExpression instance
     */
    public static create(
      properties?: estree.IArrowFunctionExpression,
    ): estree.ArrowFunctionExpression;

    /**
     * Encodes the specified ArrowFunctionExpression message. Does not implicitly {@link estree.ArrowFunctionExpression.verify|verify} messages.
     * @param message ArrowFunctionExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IArrowFunctionExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ArrowFunctionExpression message, length delimited. Does not implicitly {@link estree.ArrowFunctionExpression.verify|verify} messages.
     * @param message ArrowFunctionExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IArrowFunctionExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ArrowFunctionExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArrowFunctionExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ArrowFunctionExpression;

    /**
     * Decodes an ArrowFunctionExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArrowFunctionExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ArrowFunctionExpression;

    /**
     * Verifies an ArrowFunctionExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ArrowFunctionExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArrowFunctionExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ArrowFunctionExpression;

    /**
     * Creates a plain object from an ArrowFunctionExpression message. Also converts values to other types if specified.
     * @param message ArrowFunctionExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ArrowFunctionExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ArrowFunctionExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArrowFunctionExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ArrayExpression. */
  interface IArrayExpression {
    /** ArrayExpression elements */
    elements?: estree.IArrayElement[] | null;
  }

  /** Represents an ArrayExpression. */
  class ArrayExpression implements IArrayExpression {
    /**
     * Constructs a new ArrayExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IArrayExpression);

    /** ArrayExpression elements. */
    public elements: estree.IArrayElement[];

    /**
     * Creates a new ArrayExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArrayExpression instance
     */
    public static create(properties?: estree.IArrayExpression): estree.ArrayExpression;

    /**
     * Encodes the specified ArrayExpression message. Does not implicitly {@link estree.ArrayExpression.verify|verify} messages.
     * @param message ArrayExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IArrayExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ArrayExpression message, length delimited. Does not implicitly {@link estree.ArrayExpression.verify|verify} messages.
     * @param message ArrayExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IArrayExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ArrayExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArrayExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ArrayExpression;

    /**
     * Decodes an ArrayExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArrayExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ArrayExpression;

    /**
     * Verifies an ArrayExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ArrayExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArrayExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.ArrayExpression;

    /**
     * Creates a plain object from an ArrayExpression message. Also converts values to other types if specified.
     * @param message ArrayExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ArrayExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ArrayExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArrayExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ArrayElement. */
  interface IArrayElement {
    /** ArrayElement element */
    element?: estree.INode | null;
  }

  /** Represents an ArrayElement. */
  class ArrayElement implements IArrayElement {
    /**
     * Constructs a new ArrayElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IArrayElement);

    /** ArrayElement element. */
    public element?: estree.INode | null;

    /**
     * Creates a new ArrayElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArrayElement instance
     */
    public static create(properties?: estree.IArrayElement): estree.ArrayElement;

    /**
     * Encodes the specified ArrayElement message. Does not implicitly {@link estree.ArrayElement.verify|verify} messages.
     * @param message ArrayElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IArrayElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ArrayElement message, length delimited. Does not implicitly {@link estree.ArrayElement.verify|verify} messages.
     * @param message ArrayElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IArrayElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ArrayElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArrayElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ArrayElement;

    /**
     * Decodes an ArrayElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArrayElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ArrayElement;

    /**
     * Verifies an ArrayElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ArrayElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArrayElement
     */
    public static fromObject(object: { [k: string]: any }): estree.ArrayElement;

    /**
     * Creates a plain object from an ArrayElement message. Also converts values to other types if specified.
     * @param message ArrayElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ArrayElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ArrayElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArrayElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ClassDeclaration. */
  interface IClassDeclaration {
    /** ClassDeclaration id */
    id?: estree.INode | null;

    /** ClassDeclaration superClass */
    superClass?: estree.INode | null;

    /** ClassDeclaration body */
    body?: estree.INode | null;
  }

  /** Represents a ClassDeclaration. */
  class ClassDeclaration implements IClassDeclaration {
    /**
     * Constructs a new ClassDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IClassDeclaration);

    /** ClassDeclaration id. */
    public id?: estree.INode | null;

    /** ClassDeclaration superClass. */
    public superClass?: estree.INode | null;

    /** ClassDeclaration body. */
    public body?: estree.INode | null;

    /**
     * Creates a new ClassDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ClassDeclaration instance
     */
    public static create(properties?: estree.IClassDeclaration): estree.ClassDeclaration;

    /**
     * Encodes the specified ClassDeclaration message. Does not implicitly {@link estree.ClassDeclaration.verify|verify} messages.
     * @param message ClassDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IClassDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ClassDeclaration message, length delimited. Does not implicitly {@link estree.ClassDeclaration.verify|verify} messages.
     * @param message ClassDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IClassDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ClassDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ClassDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ClassDeclaration;

    /**
     * Decodes a ClassDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ClassDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ClassDeclaration;

    /**
     * Verifies a ClassDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ClassDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ClassDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.ClassDeclaration;

    /**
     * Creates a plain object from a ClassDeclaration message. Also converts values to other types if specified.
     * @param message ClassDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ClassDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ClassDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ClassDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a FunctionDeclaration. */
  interface IFunctionDeclaration {
    /** FunctionDeclaration id */
    id?: estree.INode | null;

    /** FunctionDeclaration body */
    body?: estree.INode | null;

    /** FunctionDeclaration params */
    params?: estree.INode[] | null;

    /** FunctionDeclaration generator */
    generator?: boolean | null;

    /** FunctionDeclaration async */
    async?: boolean | null;
  }

  /** Represents a FunctionDeclaration. */
  class FunctionDeclaration implements IFunctionDeclaration {
    /**
     * Constructs a new FunctionDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IFunctionDeclaration);

    /** FunctionDeclaration id. */
    public id?: estree.INode | null;

    /** FunctionDeclaration body. */
    public body?: estree.INode | null;

    /** FunctionDeclaration params. */
    public params: estree.INode[];

    /** FunctionDeclaration generator. */
    public generator?: boolean | null;

    /** FunctionDeclaration async. */
    public async?: boolean | null;

    /**
     * Creates a new FunctionDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FunctionDeclaration instance
     */
    public static create(properties?: estree.IFunctionDeclaration): estree.FunctionDeclaration;

    /**
     * Encodes the specified FunctionDeclaration message. Does not implicitly {@link estree.FunctionDeclaration.verify|verify} messages.
     * @param message FunctionDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IFunctionDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified FunctionDeclaration message, length delimited. Does not implicitly {@link estree.FunctionDeclaration.verify|verify} messages.
     * @param message FunctionDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IFunctionDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FunctionDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FunctionDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.FunctionDeclaration;

    /**
     * Decodes a FunctionDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FunctionDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.FunctionDeclaration;

    /**
     * Verifies a FunctionDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FunctionDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FunctionDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.FunctionDeclaration;

    /**
     * Creates a plain object from a FunctionDeclaration message. Also converts values to other types if specified.
     * @param message FunctionDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.FunctionDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FunctionDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FunctionDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExportNamedDeclaration. */
  interface IExportNamedDeclaration {
    /** ExportNamedDeclaration declaration */
    declaration?: estree.INode | null;

    /** ExportNamedDeclaration specifiers */
    specifiers?: estree.INode[] | null;

    /** ExportNamedDeclaration source */
    source?: estree.INode | null;
  }

  /** Represents an ExportNamedDeclaration. */
  class ExportNamedDeclaration implements IExportNamedDeclaration {
    /**
     * Constructs a new ExportNamedDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExportNamedDeclaration);

    /** ExportNamedDeclaration declaration. */
    public declaration?: estree.INode | null;

    /** ExportNamedDeclaration specifiers. */
    public specifiers: estree.INode[];

    /** ExportNamedDeclaration source. */
    public source?: estree.INode | null;

    /**
     * Creates a new ExportNamedDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExportNamedDeclaration instance
     */
    public static create(
      properties?: estree.IExportNamedDeclaration,
    ): estree.ExportNamedDeclaration;

    /**
     * Encodes the specified ExportNamedDeclaration message. Does not implicitly {@link estree.ExportNamedDeclaration.verify|verify} messages.
     * @param message ExportNamedDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExportNamedDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExportNamedDeclaration message, length delimited. Does not implicitly {@link estree.ExportNamedDeclaration.verify|verify} messages.
     * @param message ExportNamedDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExportNamedDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExportNamedDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExportNamedDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExportNamedDeclaration;

    /**
     * Decodes an ExportNamedDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExportNamedDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ExportNamedDeclaration;

    /**
     * Verifies an ExportNamedDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExportNamedDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExportNamedDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.ExportNamedDeclaration;

    /**
     * Creates a plain object from an ExportNamedDeclaration message. Also converts values to other types if specified.
     * @param message ExportNamedDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExportNamedDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExportNamedDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExportNamedDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExportSpecifier. */
  interface IExportSpecifier {
    /** ExportSpecifier exported */
    exported?: estree.INode | null;

    /** ExportSpecifier local */
    local?: estree.INode | null;
  }

  /** Represents an ExportSpecifier. */
  class ExportSpecifier implements IExportSpecifier {
    /**
     * Constructs a new ExportSpecifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExportSpecifier);

    /** ExportSpecifier exported. */
    public exported?: estree.INode | null;

    /** ExportSpecifier local. */
    public local?: estree.INode | null;

    /**
     * Creates a new ExportSpecifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExportSpecifier instance
     */
    public static create(properties?: estree.IExportSpecifier): estree.ExportSpecifier;

    /**
     * Encodes the specified ExportSpecifier message. Does not implicitly {@link estree.ExportSpecifier.verify|verify} messages.
     * @param message ExportSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExportSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExportSpecifier message, length delimited. Does not implicitly {@link estree.ExportSpecifier.verify|verify} messages.
     * @param message ExportSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExportSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExportSpecifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExportSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExportSpecifier;

    /**
     * Decodes an ExportSpecifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExportSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ExportSpecifier;

    /**
     * Verifies an ExportSpecifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExportSpecifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExportSpecifier
     */
    public static fromObject(object: { [k: string]: any }): estree.ExportSpecifier;

    /**
     * Creates a plain object from an ExportSpecifier message. Also converts values to other types if specified.
     * @param message ExportSpecifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExportSpecifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExportSpecifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExportSpecifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a VariableDeclaration. */
  interface IVariableDeclaration {
    /** VariableDeclaration declarations */
    declarations?: estree.INode[] | null;

    /** VariableDeclaration kind */
    kind?: string | null;
  }

  /** Represents a VariableDeclaration. */
  class VariableDeclaration implements IVariableDeclaration {
    /**
     * Constructs a new VariableDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IVariableDeclaration);

    /** VariableDeclaration declarations. */
    public declarations: estree.INode[];

    /** VariableDeclaration kind. */
    public kind: string;

    /**
     * Creates a new VariableDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns VariableDeclaration instance
     */
    public static create(properties?: estree.IVariableDeclaration): estree.VariableDeclaration;

    /**
     * Encodes the specified VariableDeclaration message. Does not implicitly {@link estree.VariableDeclaration.verify|verify} messages.
     * @param message VariableDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IVariableDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified VariableDeclaration message, length delimited. Does not implicitly {@link estree.VariableDeclaration.verify|verify} messages.
     * @param message VariableDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IVariableDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a VariableDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns VariableDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.VariableDeclaration;

    /**
     * Decodes a VariableDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns VariableDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.VariableDeclaration;

    /**
     * Verifies a VariableDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a VariableDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns VariableDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.VariableDeclaration;

    /**
     * Creates a plain object from a VariableDeclaration message. Also converts values to other types if specified.
     * @param message VariableDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.VariableDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this VariableDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for VariableDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a VariableDeclarator. */
  interface IVariableDeclarator {
    /** VariableDeclarator id */
    id?: estree.INode | null;

    /** VariableDeclarator init */
    init?: estree.INode | null;
  }

  /** Represents a VariableDeclarator. */
  class VariableDeclarator implements IVariableDeclarator {
    /**
     * Constructs a new VariableDeclarator.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IVariableDeclarator);

    /** VariableDeclarator id. */
    public id?: estree.INode | null;

    /** VariableDeclarator init. */
    public init?: estree.INode | null;

    /**
     * Creates a new VariableDeclarator instance using the specified properties.
     * @param [properties] Properties to set
     * @returns VariableDeclarator instance
     */
    public static create(properties?: estree.IVariableDeclarator): estree.VariableDeclarator;

    /**
     * Encodes the specified VariableDeclarator message. Does not implicitly {@link estree.VariableDeclarator.verify|verify} messages.
     * @param message VariableDeclarator message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IVariableDeclarator,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified VariableDeclarator message, length delimited. Does not implicitly {@link estree.VariableDeclarator.verify|verify} messages.
     * @param message VariableDeclarator message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IVariableDeclarator,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a VariableDeclarator message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns VariableDeclarator
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.VariableDeclarator;

    /**
     * Decodes a VariableDeclarator message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns VariableDeclarator
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.VariableDeclarator;

    /**
     * Verifies a VariableDeclarator message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a VariableDeclarator message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns VariableDeclarator
     */
    public static fromObject(object: { [k: string]: any }): estree.VariableDeclarator;

    /**
     * Creates a plain object from a VariableDeclarator message. Also converts values to other types if specified.
     * @param message VariableDeclarator
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.VariableDeclarator,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this VariableDeclarator to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for VariableDeclarator
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ImportDeclaration. */
  interface IImportDeclaration {
    /** ImportDeclaration specifiers */
    specifiers?: estree.INode[] | null;

    /** ImportDeclaration source */
    source?: estree.INode | null;
  }

  /** Represents an ImportDeclaration. */
  class ImportDeclaration implements IImportDeclaration {
    /**
     * Constructs a new ImportDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IImportDeclaration);

    /** ImportDeclaration specifiers. */
    public specifiers: estree.INode[];

    /** ImportDeclaration source. */
    public source?: estree.INode | null;

    /**
     * Creates a new ImportDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImportDeclaration instance
     */
    public static create(properties?: estree.IImportDeclaration): estree.ImportDeclaration;

    /**
     * Encodes the specified ImportDeclaration message. Does not implicitly {@link estree.ImportDeclaration.verify|verify} messages.
     * @param message ImportDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IImportDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ImportDeclaration message, length delimited. Does not implicitly {@link estree.ImportDeclaration.verify|verify} messages.
     * @param message ImportDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IImportDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ImportDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImportDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ImportDeclaration;

    /**
     * Decodes an ImportDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImportDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ImportDeclaration;

    /**
     * Verifies an ImportDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ImportDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImportDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.ImportDeclaration;

    /**
     * Creates a plain object from an ImportDeclaration message. Also converts values to other types if specified.
     * @param message ImportDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ImportDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ImportDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImportDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ImportNamespaceSpecifier. */
  interface IImportNamespaceSpecifier {
    /** ImportNamespaceSpecifier local */
    local?: estree.INode | null;
  }

  /** Represents an ImportNamespaceSpecifier. */
  class ImportNamespaceSpecifier implements IImportNamespaceSpecifier {
    /**
     * Constructs a new ImportNamespaceSpecifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IImportNamespaceSpecifier);

    /** ImportNamespaceSpecifier local. */
    public local?: estree.INode | null;

    /**
     * Creates a new ImportNamespaceSpecifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImportNamespaceSpecifier instance
     */
    public static create(
      properties?: estree.IImportNamespaceSpecifier,
    ): estree.ImportNamespaceSpecifier;

    /**
     * Encodes the specified ImportNamespaceSpecifier message. Does not implicitly {@link estree.ImportNamespaceSpecifier.verify|verify} messages.
     * @param message ImportNamespaceSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IImportNamespaceSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ImportNamespaceSpecifier message, length delimited. Does not implicitly {@link estree.ImportNamespaceSpecifier.verify|verify} messages.
     * @param message ImportNamespaceSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IImportNamespaceSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ImportNamespaceSpecifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImportNamespaceSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ImportNamespaceSpecifier;

    /**
     * Decodes an ImportNamespaceSpecifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImportNamespaceSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ImportNamespaceSpecifier;

    /**
     * Verifies an ImportNamespaceSpecifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ImportNamespaceSpecifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImportNamespaceSpecifier
     */
    public static fromObject(object: { [k: string]: any }): estree.ImportNamespaceSpecifier;

    /**
     * Creates a plain object from an ImportNamespaceSpecifier message. Also converts values to other types if specified.
     * @param message ImportNamespaceSpecifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ImportNamespaceSpecifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ImportNamespaceSpecifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImportNamespaceSpecifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ImportDefaultSpecifier. */
  interface IImportDefaultSpecifier {
    /** ImportDefaultSpecifier local */
    local?: estree.INode | null;
  }

  /** Represents an ImportDefaultSpecifier. */
  class ImportDefaultSpecifier implements IImportDefaultSpecifier {
    /**
     * Constructs a new ImportDefaultSpecifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IImportDefaultSpecifier);

    /** ImportDefaultSpecifier local. */
    public local?: estree.INode | null;

    /**
     * Creates a new ImportDefaultSpecifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImportDefaultSpecifier instance
     */
    public static create(
      properties?: estree.IImportDefaultSpecifier,
    ): estree.ImportDefaultSpecifier;

    /**
     * Encodes the specified ImportDefaultSpecifier message. Does not implicitly {@link estree.ImportDefaultSpecifier.verify|verify} messages.
     * @param message ImportDefaultSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IImportDefaultSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ImportDefaultSpecifier message, length delimited. Does not implicitly {@link estree.ImportDefaultSpecifier.verify|verify} messages.
     * @param message ImportDefaultSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IImportDefaultSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ImportDefaultSpecifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImportDefaultSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ImportDefaultSpecifier;

    /**
     * Decodes an ImportDefaultSpecifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImportDefaultSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ImportDefaultSpecifier;

    /**
     * Verifies an ImportDefaultSpecifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ImportDefaultSpecifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImportDefaultSpecifier
     */
    public static fromObject(object: { [k: string]: any }): estree.ImportDefaultSpecifier;

    /**
     * Creates a plain object from an ImportDefaultSpecifier message. Also converts values to other types if specified.
     * @param message ImportDefaultSpecifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ImportDefaultSpecifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ImportDefaultSpecifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImportDefaultSpecifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ImportSpecifier. */
  interface IImportSpecifier {
    /** ImportSpecifier imported */
    imported?: estree.INode | null;

    /** ImportSpecifier local */
    local?: estree.INode | null;
  }

  /** Represents an ImportSpecifier. */
  class ImportSpecifier implements IImportSpecifier {
    /**
     * Constructs a new ImportSpecifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IImportSpecifier);

    /** ImportSpecifier imported. */
    public imported?: estree.INode | null;

    /** ImportSpecifier local. */
    public local?: estree.INode | null;

    /**
     * Creates a new ImportSpecifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImportSpecifier instance
     */
    public static create(properties?: estree.IImportSpecifier): estree.ImportSpecifier;

    /**
     * Encodes the specified ImportSpecifier message. Does not implicitly {@link estree.ImportSpecifier.verify|verify} messages.
     * @param message ImportSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IImportSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ImportSpecifier message, length delimited. Does not implicitly {@link estree.ImportSpecifier.verify|verify} messages.
     * @param message ImportSpecifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IImportSpecifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ImportSpecifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImportSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ImportSpecifier;

    /**
     * Decodes an ImportSpecifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImportSpecifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ImportSpecifier;

    /**
     * Verifies an ImportSpecifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ImportSpecifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImportSpecifier
     */
    public static fromObject(object: { [k: string]: any }): estree.ImportSpecifier;

    /**
     * Creates a plain object from an ImportSpecifier message. Also converts values to other types if specified.
     * @param message ImportSpecifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ImportSpecifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ImportSpecifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImportSpecifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ForOfStatement. */
  interface IForOfStatement {
    /** ForOfStatement await */
    await?: boolean | null;

    /** ForOfStatement left */
    left?: estree.INode | null;

    /** ForOfStatement right */
    right?: estree.INode | null;

    /** ForOfStatement body */
    body?: estree.INode | null;
  }

  /** Represents a ForOfStatement. */
  class ForOfStatement implements IForOfStatement {
    /**
     * Constructs a new ForOfStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IForOfStatement);

    /** ForOfStatement await. */
    public await: boolean;

    /** ForOfStatement left. */
    public left?: estree.INode | null;

    /** ForOfStatement right. */
    public right?: estree.INode | null;

    /** ForOfStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new ForOfStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ForOfStatement instance
     */
    public static create(properties?: estree.IForOfStatement): estree.ForOfStatement;

    /**
     * Encodes the specified ForOfStatement message. Does not implicitly {@link estree.ForOfStatement.verify|verify} messages.
     * @param message ForOfStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IForOfStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ForOfStatement message, length delimited. Does not implicitly {@link estree.ForOfStatement.verify|verify} messages.
     * @param message ForOfStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IForOfStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ForOfStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ForOfStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ForOfStatement;

    /**
     * Decodes a ForOfStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ForOfStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ForOfStatement;

    /**
     * Verifies a ForOfStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ForOfStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ForOfStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ForOfStatement;

    /**
     * Creates a plain object from a ForOfStatement message. Also converts values to other types if specified.
     * @param message ForOfStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ForOfStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ForOfStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ForOfStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ForInStatement. */
  interface IForInStatement {
    /** ForInStatement left */
    left?: estree.INode | null;

    /** ForInStatement right */
    right?: estree.INode | null;

    /** ForInStatement body */
    body?: estree.INode | null;
  }

  /** Represents a ForInStatement. */
  class ForInStatement implements IForInStatement {
    /**
     * Constructs a new ForInStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IForInStatement);

    /** ForInStatement left. */
    public left?: estree.INode | null;

    /** ForInStatement right. */
    public right?: estree.INode | null;

    /** ForInStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new ForInStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ForInStatement instance
     */
    public static create(properties?: estree.IForInStatement): estree.ForInStatement;

    /**
     * Encodes the specified ForInStatement message. Does not implicitly {@link estree.ForInStatement.verify|verify} messages.
     * @param message ForInStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IForInStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ForInStatement message, length delimited. Does not implicitly {@link estree.ForInStatement.verify|verify} messages.
     * @param message ForInStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IForInStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ForInStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ForInStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ForInStatement;

    /**
     * Decodes a ForInStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ForInStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ForInStatement;

    /**
     * Verifies a ForInStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ForInStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ForInStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ForInStatement;

    /**
     * Creates a plain object from a ForInStatement message. Also converts values to other types if specified.
     * @param message ForInStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ForInStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ForInStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ForInStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ForStatement. */
  interface IForStatement {
    /** ForStatement init */
    init?: estree.INode | null;

    /** ForStatement test */
    test?: estree.INode | null;

    /** ForStatement update */
    update?: estree.INode | null;

    /** ForStatement body */
    body?: estree.INode | null;
  }

  /** Represents a ForStatement. */
  class ForStatement implements IForStatement {
    /**
     * Constructs a new ForStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IForStatement);

    /** ForStatement init. */
    public init?: estree.INode | null;

    /** ForStatement test. */
    public test?: estree.INode | null;

    /** ForStatement update. */
    public update?: estree.INode | null;

    /** ForStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new ForStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ForStatement instance
     */
    public static create(properties?: estree.IForStatement): estree.ForStatement;

    /**
     * Encodes the specified ForStatement message. Does not implicitly {@link estree.ForStatement.verify|verify} messages.
     * @param message ForStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IForStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ForStatement message, length delimited. Does not implicitly {@link estree.ForStatement.verify|verify} messages.
     * @param message ForStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IForStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ForStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ForStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ForStatement;

    /**
     * Decodes a ForStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ForStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ForStatement;

    /**
     * Verifies a ForStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ForStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ForStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ForStatement;

    /**
     * Creates a plain object from a ForStatement message. Also converts values to other types if specified.
     * @param message ForStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ForStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ForStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ForStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a DoWhileStatement. */
  interface IDoWhileStatement {
    /** DoWhileStatement body */
    body?: estree.INode | null;

    /** DoWhileStatement test */
    test?: estree.INode | null;
  }

  /** Represents a DoWhileStatement. */
  class DoWhileStatement implements IDoWhileStatement {
    /**
     * Constructs a new DoWhileStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IDoWhileStatement);

    /** DoWhileStatement body. */
    public body?: estree.INode | null;

    /** DoWhileStatement test. */
    public test?: estree.INode | null;

    /**
     * Creates a new DoWhileStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DoWhileStatement instance
     */
    public static create(properties?: estree.IDoWhileStatement): estree.DoWhileStatement;

    /**
     * Encodes the specified DoWhileStatement message. Does not implicitly {@link estree.DoWhileStatement.verify|verify} messages.
     * @param message DoWhileStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IDoWhileStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified DoWhileStatement message, length delimited. Does not implicitly {@link estree.DoWhileStatement.verify|verify} messages.
     * @param message DoWhileStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IDoWhileStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a DoWhileStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DoWhileStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.DoWhileStatement;

    /**
     * Decodes a DoWhileStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DoWhileStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.DoWhileStatement;

    /**
     * Verifies a DoWhileStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a DoWhileStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DoWhileStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.DoWhileStatement;

    /**
     * Creates a plain object from a DoWhileStatement message. Also converts values to other types if specified.
     * @param message DoWhileStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.DoWhileStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this DoWhileStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DoWhileStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a WhileStatement. */
  interface IWhileStatement {
    /** WhileStatement test */
    test?: estree.INode | null;

    /** WhileStatement body */
    body?: estree.INode | null;
  }

  /** Represents a WhileStatement. */
  class WhileStatement implements IWhileStatement {
    /**
     * Constructs a new WhileStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IWhileStatement);

    /** WhileStatement test. */
    public test?: estree.INode | null;

    /** WhileStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new WhileStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WhileStatement instance
     */
    public static create(properties?: estree.IWhileStatement): estree.WhileStatement;

    /**
     * Encodes the specified WhileStatement message. Does not implicitly {@link estree.WhileStatement.verify|verify} messages.
     * @param message WhileStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IWhileStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified WhileStatement message, length delimited. Does not implicitly {@link estree.WhileStatement.verify|verify} messages.
     * @param message WhileStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IWhileStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a WhileStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WhileStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.WhileStatement;

    /**
     * Decodes a WhileStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WhileStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.WhileStatement;

    /**
     * Verifies a WhileStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a WhileStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WhileStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.WhileStatement;

    /**
     * Creates a plain object from a WhileStatement message. Also converts values to other types if specified.
     * @param message WhileStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.WhileStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this WhileStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for WhileStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TryStatement. */
  interface ITryStatement {
    /** TryStatement block */
    block?: estree.INode | null;

    /** TryStatement handler */
    handler?: estree.INode | null;

    /** TryStatement finalizer */
    finalizer?: estree.INode | null;
  }

  /** Represents a TryStatement. */
  class TryStatement implements ITryStatement {
    /**
     * Constructs a new TryStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITryStatement);

    /** TryStatement block. */
    public block?: estree.INode | null;

    /** TryStatement handler. */
    public handler?: estree.INode | null;

    /** TryStatement finalizer. */
    public finalizer?: estree.INode | null;

    /**
     * Creates a new TryStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TryStatement instance
     */
    public static create(properties?: estree.ITryStatement): estree.TryStatement;

    /**
     * Encodes the specified TryStatement message. Does not implicitly {@link estree.TryStatement.verify|verify} messages.
     * @param message TryStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITryStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TryStatement message, length delimited. Does not implicitly {@link estree.TryStatement.verify|verify} messages.
     * @param message TryStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITryStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TryStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TryStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TryStatement;

    /**
     * Decodes a TryStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TryStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.TryStatement;

    /**
     * Verifies a TryStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TryStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TryStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.TryStatement;

    /**
     * Creates a plain object from a TryStatement message. Also converts values to other types if specified.
     * @param message TryStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TryStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TryStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TryStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a CatchClause. */
  interface ICatchClause {
    /** CatchClause param */
    param?: estree.INode | null;

    /** CatchClause body */
    body?: estree.INode | null;
  }

  /** Represents a CatchClause. */
  class CatchClause implements ICatchClause {
    /**
     * Constructs a new CatchClause.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ICatchClause);

    /** CatchClause param. */
    public param?: estree.INode | null;

    /** CatchClause body. */
    public body?: estree.INode | null;

    /**
     * Creates a new CatchClause instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CatchClause instance
     */
    public static create(properties?: estree.ICatchClause): estree.CatchClause;

    /**
     * Encodes the specified CatchClause message. Does not implicitly {@link estree.CatchClause.verify|verify} messages.
     * @param message CatchClause message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.ICatchClause, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CatchClause message, length delimited. Does not implicitly {@link estree.CatchClause.verify|verify} messages.
     * @param message CatchClause message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ICatchClause,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a CatchClause message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CatchClause
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.CatchClause;

    /**
     * Decodes a CatchClause message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CatchClause
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.CatchClause;

    /**
     * Verifies a CatchClause message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a CatchClause message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CatchClause
     */
    public static fromObject(object: { [k: string]: any }): estree.CatchClause;

    /**
     * Creates a plain object from a CatchClause message. Also converts values to other types if specified.
     * @param message CatchClause
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.CatchClause,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this CatchClause to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for CatchClause
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ThrowStatement. */
  interface IThrowStatement {
    /** ThrowStatement argument */
    argument?: estree.INode | null;
  }

  /** Represents a ThrowStatement. */
  class ThrowStatement implements IThrowStatement {
    /**
     * Constructs a new ThrowStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IThrowStatement);

    /** ThrowStatement argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new ThrowStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ThrowStatement instance
     */
    public static create(properties?: estree.IThrowStatement): estree.ThrowStatement;

    /**
     * Encodes the specified ThrowStatement message. Does not implicitly {@link estree.ThrowStatement.verify|verify} messages.
     * @param message ThrowStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IThrowStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ThrowStatement message, length delimited. Does not implicitly {@link estree.ThrowStatement.verify|verify} messages.
     * @param message ThrowStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IThrowStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ThrowStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ThrowStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ThrowStatement;

    /**
     * Decodes a ThrowStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ThrowStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ThrowStatement;

    /**
     * Verifies a ThrowStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ThrowStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ThrowStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ThrowStatement;

    /**
     * Creates a plain object from a ThrowStatement message. Also converts values to other types if specified.
     * @param message ThrowStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ThrowStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ThrowStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ThrowStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SwitchStatement. */
  interface ISwitchStatement {
    /** SwitchStatement discriminant */
    discriminant?: estree.INode | null;

    /** SwitchStatement cases */
    cases?: estree.INode[] | null;
  }

  /** Represents a SwitchStatement. */
  class SwitchStatement implements ISwitchStatement {
    /**
     * Constructs a new SwitchStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISwitchStatement);

    /** SwitchStatement discriminant. */
    public discriminant?: estree.INode | null;

    /** SwitchStatement cases. */
    public cases: estree.INode[];

    /**
     * Creates a new SwitchStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SwitchStatement instance
     */
    public static create(properties?: estree.ISwitchStatement): estree.SwitchStatement;

    /**
     * Encodes the specified SwitchStatement message. Does not implicitly {@link estree.SwitchStatement.verify|verify} messages.
     * @param message SwitchStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ISwitchStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SwitchStatement message, length delimited. Does not implicitly {@link estree.SwitchStatement.verify|verify} messages.
     * @param message SwitchStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISwitchStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SwitchStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SwitchStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.SwitchStatement;

    /**
     * Decodes a SwitchStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SwitchStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.SwitchStatement;

    /**
     * Verifies a SwitchStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SwitchStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SwitchStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.SwitchStatement;

    /**
     * Creates a plain object from a SwitchStatement message. Also converts values to other types if specified.
     * @param message SwitchStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.SwitchStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SwitchStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SwitchStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SwitchCase. */
  interface ISwitchCase {
    /** SwitchCase test */
    test?: estree.INode | null;

    /** SwitchCase consequent */
    consequent?: estree.INode[] | null;
  }

  /** Represents a SwitchCase. */
  class SwitchCase implements ISwitchCase {
    /**
     * Constructs a new SwitchCase.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ISwitchCase);

    /** SwitchCase test. */
    public test?: estree.INode | null;

    /** SwitchCase consequent. */
    public consequent: estree.INode[];

    /**
     * Creates a new SwitchCase instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SwitchCase instance
     */
    public static create(properties?: estree.ISwitchCase): estree.SwitchCase;

    /**
     * Encodes the specified SwitchCase message. Does not implicitly {@link estree.SwitchCase.verify|verify} messages.
     * @param message SwitchCase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.ISwitchCase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SwitchCase message, length delimited. Does not implicitly {@link estree.SwitchCase.verify|verify} messages.
     * @param message SwitchCase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ISwitchCase,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SwitchCase message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SwitchCase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.SwitchCase;

    /**
     * Decodes a SwitchCase message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SwitchCase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.SwitchCase;

    /**
     * Verifies a SwitchCase message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SwitchCase message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SwitchCase
     */
    public static fromObject(object: { [k: string]: any }): estree.SwitchCase;

    /**
     * Creates a plain object from a SwitchCase message. Also converts values to other types if specified.
     * @param message SwitchCase
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.SwitchCase,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SwitchCase to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SwitchCase
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an IfStatement. */
  interface IIfStatement {
    /** IfStatement test */
    test?: estree.INode | null;

    /** IfStatement consequent */
    consequent?: estree.INode | null;

    /** IfStatement alternate */
    alternate?: estree.INode | null;
  }

  /** Represents an IfStatement. */
  class IfStatement implements IIfStatement {
    /**
     * Constructs a new IfStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IIfStatement);

    /** IfStatement test. */
    public test?: estree.INode | null;

    /** IfStatement consequent. */
    public consequent?: estree.INode | null;

    /** IfStatement alternate. */
    public alternate?: estree.INode | null;

    /**
     * Creates a new IfStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns IfStatement instance
     */
    public static create(properties?: estree.IIfStatement): estree.IfStatement;

    /**
     * Encodes the specified IfStatement message. Does not implicitly {@link estree.IfStatement.verify|verify} messages.
     * @param message IfStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IIfStatement, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified IfStatement message, length delimited. Does not implicitly {@link estree.IfStatement.verify|verify} messages.
     * @param message IfStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IIfStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an IfStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns IfStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.IfStatement;

    /**
     * Decodes an IfStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns IfStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.IfStatement;

    /**
     * Verifies an IfStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an IfStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns IfStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.IfStatement;

    /**
     * Creates a plain object from an IfStatement message. Also converts values to other types if specified.
     * @param message IfStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.IfStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this IfStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for IfStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ContinueStatement. */
  interface IContinueStatement {
    /** ContinueStatement label */
    label?: estree.INode | null;
  }

  /** Represents a ContinueStatement. */
  class ContinueStatement implements IContinueStatement {
    /**
     * Constructs a new ContinueStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IContinueStatement);

    /** ContinueStatement label. */
    public label?: estree.INode | null;

    /**
     * Creates a new ContinueStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ContinueStatement instance
     */
    public static create(properties?: estree.IContinueStatement): estree.ContinueStatement;

    /**
     * Encodes the specified ContinueStatement message. Does not implicitly {@link estree.ContinueStatement.verify|verify} messages.
     * @param message ContinueStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IContinueStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ContinueStatement message, length delimited. Does not implicitly {@link estree.ContinueStatement.verify|verify} messages.
     * @param message ContinueStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IContinueStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ContinueStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ContinueStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ContinueStatement;

    /**
     * Decodes a ContinueStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ContinueStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ContinueStatement;

    /**
     * Verifies a ContinueStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ContinueStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ContinueStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ContinueStatement;

    /**
     * Creates a plain object from a ContinueStatement message. Also converts values to other types if specified.
     * @param message ContinueStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ContinueStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ContinueStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ContinueStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a BreakStatement. */
  interface IBreakStatement {
    /** BreakStatement label */
    label?: estree.INode | null;
  }

  /** Represents a BreakStatement. */
  class BreakStatement implements IBreakStatement {
    /**
     * Constructs a new BreakStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IBreakStatement);

    /** BreakStatement label. */
    public label?: estree.INode | null;

    /**
     * Creates a new BreakStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns BreakStatement instance
     */
    public static create(properties?: estree.IBreakStatement): estree.BreakStatement;

    /**
     * Encodes the specified BreakStatement message. Does not implicitly {@link estree.BreakStatement.verify|verify} messages.
     * @param message BreakStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IBreakStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified BreakStatement message, length delimited. Does not implicitly {@link estree.BreakStatement.verify|verify} messages.
     * @param message BreakStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IBreakStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a BreakStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns BreakStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.BreakStatement;

    /**
     * Decodes a BreakStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns BreakStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.BreakStatement;

    /**
     * Verifies a BreakStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a BreakStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns BreakStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.BreakStatement;

    /**
     * Creates a plain object from a BreakStatement message. Also converts values to other types if specified.
     * @param message BreakStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.BreakStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this BreakStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for BreakStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a LabeledStatement. */
  interface ILabeledStatement {
    /** LabeledStatement label */
    label?: estree.INode | null;

    /** LabeledStatement body */
    body?: estree.INode | null;
  }

  /** Represents a LabeledStatement. */
  class LabeledStatement implements ILabeledStatement {
    /**
     * Constructs a new LabeledStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ILabeledStatement);

    /** LabeledStatement label. */
    public label?: estree.INode | null;

    /** LabeledStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new LabeledStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns LabeledStatement instance
     */
    public static create(properties?: estree.ILabeledStatement): estree.LabeledStatement;

    /**
     * Encodes the specified LabeledStatement message. Does not implicitly {@link estree.LabeledStatement.verify|verify} messages.
     * @param message LabeledStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ILabeledStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified LabeledStatement message, length delimited. Does not implicitly {@link estree.LabeledStatement.verify|verify} messages.
     * @param message LabeledStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ILabeledStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a LabeledStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns LabeledStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.LabeledStatement;

    /**
     * Decodes a LabeledStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns LabeledStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.LabeledStatement;

    /**
     * Verifies a LabeledStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a LabeledStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns LabeledStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.LabeledStatement;

    /**
     * Creates a plain object from a LabeledStatement message. Also converts values to other types if specified.
     * @param message LabeledStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.LabeledStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this LabeledStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for LabeledStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ReturnStatement. */
  interface IReturnStatement {
    /** ReturnStatement argument */
    argument?: estree.INode | null;
  }

  /** Represents a ReturnStatement. */
  class ReturnStatement implements IReturnStatement {
    /**
     * Constructs a new ReturnStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IReturnStatement);

    /** ReturnStatement argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new ReturnStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ReturnStatement instance
     */
    public static create(properties?: estree.IReturnStatement): estree.ReturnStatement;

    /**
     * Encodes the specified ReturnStatement message. Does not implicitly {@link estree.ReturnStatement.verify|verify} messages.
     * @param message ReturnStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IReturnStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ReturnStatement message, length delimited. Does not implicitly {@link estree.ReturnStatement.verify|verify} messages.
     * @param message ReturnStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IReturnStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ReturnStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ReturnStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ReturnStatement;

    /**
     * Decodes a ReturnStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ReturnStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ReturnStatement;

    /**
     * Verifies a ReturnStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ReturnStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ReturnStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ReturnStatement;

    /**
     * Creates a plain object from a ReturnStatement message. Also converts values to other types if specified.
     * @param message ReturnStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ReturnStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ReturnStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ReturnStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a WithStatement. */
  interface IWithStatement {
    /** WithStatement object */
    object?: estree.INode | null;

    /** WithStatement body */
    body?: estree.INode | null;
  }

  /** Represents a WithStatement. */
  class WithStatement implements IWithStatement {
    /**
     * Constructs a new WithStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IWithStatement);

    /** WithStatement object. */
    public object?: estree.INode | null;

    /** WithStatement body. */
    public body?: estree.INode | null;

    /**
     * Creates a new WithStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WithStatement instance
     */
    public static create(properties?: estree.IWithStatement): estree.WithStatement;

    /**
     * Encodes the specified WithStatement message. Does not implicitly {@link estree.WithStatement.verify|verify} messages.
     * @param message WithStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IWithStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified WithStatement message, length delimited. Does not implicitly {@link estree.WithStatement.verify|verify} messages.
     * @param message WithStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IWithStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a WithStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WithStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.WithStatement;

    /**
     * Decodes a WithStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WithStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.WithStatement;

    /**
     * Verifies a WithStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a WithStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WithStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.WithStatement;

    /**
     * Creates a plain object from a WithStatement message. Also converts values to other types if specified.
     * @param message WithStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.WithStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this WithStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for WithStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a DebuggerStatement. */
  interface IDebuggerStatement {}

  /** Represents a DebuggerStatement. */
  class DebuggerStatement implements IDebuggerStatement {
    /**
     * Constructs a new DebuggerStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IDebuggerStatement);

    /**
     * Creates a new DebuggerStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DebuggerStatement instance
     */
    public static create(properties?: estree.IDebuggerStatement): estree.DebuggerStatement;

    /**
     * Encodes the specified DebuggerStatement message. Does not implicitly {@link estree.DebuggerStatement.verify|verify} messages.
     * @param message DebuggerStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IDebuggerStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified DebuggerStatement message, length delimited. Does not implicitly {@link estree.DebuggerStatement.verify|verify} messages.
     * @param message DebuggerStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IDebuggerStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a DebuggerStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DebuggerStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.DebuggerStatement;

    /**
     * Decodes a DebuggerStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DebuggerStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.DebuggerStatement;

    /**
     * Verifies a DebuggerStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a DebuggerStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DebuggerStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.DebuggerStatement;

    /**
     * Creates a plain object from a DebuggerStatement message. Also converts values to other types if specified.
     * @param message DebuggerStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.DebuggerStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this DebuggerStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DebuggerStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an EmptyStatement. */
  interface IEmptyStatement {}

  /** Represents an EmptyStatement. */
  class EmptyStatement implements IEmptyStatement {
    /**
     * Constructs a new EmptyStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IEmptyStatement);

    /**
     * Creates a new EmptyStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns EmptyStatement instance
     */
    public static create(properties?: estree.IEmptyStatement): estree.EmptyStatement;

    /**
     * Encodes the specified EmptyStatement message. Does not implicitly {@link estree.EmptyStatement.verify|verify} messages.
     * @param message EmptyStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IEmptyStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified EmptyStatement message, length delimited. Does not implicitly {@link estree.EmptyStatement.verify|verify} messages.
     * @param message EmptyStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IEmptyStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an EmptyStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns EmptyStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.EmptyStatement;

    /**
     * Decodes an EmptyStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns EmptyStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.EmptyStatement;

    /**
     * Verifies an EmptyStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an EmptyStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns EmptyStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.EmptyStatement;

    /**
     * Creates a plain object from an EmptyStatement message. Also converts values to other types if specified.
     * @param message EmptyStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.EmptyStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this EmptyStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for EmptyStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExpressionStatement. */
  interface IExpressionStatement {
    /** ExpressionStatement expression */
    expression?: estree.INode | null;

    /** ExpressionStatement directive */
    directive?: string | null;
  }

  /** Represents an ExpressionStatement. */
  class ExpressionStatement implements IExpressionStatement {
    /**
     * Constructs a new ExpressionStatement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExpressionStatement);

    /** ExpressionStatement expression. */
    public expression?: estree.INode | null;

    /** ExpressionStatement directive. */
    public directive?: string | null;

    /**
     * Creates a new ExpressionStatement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExpressionStatement instance
     */
    public static create(properties?: estree.IExpressionStatement): estree.ExpressionStatement;

    /**
     * Encodes the specified ExpressionStatement message. Does not implicitly {@link estree.ExpressionStatement.verify|verify} messages.
     * @param message ExpressionStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExpressionStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExpressionStatement message, length delimited. Does not implicitly {@link estree.ExpressionStatement.verify|verify} messages.
     * @param message ExpressionStatement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExpressionStatement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExpressionStatement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExpressionStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExpressionStatement;

    /**
     * Decodes an ExpressionStatement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExpressionStatement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.ExpressionStatement;

    /**
     * Verifies an ExpressionStatement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExpressionStatement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExpressionStatement
     */
    public static fromObject(object: { [k: string]: any }): estree.ExpressionStatement;

    /**
     * Creates a plain object from an ExpressionStatement message. Also converts values to other types if specified.
     * @param message ExpressionStatement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExpressionStatement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExpressionStatement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExpressionStatement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TemplateElement. */
  interface ITemplateElement {
    /** TemplateElement tail */
    tail?: boolean | null;

    /** TemplateElement cooked */
    cooked?: string | null;

    /** TemplateElement raw */
    raw?: string | null;
  }

  /** Represents a TemplateElement. */
  class TemplateElement implements ITemplateElement {
    /**
     * Constructs a new TemplateElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITemplateElement);

    /** TemplateElement tail. */
    public tail: boolean;

    /** TemplateElement cooked. */
    public cooked?: string | null;

    /** TemplateElement raw. */
    public raw: string;

    /**
     * Creates a new TemplateElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TemplateElement instance
     */
    public static create(properties?: estree.ITemplateElement): estree.TemplateElement;

    /**
     * Encodes the specified TemplateElement message. Does not implicitly {@link estree.TemplateElement.verify|verify} messages.
     * @param message TemplateElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITemplateElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TemplateElement message, length delimited. Does not implicitly {@link estree.TemplateElement.verify|verify} messages.
     * @param message TemplateElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITemplateElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TemplateElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TemplateElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TemplateElement;

    /**
     * Decodes a TemplateElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TemplateElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.TemplateElement;

    /**
     * Verifies a TemplateElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TemplateElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TemplateElement
     */
    public static fromObject(object: { [k: string]: any }): estree.TemplateElement;

    /**
     * Creates a plain object from a TemplateElement message. Also converts values to other types if specified.
     * @param message TemplateElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TemplateElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TemplateElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TemplateElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a FunctionExpression. */
  interface IFunctionExpression {
    /** FunctionExpression id */
    id?: estree.INode | null;

    /** FunctionExpression body */
    body?: estree.INode | null;

    /** FunctionExpression params */
    params?: estree.INode[] | null;

    /** FunctionExpression generator */
    generator?: boolean | null;

    /** FunctionExpression async */
    async?: boolean | null;
  }

  /** Represents a FunctionExpression. */
  class FunctionExpression implements IFunctionExpression {
    /**
     * Constructs a new FunctionExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IFunctionExpression);

    /** FunctionExpression id. */
    public id?: estree.INode | null;

    /** FunctionExpression body. */
    public body?: estree.INode | null;

    /** FunctionExpression params. */
    public params: estree.INode[];

    /** FunctionExpression generator. */
    public generator?: boolean | null;

    /** FunctionExpression async. */
    public async?: boolean | null;

    /**
     * Creates a new FunctionExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FunctionExpression instance
     */
    public static create(properties?: estree.IFunctionExpression): estree.FunctionExpression;

    /**
     * Encodes the specified FunctionExpression message. Does not implicitly {@link estree.FunctionExpression.verify|verify} messages.
     * @param message FunctionExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IFunctionExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified FunctionExpression message, length delimited. Does not implicitly {@link estree.FunctionExpression.verify|verify} messages.
     * @param message FunctionExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IFunctionExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FunctionExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FunctionExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.FunctionExpression;

    /**
     * Decodes a FunctionExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FunctionExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.FunctionExpression;

    /**
     * Verifies a FunctionExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FunctionExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FunctionExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.FunctionExpression;

    /**
     * Creates a plain object from a FunctionExpression message. Also converts values to other types if specified.
     * @param message FunctionExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.FunctionExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FunctionExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FunctionExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ExportAssignment. */
  interface IExportAssignment {
    /** ExportAssignment expression */
    expression?: estree.INode | null;
  }

  /** Represents an ExportAssignment. */
  class ExportAssignment implements IExportAssignment {
    /**
     * Constructs a new ExportAssignment.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IExportAssignment);

    /** ExportAssignment expression. */
    public expression?: estree.INode | null;

    /**
     * Creates a new ExportAssignment instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExportAssignment instance
     */
    public static create(properties?: estree.IExportAssignment): estree.ExportAssignment;

    /**
     * Encodes the specified ExportAssignment message. Does not implicitly {@link estree.ExportAssignment.verify|verify} messages.
     * @param message ExportAssignment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IExportAssignment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ExportAssignment message, length delimited. Does not implicitly {@link estree.ExportAssignment.verify|verify} messages.
     * @param message ExportAssignment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IExportAssignment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ExportAssignment message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExportAssignment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.ExportAssignment;

    /**
     * Decodes an ExportAssignment message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExportAssignment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.ExportAssignment;

    /**
     * Verifies an ExportAssignment message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ExportAssignment message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExportAssignment
     */
    public static fromObject(object: { [k: string]: any }): estree.ExportAssignment;

    /**
     * Creates a plain object from an ExportAssignment message. Also converts values to other types if specified.
     * @param message ExportAssignment
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.ExportAssignment,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ExportAssignment to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExportAssignment
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSImportEqualsDeclaration. */
  interface ITSImportEqualsDeclaration {
    /** TSImportEqualsDeclaration id */
    id?: estree.INode | null;

    /** TSImportEqualsDeclaration moduleReference */
    moduleReference?: estree.INode | null;

    /** TSImportEqualsDeclaration importKind */
    importKind?: string | null;
  }

  /** Represents a TSImportEqualsDeclaration. */
  class TSImportEqualsDeclaration implements ITSImportEqualsDeclaration {
    /**
     * Constructs a new TSImportEqualsDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSImportEqualsDeclaration);

    /** TSImportEqualsDeclaration id. */
    public id?: estree.INode | null;

    /** TSImportEqualsDeclaration moduleReference. */
    public moduleReference?: estree.INode | null;

    /** TSImportEqualsDeclaration importKind. */
    public importKind: string;

    /**
     * Creates a new TSImportEqualsDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSImportEqualsDeclaration instance
     */
    public static create(
      properties?: estree.ITSImportEqualsDeclaration,
    ): estree.TSImportEqualsDeclaration;

    /**
     * Encodes the specified TSImportEqualsDeclaration message. Does not implicitly {@link estree.TSImportEqualsDeclaration.verify|verify} messages.
     * @param message TSImportEqualsDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSImportEqualsDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSImportEqualsDeclaration message, length delimited. Does not implicitly {@link estree.TSImportEqualsDeclaration.verify|verify} messages.
     * @param message TSImportEqualsDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSImportEqualsDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSImportEqualsDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSImportEqualsDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSImportEqualsDeclaration;

    /**
     * Decodes a TSImportEqualsDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSImportEqualsDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.TSImportEqualsDeclaration;

    /**
     * Verifies a TSImportEqualsDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSImportEqualsDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSImportEqualsDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.TSImportEqualsDeclaration;

    /**
     * Creates a plain object from a TSImportEqualsDeclaration message. Also converts values to other types if specified.
     * @param message TSImportEqualsDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSImportEqualsDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSImportEqualsDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSImportEqualsDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSQualifiedName. */
  interface ITSQualifiedName {
    /** TSQualifiedName left */
    left?: estree.INode | null;

    /** TSQualifiedName right */
    right?: estree.INode | null;
  }

  /** Represents a TSQualifiedName. */
  class TSQualifiedName implements ITSQualifiedName {
    /**
     * Constructs a new TSQualifiedName.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSQualifiedName);

    /** TSQualifiedName left. */
    public left?: estree.INode | null;

    /** TSQualifiedName right. */
    public right?: estree.INode | null;

    /**
     * Creates a new TSQualifiedName instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSQualifiedName instance
     */
    public static create(properties?: estree.ITSQualifiedName): estree.TSQualifiedName;

    /**
     * Encodes the specified TSQualifiedName message. Does not implicitly {@link estree.TSQualifiedName.verify|verify} messages.
     * @param message TSQualifiedName message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSQualifiedName,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSQualifiedName message, length delimited. Does not implicitly {@link estree.TSQualifiedName.verify|verify} messages.
     * @param message TSQualifiedName message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSQualifiedName,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSQualifiedName message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSQualifiedName
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSQualifiedName;

    /**
     * Decodes a TSQualifiedName message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSQualifiedName
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.TSQualifiedName;

    /**
     * Verifies a TSQualifiedName message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSQualifiedName message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSQualifiedName
     */
    public static fromObject(object: { [k: string]: any }): estree.TSQualifiedName;

    /**
     * Creates a plain object from a TSQualifiedName message. Also converts values to other types if specified.
     * @param message TSQualifiedName
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSQualifiedName,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSQualifiedName to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSQualifiedName
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSExternalModuleReference. */
  interface ITSExternalModuleReference {
    /** TSExternalModuleReference expression */
    expression?: estree.INode | null;
  }

  /** Represents a TSExternalModuleReference. */
  class TSExternalModuleReference implements ITSExternalModuleReference {
    /**
     * Constructs a new TSExternalModuleReference.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSExternalModuleReference);

    /** TSExternalModuleReference expression. */
    public expression?: estree.INode | null;

    /**
     * Creates a new TSExternalModuleReference instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSExternalModuleReference instance
     */
    public static create(
      properties?: estree.ITSExternalModuleReference,
    ): estree.TSExternalModuleReference;

    /**
     * Encodes the specified TSExternalModuleReference message. Does not implicitly {@link estree.TSExternalModuleReference.verify|verify} messages.
     * @param message TSExternalModuleReference message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSExternalModuleReference,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSExternalModuleReference message, length delimited. Does not implicitly {@link estree.TSExternalModuleReference.verify|verify} messages.
     * @param message TSExternalModuleReference message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSExternalModuleReference,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSExternalModuleReference message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSExternalModuleReference
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSExternalModuleReference;

    /**
     * Decodes a TSExternalModuleReference message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSExternalModuleReference
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.TSExternalModuleReference;

    /**
     * Verifies a TSExternalModuleReference message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSExternalModuleReference message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSExternalModuleReference
     */
    public static fromObject(object: { [k: string]: any }): estree.TSExternalModuleReference;

    /**
     * Creates a plain object from a TSExternalModuleReference message. Also converts values to other types if specified.
     * @param message TSExternalModuleReference
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSExternalModuleReference,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSExternalModuleReference to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSExternalModuleReference
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSModuleBlock. */
  interface ITSModuleBlock {
    /** TSModuleBlock body */
    body?: estree.INode[] | null;
  }

  /** Represents a TSModuleBlock. */
  class TSModuleBlock implements ITSModuleBlock {
    /**
     * Constructs a new TSModuleBlock.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSModuleBlock);

    /** TSModuleBlock body. */
    public body: estree.INode[];

    /**
     * Creates a new TSModuleBlock instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSModuleBlock instance
     */
    public static create(properties?: estree.ITSModuleBlock): estree.TSModuleBlock;

    /**
     * Encodes the specified TSModuleBlock message. Does not implicitly {@link estree.TSModuleBlock.verify|verify} messages.
     * @param message TSModuleBlock message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSModuleBlock,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSModuleBlock message, length delimited. Does not implicitly {@link estree.TSModuleBlock.verify|verify} messages.
     * @param message TSModuleBlock message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSModuleBlock,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSModuleBlock message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSModuleBlock
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSModuleBlock;

    /**
     * Decodes a TSModuleBlock message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSModuleBlock
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.TSModuleBlock;

    /**
     * Verifies a TSModuleBlock message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSModuleBlock message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSModuleBlock
     */
    public static fromObject(object: { [k: string]: any }): estree.TSModuleBlock;

    /**
     * Creates a plain object from a TSModuleBlock message. Also converts values to other types if specified.
     * @param message TSModuleBlock
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSModuleBlock,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSModuleBlock to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSModuleBlock
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSModuleDeclaration. */
  interface ITSModuleDeclaration {
    /** TSModuleDeclaration id */
    id?: estree.INode | null;

    /** TSModuleDeclaration body */
    body?: estree.INode | null;

    /** TSModuleDeclaration kind */
    kind?: string | null;
  }

  /** Represents a TSModuleDeclaration. */
  class TSModuleDeclaration implements ITSModuleDeclaration {
    /**
     * Constructs a new TSModuleDeclaration.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSModuleDeclaration);

    /** TSModuleDeclaration id. */
    public id?: estree.INode | null;

    /** TSModuleDeclaration body. */
    public body?: estree.INode | null;

    /** TSModuleDeclaration kind. */
    public kind: string;

    /**
     * Creates a new TSModuleDeclaration instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSModuleDeclaration instance
     */
    public static create(properties?: estree.ITSModuleDeclaration): estree.TSModuleDeclaration;

    /**
     * Encodes the specified TSModuleDeclaration message. Does not implicitly {@link estree.TSModuleDeclaration.verify|verify} messages.
     * @param message TSModuleDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSModuleDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSModuleDeclaration message, length delimited. Does not implicitly {@link estree.TSModuleDeclaration.verify|verify} messages.
     * @param message TSModuleDeclaration message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSModuleDeclaration,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSModuleDeclaration message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSModuleDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSModuleDeclaration;

    /**
     * Decodes a TSModuleDeclaration message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSModuleDeclaration
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.TSModuleDeclaration;

    /**
     * Verifies a TSModuleDeclaration message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSModuleDeclaration message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSModuleDeclaration
     */
    public static fromObject(object: { [k: string]: any }): estree.TSModuleDeclaration;

    /**
     * Creates a plain object from a TSModuleDeclaration message. Also converts values to other types if specified.
     * @param message TSModuleDeclaration
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSModuleDeclaration,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSModuleDeclaration to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSModuleDeclaration
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TSParameterProperty. */
  interface ITSParameterProperty {
    /** TSParameterProperty accessibility */
    accessibility?: string | null;

    /** TSParameterProperty readonly */
    readonly?: boolean | null;

    /** TSParameterProperty parameter */
    parameter?: estree.INode | null;
  }

  /** Represents a TSParameterProperty. */
  class TSParameterProperty implements ITSParameterProperty {
    /**
     * Constructs a new TSParameterProperty.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.ITSParameterProperty);

    /** TSParameterProperty accessibility. */
    public accessibility?: string | null;

    /** TSParameterProperty readonly. */
    public readonly: boolean;

    /** TSParameterProperty parameter. */
    public parameter?: estree.INode | null;

    /**
     * Creates a new TSParameterProperty instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TSParameterProperty instance
     */
    public static create(properties?: estree.ITSParameterProperty): estree.TSParameterProperty;

    /**
     * Encodes the specified TSParameterProperty message. Does not implicitly {@link estree.TSParameterProperty.verify|verify} messages.
     * @param message TSParameterProperty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.ITSParameterProperty,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TSParameterProperty message, length delimited. Does not implicitly {@link estree.TSParameterProperty.verify|verify} messages.
     * @param message TSParameterProperty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.ITSParameterProperty,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TSParameterProperty message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TSParameterProperty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.TSParameterProperty;

    /**
     * Decodes a TSParameterProperty message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TSParameterProperty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.TSParameterProperty;

    /**
     * Verifies a TSParameterProperty message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TSParameterProperty message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TSParameterProperty
     */
    public static fromObject(object: { [k: string]: any }): estree.TSParameterProperty;

    /**
     * Creates a plain object from a TSParameterProperty message. Also converts values to other types if specified.
     * @param message TSParameterProperty
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.TSParameterProperty,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TSParameterProperty to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TSParameterProperty
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXElement. */
  interface IJSXElement {
    /** JSXElement openingElement */
    openingElement?: estree.INode | null;

    /** JSXElement closingElement */
    closingElement?: estree.INode | null;

    /** JSXElement children */
    children?: estree.INode[] | null;
  }

  /** Represents a JSXElement. */
  class JSXElement implements IJSXElement {
    /**
     * Constructs a new JSXElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXElement);

    /** JSXElement openingElement. */
    public openingElement?: estree.INode | null;

    /** JSXElement closingElement. */
    public closingElement?: estree.INode | null;

    /** JSXElement children. */
    public children: estree.INode[];

    /**
     * Creates a new JSXElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXElement instance
     */
    public static create(properties?: estree.IJSXElement): estree.JSXElement;

    /**
     * Encodes the specified JSXElement message. Does not implicitly {@link estree.JSXElement.verify|verify} messages.
     * @param message JSXElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IJSXElement, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified JSXElement message, length delimited. Does not implicitly {@link estree.JSXElement.verify|verify} messages.
     * @param message JSXElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.JSXElement;

    /**
     * Decodes a JSXElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXElement;

    /**
     * Verifies a JSXElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXElement
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXElement;

    /**
     * Creates a plain object from a JSXElement message. Also converts values to other types if specified.
     * @param message JSXElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXFragment. */
  interface IJSXFragment {
    /** JSXFragment openingFragment */
    openingFragment?: estree.INode | null;

    /** JSXFragment closingFragment */
    closingFragment?: estree.INode | null;

    /** JSXFragment children */
    children?: estree.INode[] | null;
  }

  /** Represents a JSXFragment. */
  class JSXFragment implements IJSXFragment {
    /**
     * Constructs a new JSXFragment.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXFragment);

    /** JSXFragment openingFragment. */
    public openingFragment?: estree.INode | null;

    /** JSXFragment closingFragment. */
    public closingFragment?: estree.INode | null;

    /** JSXFragment children. */
    public children: estree.INode[];

    /**
     * Creates a new JSXFragment instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXFragment instance
     */
    public static create(properties?: estree.IJSXFragment): estree.JSXFragment;

    /**
     * Encodes the specified JSXFragment message. Does not implicitly {@link estree.JSXFragment.verify|verify} messages.
     * @param message JSXFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IJSXFragment, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified JSXFragment message, length delimited. Does not implicitly {@link estree.JSXFragment.verify|verify} messages.
     * @param message JSXFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXFragment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXFragment message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXFragment;

    /**
     * Decodes a JSXFragment message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXFragment;

    /**
     * Verifies a JSXFragment message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXFragment message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXFragment
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXFragment;

    /**
     * Creates a plain object from a JSXFragment message. Also converts values to other types if specified.
     * @param message JSXFragment
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXFragment,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXFragment to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXFragment
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXOpeningElement. */
  interface IJSXOpeningElement {
    /** JSXOpeningElement name */
    name?: estree.INode | null;

    /** JSXOpeningElement attributes */
    attributes?: estree.INode[] | null;

    /** JSXOpeningElement selfClosing */
    selfClosing?: boolean | null;

    /** JSXOpeningElement typeArguments */
    typeArguments?: estree.INode | null;
  }

  /** Represents a JSXOpeningElement. */
  class JSXOpeningElement implements IJSXOpeningElement {
    /**
     * Constructs a new JSXOpeningElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXOpeningElement);

    /** JSXOpeningElement name. */
    public name?: estree.INode | null;

    /** JSXOpeningElement attributes. */
    public attributes: estree.INode[];

    /** JSXOpeningElement selfClosing. */
    public selfClosing: boolean;

    /** JSXOpeningElement typeArguments. */
    public typeArguments?: estree.INode | null;

    /**
     * Creates a new JSXOpeningElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXOpeningElement instance
     */
    public static create(properties?: estree.IJSXOpeningElement): estree.JSXOpeningElement;

    /**
     * Encodes the specified JSXOpeningElement message. Does not implicitly {@link estree.JSXOpeningElement.verify|verify} messages.
     * @param message JSXOpeningElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXOpeningElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXOpeningElement message, length delimited. Does not implicitly {@link estree.JSXOpeningElement.verify|verify} messages.
     * @param message JSXOpeningElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXOpeningElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXOpeningElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXOpeningElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXOpeningElement;

    /**
     * Decodes a JSXOpeningElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXOpeningElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXOpeningElement;

    /**
     * Verifies a JSXOpeningElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXOpeningElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXOpeningElement
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXOpeningElement;

    /**
     * Creates a plain object from a JSXOpeningElement message. Also converts values to other types if specified.
     * @param message JSXOpeningElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXOpeningElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXOpeningElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXOpeningElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXClosingElement. */
  interface IJSXClosingElement {
    /** JSXClosingElement name */
    name?: estree.INode | null;
  }

  /** Represents a JSXClosingElement. */
  class JSXClosingElement implements IJSXClosingElement {
    /**
     * Constructs a new JSXClosingElement.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXClosingElement);

    /** JSXClosingElement name. */
    public name?: estree.INode | null;

    /**
     * Creates a new JSXClosingElement instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXClosingElement instance
     */
    public static create(properties?: estree.IJSXClosingElement): estree.JSXClosingElement;

    /**
     * Encodes the specified JSXClosingElement message. Does not implicitly {@link estree.JSXClosingElement.verify|verify} messages.
     * @param message JSXClosingElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXClosingElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXClosingElement message, length delimited. Does not implicitly {@link estree.JSXClosingElement.verify|verify} messages.
     * @param message JSXClosingElement message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXClosingElement,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXClosingElement message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXClosingElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXClosingElement;

    /**
     * Decodes a JSXClosingElement message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXClosingElement
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXClosingElement;

    /**
     * Verifies a JSXClosingElement message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXClosingElement message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXClosingElement
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXClosingElement;

    /**
     * Creates a plain object from a JSXClosingElement message. Also converts values to other types if specified.
     * @param message JSXClosingElement
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXClosingElement,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXClosingElement to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXClosingElement
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXOpeningFragment. */
  interface IJSXOpeningFragment {}

  /** Represents a JSXOpeningFragment. */
  class JSXOpeningFragment implements IJSXOpeningFragment {
    /**
     * Constructs a new JSXOpeningFragment.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXOpeningFragment);

    /**
     * Creates a new JSXOpeningFragment instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXOpeningFragment instance
     */
    public static create(properties?: estree.IJSXOpeningFragment): estree.JSXOpeningFragment;

    /**
     * Encodes the specified JSXOpeningFragment message. Does not implicitly {@link estree.JSXOpeningFragment.verify|verify} messages.
     * @param message JSXOpeningFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXOpeningFragment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXOpeningFragment message, length delimited. Does not implicitly {@link estree.JSXOpeningFragment.verify|verify} messages.
     * @param message JSXOpeningFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXOpeningFragment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXOpeningFragment message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXOpeningFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXOpeningFragment;

    /**
     * Decodes a JSXOpeningFragment message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXOpeningFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXOpeningFragment;

    /**
     * Verifies a JSXOpeningFragment message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXOpeningFragment message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXOpeningFragment
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXOpeningFragment;

    /**
     * Creates a plain object from a JSXOpeningFragment message. Also converts values to other types if specified.
     * @param message JSXOpeningFragment
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXOpeningFragment,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXOpeningFragment to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXOpeningFragment
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXClosingFragment. */
  interface IJSXClosingFragment {}

  /** Represents a JSXClosingFragment. */
  class JSXClosingFragment implements IJSXClosingFragment {
    /**
     * Constructs a new JSXClosingFragment.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXClosingFragment);

    /**
     * Creates a new JSXClosingFragment instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXClosingFragment instance
     */
    public static create(properties?: estree.IJSXClosingFragment): estree.JSXClosingFragment;

    /**
     * Encodes the specified JSXClosingFragment message. Does not implicitly {@link estree.JSXClosingFragment.verify|verify} messages.
     * @param message JSXClosingFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXClosingFragment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXClosingFragment message, length delimited. Does not implicitly {@link estree.JSXClosingFragment.verify|verify} messages.
     * @param message JSXClosingFragment message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXClosingFragment,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXClosingFragment message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXClosingFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXClosingFragment;

    /**
     * Decodes a JSXClosingFragment message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXClosingFragment
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXClosingFragment;

    /**
     * Verifies a JSXClosingFragment message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXClosingFragment message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXClosingFragment
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXClosingFragment;

    /**
     * Creates a plain object from a JSXClosingFragment message. Also converts values to other types if specified.
     * @param message JSXClosingFragment
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXClosingFragment,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXClosingFragment to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXClosingFragment
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXAttribute. */
  interface IJSXAttribute {
    /** JSXAttribute name */
    name?: estree.INode | null;

    /** JSXAttribute value */
    value?: estree.INode | null;
  }

  /** Represents a JSXAttribute. */
  class JSXAttribute implements IJSXAttribute {
    /**
     * Constructs a new JSXAttribute.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXAttribute);

    /** JSXAttribute name. */
    public name?: estree.INode | null;

    /** JSXAttribute value. */
    public value?: estree.INode | null;

    /**
     * Creates a new JSXAttribute instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXAttribute instance
     */
    public static create(properties?: estree.IJSXAttribute): estree.JSXAttribute;

    /**
     * Encodes the specified JSXAttribute message. Does not implicitly {@link estree.JSXAttribute.verify|verify} messages.
     * @param message JSXAttribute message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXAttribute,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXAttribute message, length delimited. Does not implicitly {@link estree.JSXAttribute.verify|verify} messages.
     * @param message JSXAttribute message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXAttribute,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXAttribute message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXAttribute
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXAttribute;

    /**
     * Decodes a JSXAttribute message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXAttribute
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXAttribute;

    /**
     * Verifies a JSXAttribute message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXAttribute message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXAttribute
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXAttribute;

    /**
     * Creates a plain object from a JSXAttribute message. Also converts values to other types if specified.
     * @param message JSXAttribute
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXAttribute,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXAttribute to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXAttribute
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXIdentifier. */
  interface IJSXIdentifier {
    /** JSXIdentifier name */
    name?: string | null;
  }

  /** Represents a JSXIdentifier. */
  class JSXIdentifier implements IJSXIdentifier {
    /**
     * Constructs a new JSXIdentifier.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXIdentifier);

    /** JSXIdentifier name. */
    public name: string;

    /**
     * Creates a new JSXIdentifier instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXIdentifier instance
     */
    public static create(properties?: estree.IJSXIdentifier): estree.JSXIdentifier;

    /**
     * Encodes the specified JSXIdentifier message. Does not implicitly {@link estree.JSXIdentifier.verify|verify} messages.
     * @param message JSXIdentifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXIdentifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXIdentifier message, length delimited. Does not implicitly {@link estree.JSXIdentifier.verify|verify} messages.
     * @param message JSXIdentifier message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXIdentifier,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXIdentifier message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXIdentifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXIdentifier;

    /**
     * Decodes a JSXIdentifier message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXIdentifier
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXIdentifier;

    /**
     * Verifies a JSXIdentifier message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXIdentifier message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXIdentifier
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXIdentifier;

    /**
     * Creates a plain object from a JSXIdentifier message. Also converts values to other types if specified.
     * @param message JSXIdentifier
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXIdentifier,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXIdentifier to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXIdentifier
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXMemberExpression. */
  interface IJSXMemberExpression {
    /** JSXMemberExpression object */
    object?: estree.INode | null;

    /** JSXMemberExpression property */
    property?: estree.INode | null;
  }

  /** Represents a JSXMemberExpression. */
  class JSXMemberExpression implements IJSXMemberExpression {
    /**
     * Constructs a new JSXMemberExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXMemberExpression);

    /** JSXMemberExpression object. */
    public object?: estree.INode | null;

    /** JSXMemberExpression property. */
    public property?: estree.INode | null;

    /**
     * Creates a new JSXMemberExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXMemberExpression instance
     */
    public static create(properties?: estree.IJSXMemberExpression): estree.JSXMemberExpression;

    /**
     * Encodes the specified JSXMemberExpression message. Does not implicitly {@link estree.JSXMemberExpression.verify|verify} messages.
     * @param message JSXMemberExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXMemberExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXMemberExpression message, length delimited. Does not implicitly {@link estree.JSXMemberExpression.verify|verify} messages.
     * @param message JSXMemberExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXMemberExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXMemberExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXMemberExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXMemberExpression;

    /**
     * Decodes a JSXMemberExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXMemberExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.JSXMemberExpression;

    /**
     * Verifies a JSXMemberExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXMemberExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXMemberExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXMemberExpression;

    /**
     * Creates a plain object from a JSXMemberExpression message. Also converts values to other types if specified.
     * @param message JSXMemberExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXMemberExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXMemberExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXMemberExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXNamespacedName. */
  interface IJSXNamespacedName {
    /** JSXNamespacedName name */
    name?: estree.INode | null;

    /** JSXNamespacedName namespace */
    namespace?: estree.INode | null;
  }

  /** Represents a JSXNamespacedName. */
  class JSXNamespacedName implements IJSXNamespacedName {
    /**
     * Constructs a new JSXNamespacedName.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXNamespacedName);

    /** JSXNamespacedName name. */
    public name?: estree.INode | null;

    /** JSXNamespacedName namespace. */
    public namespace?: estree.INode | null;

    /**
     * Creates a new JSXNamespacedName instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXNamespacedName instance
     */
    public static create(properties?: estree.IJSXNamespacedName): estree.JSXNamespacedName;

    /**
     * Encodes the specified JSXNamespacedName message. Does not implicitly {@link estree.JSXNamespacedName.verify|verify} messages.
     * @param message JSXNamespacedName message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXNamespacedName,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXNamespacedName message, length delimited. Does not implicitly {@link estree.JSXNamespacedName.verify|verify} messages.
     * @param message JSXNamespacedName message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXNamespacedName,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXNamespacedName message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXNamespacedName
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXNamespacedName;

    /**
     * Decodes a JSXNamespacedName message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXNamespacedName
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXNamespacedName;

    /**
     * Verifies a JSXNamespacedName message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXNamespacedName message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXNamespacedName
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXNamespacedName;

    /**
     * Creates a plain object from a JSXNamespacedName message. Also converts values to other types if specified.
     * @param message JSXNamespacedName
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXNamespacedName,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXNamespacedName to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXNamespacedName
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXSpreadAttribute. */
  interface IJSXSpreadAttribute {
    /** JSXSpreadAttribute argument */
    argument?: estree.INode | null;
  }

  /** Represents a JSXSpreadAttribute. */
  class JSXSpreadAttribute implements IJSXSpreadAttribute {
    /**
     * Constructs a new JSXSpreadAttribute.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXSpreadAttribute);

    /** JSXSpreadAttribute argument. */
    public argument?: estree.INode | null;

    /**
     * Creates a new JSXSpreadAttribute instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXSpreadAttribute instance
     */
    public static create(properties?: estree.IJSXSpreadAttribute): estree.JSXSpreadAttribute;

    /**
     * Encodes the specified JSXSpreadAttribute message. Does not implicitly {@link estree.JSXSpreadAttribute.verify|verify} messages.
     * @param message JSXSpreadAttribute message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXSpreadAttribute,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXSpreadAttribute message, length delimited. Does not implicitly {@link estree.JSXSpreadAttribute.verify|verify} messages.
     * @param message JSXSpreadAttribute message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXSpreadAttribute,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXSpreadAttribute message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXSpreadAttribute
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXSpreadAttribute;

    /**
     * Decodes a JSXSpreadAttribute message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXSpreadAttribute
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXSpreadAttribute;

    /**
     * Verifies a JSXSpreadAttribute message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXSpreadAttribute message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXSpreadAttribute
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXSpreadAttribute;

    /**
     * Creates a plain object from a JSXSpreadAttribute message. Also converts values to other types if specified.
     * @param message JSXSpreadAttribute
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXSpreadAttribute,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXSpreadAttribute to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXSpreadAttribute
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXExpressionContainer. */
  interface IJSXExpressionContainer {
    /** JSXExpressionContainer expression */
    expression?: estree.INode | null;
  }

  /** Represents a JSXExpressionContainer. */
  class JSXExpressionContainer implements IJSXExpressionContainer {
    /**
     * Constructs a new JSXExpressionContainer.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXExpressionContainer);

    /** JSXExpressionContainer expression. */
    public expression?: estree.INode | null;

    /**
     * Creates a new JSXExpressionContainer instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXExpressionContainer instance
     */
    public static create(
      properties?: estree.IJSXExpressionContainer,
    ): estree.JSXExpressionContainer;

    /**
     * Encodes the specified JSXExpressionContainer message. Does not implicitly {@link estree.JSXExpressionContainer.verify|verify} messages.
     * @param message JSXExpressionContainer message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXExpressionContainer,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXExpressionContainer message, length delimited. Does not implicitly {@link estree.JSXExpressionContainer.verify|verify} messages.
     * @param message JSXExpressionContainer message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXExpressionContainer,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXExpressionContainer message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXExpressionContainer
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXExpressionContainer;

    /**
     * Decodes a JSXExpressionContainer message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXExpressionContainer
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): estree.JSXExpressionContainer;

    /**
     * Verifies a JSXExpressionContainer message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXExpressionContainer message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXExpressionContainer
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXExpressionContainer;

    /**
     * Creates a plain object from a JSXExpressionContainer message. Also converts values to other types if specified.
     * @param message JSXExpressionContainer
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXExpressionContainer,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXExpressionContainer to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXExpressionContainer
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXSpreadChild. */
  interface IJSXSpreadChild {
    /** JSXSpreadChild expression */
    expression?: estree.INode | null;
  }

  /** Represents a JSXSpreadChild. */
  class JSXSpreadChild implements IJSXSpreadChild {
    /**
     * Constructs a new JSXSpreadChild.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXSpreadChild);

    /** JSXSpreadChild expression. */
    public expression?: estree.INode | null;

    /**
     * Creates a new JSXSpreadChild instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXSpreadChild instance
     */
    public static create(properties?: estree.IJSXSpreadChild): estree.JSXSpreadChild;

    /**
     * Encodes the specified JSXSpreadChild message. Does not implicitly {@link estree.JSXSpreadChild.verify|verify} messages.
     * @param message JSXSpreadChild message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXSpreadChild,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXSpreadChild message, length delimited. Does not implicitly {@link estree.JSXSpreadChild.verify|verify} messages.
     * @param message JSXSpreadChild message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXSpreadChild,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXSpreadChild message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXSpreadChild
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXSpreadChild;

    /**
     * Decodes a JSXSpreadChild message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXSpreadChild
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXSpreadChild;

    /**
     * Verifies a JSXSpreadChild message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXSpreadChild message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXSpreadChild
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXSpreadChild;

    /**
     * Creates a plain object from a JSXSpreadChild message. Also converts values to other types if specified.
     * @param message JSXSpreadChild
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXSpreadChild,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXSpreadChild to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXSpreadChild
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXText. */
  interface IJSXText {
    /** JSXText raw */
    raw?: string | null;

    /** JSXText value */
    value?: string | null;
  }

  /** Represents a JSXText. */
  class JSXText implements IJSXText {
    /**
     * Constructs a new JSXText.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXText);

    /** JSXText raw. */
    public raw: string;

    /** JSXText value. */
    public value: string;

    /**
     * Creates a new JSXText instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXText instance
     */
    public static create(properties?: estree.IJSXText): estree.JSXText;

    /**
     * Encodes the specified JSXText message. Does not implicitly {@link estree.JSXText.verify|verify} messages.
     * @param message JSXText message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IJSXText, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified JSXText message, length delimited. Does not implicitly {@link estree.JSXText.verify|verify} messages.
     * @param message JSXText message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXText,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXText message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXText
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): estree.JSXText;

    /**
     * Decodes a JSXText message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXText
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXText;

    /**
     * Verifies a JSXText message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXText message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXText
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXText;

    /**
     * Creates a plain object from a JSXText message. Also converts values to other types if specified.
     * @param message JSXText
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXText,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXText to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXText
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a JSXEmptyExpression. */
  interface IJSXEmptyExpression {}

  /** Represents a JSXEmptyExpression. */
  class JSXEmptyExpression implements IJSXEmptyExpression {
    /**
     * Constructs a new JSXEmptyExpression.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IJSXEmptyExpression);

    /**
     * Creates a new JSXEmptyExpression instance using the specified properties.
     * @param [properties] Properties to set
     * @returns JSXEmptyExpression instance
     */
    public static create(properties?: estree.IJSXEmptyExpression): estree.JSXEmptyExpression;

    /**
     * Encodes the specified JSXEmptyExpression message. Does not implicitly {@link estree.JSXEmptyExpression.verify|verify} messages.
     * @param message JSXEmptyExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: estree.IJSXEmptyExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified JSXEmptyExpression message, length delimited. Does not implicitly {@link estree.JSXEmptyExpression.verify|verify} messages.
     * @param message JSXEmptyExpression message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IJSXEmptyExpression,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a JSXEmptyExpression message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns JSXEmptyExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.JSXEmptyExpression;

    /**
     * Decodes a JSXEmptyExpression message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns JSXEmptyExpression
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.JSXEmptyExpression;

    /**
     * Verifies a JSXEmptyExpression message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a JSXEmptyExpression message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns JSXEmptyExpression
     */
    public static fromObject(object: { [k: string]: any }): estree.JSXEmptyExpression;

    /**
     * Creates a plain object from a JSXEmptyExpression message. Also converts values to other types if specified.
     * @param message JSXEmptyExpression
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.JSXEmptyExpression,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this JSXEmptyExpression to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for JSXEmptyExpression
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an UnknownNode. */
  interface IUnknownNode {}

  /** Represents an UnknownNode. */
  class UnknownNode implements IUnknownNode {
    /**
     * Constructs a new UnknownNode.
     * @param [properties] Properties to set
     */
    constructor(properties?: estree.IUnknownNode);

    /**
     * Creates a new UnknownNode instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UnknownNode instance
     */
    public static create(properties?: estree.IUnknownNode): estree.UnknownNode;

    /**
     * Encodes the specified UnknownNode message. Does not implicitly {@link estree.UnknownNode.verify|verify} messages.
     * @param message UnknownNode message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: estree.IUnknownNode, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified UnknownNode message, length delimited. Does not implicitly {@link estree.UnknownNode.verify|verify} messages.
     * @param message UnknownNode message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: estree.IUnknownNode,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an UnknownNode message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UnknownNode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): estree.UnknownNode;

    /**
     * Decodes an UnknownNode message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UnknownNode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): estree.UnknownNode;

    /**
     * Verifies an UnknownNode message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an UnknownNode message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UnknownNode
     */
    public static fromObject(object: { [k: string]: any }): estree.UnknownNode;

    /**
     * Creates a plain object from an UnknownNode message. Also converts values to other types if specified.
     * @param message UnknownNode
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: estree.UnknownNode,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this UnknownNode to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UnknownNode
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }
}
