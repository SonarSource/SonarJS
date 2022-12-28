# Typedoc searchable parameters plugin

Plugin for [Typedoc](https://typedoc.org/) that makes functions searchable by their parameter types.

For example:

```typescript
function foo(a: string, b: number) {}
```

The function `foo` will appear in the search when typing `string` or `number`.

## Setup

Used locally, Typedoc looks for the plugin in `node_modules/`, you must therefore do a symlink pointing here. You can use `npm run setup`.

## References

Documentation regarding plugin implementation can be found in [Typedoc development](https://typedoc.org/guides/development/)
