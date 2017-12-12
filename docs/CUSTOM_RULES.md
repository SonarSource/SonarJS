
# Writing Custom Rules

Custom rules for SonarJS can be added by writing a SonarQube Plugin and then using SonarJS custom rules API to create a rule. Here is the [sample plugin](https://github.com/SonarSource/sonar-custom-rules-examples/tree/master/javascript-custom-rules) to get started.

## How Rules Work?

SonarJS parses the source code, creates an Abstract Syntax Tree (AST) and then walks through the entire tree. A coding rule is a visitor that is able to visit nodes from this AST.

As soon as the coding rule visits a node, it can navigate the tree around the node and log issues if necessary.

## Create plugin

* Create a [standard SonarQube plugin](https://docs.sonarqube.org/display/DEV/Developing+a+Plugin) project. You can take [this example](https://github.com/SonarSource/sonar-custom-rules-examples/tree/master/javascript-custom-rules) as a starting point.
* Attach this plugin to SonarJS through the pom.xml
  * add the dependency to SonarJS
  * add the following line in the sonar-packaging-maven-plugin `configuration`
  ```xml
  <basePlugin>javascript</basePlugin>
  ```

* Implement the following extension points
  * `Plugin`
  * `RulesDefinition`, SonarJS API provides a partial implementation `CustomJavaScriptRulesDefinition` that can be extended. Declare the `RuleDefinition` as an extension in the `Plugin` extension point.
* Implement rules
* To add your custom rules to SonarQube, copy `jar` file of your plugin build to `extensions/plugins` directory of SonarQube. Do not forget to activate new rules in the profile you use.

## Implement a Rule
* Create a class that will hold the implementation of the rule, it should
  * extend DoubleDispatchVisitorCheck or SubscriptionVisitorCheck
  * define the rule name, key, tags, etc. with Java annotations

* Declare this class in the `RuleDefinition`

#### Using DoubleDispatchVisitorCheck
`DoubleDispatchVisitorCheck` extends `DoubleDispatchVisitor` which provide a set of methods to visit specific tree nodes (these methods' names start with `visit...`). To explore a part of the AST, override required method(s). For example, if you want to explore `if` statement nodes, override `DoubleDispatchVisitor#visitIfStatement` method that will be called each time an `ifStatementTree` node is encountered in the AST.

> When overriding a visit method, you must call the super method in order to allow the visitor to visit the rest of the tree.

#### Using SubscriptionVisitorCheck
`SubscriptionVisitorCheck` extends `SubscriptionVisitor`. To explore a part of the AST, override `SubscriptionVisitor#nodesToVisit()` by returning the list of the `Tree#Kind` of node you want to visit. For example, if you want to explore `if` statement nodes the method will return a list containing the element `Tree#Kind#IF_STATEMENT`.
[Here](https://github.com/SonarSource/SonarJS/blob/master/javascript-frontend/src/main/java/org/sonar/plugins/javascript/api/tree/Tree.java) you can find the full list of existing tree kinds.

#### Create issues
Use these methods to log an issue
* `JavaScriptCheck#addIssue(tree, message)` creates and returns the instance of PreciseIssue. In SQ UI this issue will highlight entire code corresponding to the tree, passed as a first parameter. To add cost (effort to fix) or secondary locations just provide these values to just created instance of `PreciseIssue`.
* `JavaScriptCheck#addIssue(issue)` creates and returns the instance of Issue. Use this method to create non-standard issues (e.g. for file-level issue instantiate FileIssue class).

#### Check context
Check context is provided by `DoubleDispatchVisitorCheck` or `SubscriptionVisitorChec` by calling `JavaScriptCheck#getContext` method. Check context provides you access to the root tree of the file, the file itself and the symbol model (information about variables).

#### Testing the rule
To test the rule you can use `JavaScriptCheckVerifier#verify()` or `JavaScriptCheckVerifier#issues()`. To be able to use these methods add a dependency to your project:
```xml
<dependency>
  <groupId>org.sonarsource.javascript</groupId>
  <artifactId>javascript-checks-testkit</artifactId>
  <version>XXX</version>
  <scope>test</scope>
</dependency>
```

## API Changes

#### SonarJS 4.0
Deprecated method TreeVisitorContext#getFile() is removed.

#### SonarJS 3.2
As this version adds support for Flow syntax, many new interfaces and tree kinds appeared. All new interfaces are prefixed with "Flow". Here is list of changes (tree kind and corresponding interface) :
New interfaces:
* `FLOW_OPTIONAL_TYPE` (FlowOptionalTypeTree)
* `FLOW_SIMPLE_TYPE` (FlowSimpleTypeTree)
* `FLOW_UNION_TYPE` (FlowUnionTypeTree)
* `FLOW_INTERSECTION_TYPE` (FlowIntersectionTypeTree)
* `FLOW_LITERAL_TYPE` (FlowLiteralTypeTree)
* `FLOW_FUNCTION_TYPE` (FlowFunctionTypeTree)
* `FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE` (FlowFunctionTypeParameterClauseTree)
* `FLOW_FUNCTION_TYPE_PARAMETER` (FlowFunctionTypeParameterTree)
* `FLOW_GENERIC_PARAMETER` (FlowGenericParameterTree)
* `FLOW_GENERIC_PARAMETER_CLAUSE` (FlowGenericParameterClauseTree)
* `FLOW_PARAMETERIZED_GENERICS_TYPE` (FlowParameterizedGenericsTypeTree)
* `FLOW_IMPLEMENTS_CLAUSE` (FlowImplementsClauseTree)
* `FLOW_OBJECT_TYPE` (FlowObjectTypeTree)
* `FLOW_PROPERTY_DEFINITION` (FlowPropertyDefinitionTree)
* `FLOW_SIMPLE_PROPERTY_DEFINITION_KEY` (FlowSimplePropertyDefinitionKeyTree)
* `FLOW_METHOD_PROPERTY_DEFINITION_KEY` (FlowMethodPropertyDefinitionKeyTree)
* `FLOW_INDEXER_PROPERTY_DEFINITION_KEY` (FlowIndexerPropertyDefinitionKeyTree)
* `FLOW_TYPE_ANNOTATION` (FlowTypeAnnotationTree)
* `FLOW_PARENTHESISED_TYPE` (FlowParenthesisedTypeTree)
* `FLOW_TUPLE_TYPE` (FlowTupleTypeTree)
* `FLOW_NAMESPACED_TYPE` (FlowNamespacedTypeTree)
* `FLOW_TYPEOF_TYPE` (FlowTypeofTypeTree)
* `FLOW_CASTING_EXPRESSION` (FlowCastingExpressionTree)
* `FLOW_ARRAY_TYPE_WITH_KEYWORD` (FlowArrayTypeTree)
* `FLOW_ARRAY_TYPE_SHORTHAND` (FlowArrayTypeShorthandTree)
* `FLOW_TYPED_BINDING_ELEMENT` (FlowTypedBindingElementTree)
* `FLOW_OPTIONAL_BINDING_ELEMENT` (FlowOptionalBindingElementTree)
* `FLOW_TYPE_ALIAS_STATEMENT` (FlowTypeAliasStatementTree)
* `FLOW_INTERFACE_DECLARATION` (FlowInterfaceDeclarationTree)
* `FLOW_DECLARE` (FlowDeclareTree)
* `FLOW_MODULE` (FlowModuleTree)
* `FLOW_MODULE_EXPORTS` (FlowModuleExportsTree)
* `FLOW_FUNCTION_SIGNATURE` (FlowFunctionSignatureTree)
* `FLOW_OPAQUE_TYPE` (FlowOpaqueTypeTree)

Many of existing interfaces were updated to add flow-related information. E.g.
* all fuction types now have return type annotation
* more tree kinds can now appear as class declaration elements (comma and flow property definition)
* export and import statements and related interfaces were updated
* `ClassTree#genericParameterClause()` and `ClassTree#implementsClause()` were added

#### SonarJS 3.0

* New methods `NamedExportDeclarationTree#decorators()` and `DefaultExportDeclarationTree#decorators()`
* `ParameterListTree` extends only Tree (not anymore `DeclarationTree` and `ExpressionTree`)
* `TemplateCharactersTree` extends only Tree (not anymore `ExpressionTree`)
* `GeneratorMethodDeclarationTree` is removed. Now generator methods are represented by `MethodDeclarationTree` with `Tree.Kind#GENERATOR_METHOD`.
* `SubscriptionVisitorCheck#nodesToVisit` returns `Set<Tree.Kind>` (not anymore `List<Tree.Kind>`)
* `IdentifierTree#symbol()` returns `Optional<Symbol>` (not anymore nullable `Symbol`)
* New method `IdentifierTree#symbolUsage()`
* Arguments clause (in call expression) is represented by `ArgumentListTree` (not anymore by `ParameterListTree`). Methods accessing arguments clause were accordingly renamed from "arguments" to "argumentClause". `Tree.Kind#ARGUMENTS` was renamed into `Tree.Kind#ARGUMENT_LIST`. `Tree.Kind#FORMAL_PARAMETER_LIST` was renamed into `Tree.Kind#PARAMETER_LIST`.
* All names of tree elements (methods of XxxTree interfaces) which are tokens (`SyntaxToken`) were updated to confirm to patten xxxToken. E.g. `LabelledStatementTree#colon()` was renamed to `LabelledStatementTree#colonToken()`
* `SeparatedList` interface was moved to API package
* No `IdentifierTree` with `Tree.Kind#LABEL_IDENTIFIER` created anymore. `SyntaxToken` is used instead for all referencing it trees (e.g. `BreakStatementTree#labelToken()`). `Tree.Kind#LABEL_IDENTIFIER` is dropped
* `AccessorMethodDeclarationTree` doesn't extend anymore `MethodDeclarationTree`, but `FunctionTree` directly. Thus in order to visit accessor use new method `DoubleDispatchVisitorCheck#visitAccessorMethodDeclaration()`
* `ClassTree#methods()` and `ClassTree#semicolons()` were removed. Instead `ClassTree#elements()` should be used (do not forget to filter out what's required).
* `ClassTree` was moved to package with declarations: org.sonar.plugins.javascript.api.tree.declaration
* `SuperTree` interface is created for `Tree.Kind#SUPER` (to represent "super" keyword)
* Tree interface was enriched with new tree-navigation methods: 
  * `Tree#lastToken()`
  * `Tree#firstToken()`
  * `Tree#isAncestorOf(`)
  * `Tree#descendants()`
  * `Tree#childrenStream()`
  * `Tree#parent()`
* New interface `ConditionalTree` is created. It's extended by trees, having condition expression (i.e. loops and if-statement).
* New interface `ExtendsClauseTree` is created. It has replaced a nullable pair of elements of class: `ClassTree#extendsToken()` and `ClassTree#superClass()`.
* New interface `FinallyBlockTree` is created. It has replaced a nullable pair of elements of try-statement: `TryStatementTree#finallyKeyword()` and `TryStatementTree#finallyBlock()`
* `Tree.Kind#IDENTIFIER_NAME` was renamed to `Tree.Kind#PROPERTY_IDENTIFIER`

#### SonarJS 2.20
* Method `Tree#is(...Tree.Kind)` is replaced by `Tree#is(...Kinds)` which is a new interface implemented by `Tree.Kind`.
