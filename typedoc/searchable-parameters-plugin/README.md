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

- Documentation regarding plugin implementation can be found in [Typedoc development](https://typedoc.org/guides/development/)

- You can review the indexed values that you added by printing [this variable](https://github.com/TypeStrong/typedoc/blob/56813c0cb201f0c248a0cc43ef6e7578d680191c/src/lib/output/plugins/JavascriptIndexPlugin.ts#L128) in your local `typedoc` dependency like that:

```javascript
console.log(
  'added',
  {
    name: reflection.name,
    comment: this.getCommentSearchText(reflection),
    ...indexEvent.searchFields[rows.length],
    id: rows.length,
  },
  boost,
  'for',
  row,
);
```
