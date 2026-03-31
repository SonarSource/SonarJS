import { deprecatedValue } from './dep';

/** @deprecated Use replacement instead */
export default function DeprecatedComponent() {
  return <span>{deprecatedValue}</span>;
}
