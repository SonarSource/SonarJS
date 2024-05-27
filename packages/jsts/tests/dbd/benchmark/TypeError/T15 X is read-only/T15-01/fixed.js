
const info = {
  valueChanges: Object.freeze([1,2])
}
const state = {}

{
  value: [...info.valueChanges].reverse().find((change) => change.propertyName == state.propertyName)?.value ?? ""
}
