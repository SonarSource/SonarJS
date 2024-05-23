import type {TypeInfo} from "../type-info";
import {type BaseValue} from "../value";
import type {Location} from "../location";

export type Parameter = BaseValue<"parameter"> & {
  readonly location: Location;
  readonly name: string;
  readonly typeInfo: TypeInfo;
};
