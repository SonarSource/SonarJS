declare module 'jsx-ast-utils-x' {
  import * as ESTree from 'estree';
  import * as ESTreeJSX from 'estree-jsx';

  export interface GetPropOptions {
    /**
     * Ignores casing differences in the prop name. Enabled by default.
     * @default true
     */
    ignoreCase: boolean;
  }

  export interface HasPropOptions extends GetPropOptions {
    /**
     * Assumes target property is not in a spread expression applied
     * to the element. For example `<div {...props} />` looking for
     * specific prop here will return false if `spreadStrict` is true.
     * Enabled by default.
     * @default true
     */
    spreadStrict: boolean;
  }

  /**
   * Returns the tag name associated with a JSXOpeningElement.
   * @param node The visited JSXOpeningElement node object.
   * @returns The element's tag name.
   */
  export function elementType(
    node: ESTreeJSX.JSXOpeningElement | ESTreeJSX.JSXOpeningFragment,
  ): string;

  /**
   * Returns the value of a given attribute. Different types of attributes have
   * their associated values in different properties on the object. This function
   * should return a value only if we can extract a literal value from its
   * attribute (i.e. values that have generic types in JavaScript including
   * strings, numbers, booleans, etc.)
   * @param prop The JSXAttribute collected by AST parser.
   * @returns The value of the prop.
   */
  export function getLiteralPropValue(prop: ESTreeJSX.JSXAttribute): ESTree.Literal['value'];

  /**
   * Returns the JSXAttribute itself or `undefined`, indicating the prop is not
   * present on the JSXOpeningElement.
   * @param props The attributes on the visited node (Usually node.attributes).
   * @param prop A string representation of the prop you want to retrieve.
   * @param options An object representing options for existence checking.
   * @returns The JSXAttribute if found, otherwise `undefined`.
   */
  export function getProp(
    props: ESTreeJSX.JSXOpeningElement['attributes'],
    prop: string,
    options?: GetPropOptions,
  ): ESTreeJSX.JSXAttribute | undefined;

  /**
   * Returns the value of a given attribute. Different types of attributes have
   * their associated values in different properties on the object. This function
   * should return the most closely associated value with the intention of the JSX.
   * @param prop The JSXAttribute collected by AST parser.
   * @returns The value of the prop.
   */
  export function getPropValue(prop: ESTreeJSX.JSXAttribute): unknown;

  /**
   * Returns a boolean indicating if ANY of props in prop argument exist on the node.
   * @param props The attributes on the visited node (Usually node.attributes).
   * @param prop An array of strings representing the props you want to check for existence.
   * @param options An object representing options for existence checking.
   * @returns A boolean asserting the existence of some of the props.
   */
  export function hasAnyProp(
    props: ESTreeJSX.JSXOpeningElement['attributes'],
    prop: string[],
    options?: HasPropOptions,
  ): boolean;

  /**
   * Returns a boolean indicating if ALL of props in prop argument exist on the node.
   * @param props The attributes on the visited node (Usually node.attributes).
   * @param prop An array of strings representing the props you want to check for existence.
   * @param options An object representing options for existence checking.
   * @returns A boolean asserting the existence of all of the props.
   */
  export function hasEveryProp(
    props: ESTreeJSX.JSXOpeningElement['attributes'],
    prop: string[],
    options?: HasPropOptions,
  ): boolean;

  /**
   * Returns boolean indicating whether an prop exists as an attribute on a JSX element node.
   * @param props The attributes on the visited node (Usually node.attributes).
   * @param prop A string representation of the prop you want to check for existence.
   * @param options An object representing options for existence checking.
   * @returns A boolean asserting the existence of the prop.
   */
  export function hasProp(
    props: ESTreeJSX.JSXOpeningElement['attributes'],
    prop: string,
    options?: HasPropOptions,
  ): boolean;

  /**
   * Returns the name associated with a JSXAttribute. For example, given `<div foo="bar" />`
   * and the JSXAttribute for foo, this will return the string "foo".
   * @param prop The JSXAttribute collected by AST parser.
   * @returns The name of the attribute.
   */
  export function propName(prop: ESTreeJSX.JSXAttribute): string;
}
