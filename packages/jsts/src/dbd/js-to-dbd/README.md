# JavaScript to DBD transpiler

## Interpretations

In this chapter, we dive into the specific ECMAScript specification interpretations that the transpiler has to do in order to emit an IR that the DBD engine can interpret successfully.

### About the conservative nature of the DBD engine

Consider the following JavaScript code:

```js
foo.bar; // ReferenceError because foo was never declared
```

Organically, we would want to emit the following instructions and expect the DBD engine to raise on `#2` because `foo` was never declared as field of `#0` - i.e. because `#1` is `null`:

```
#0 = call #new-object#()
#1 = call #get-field# foo(#0)
#2 = call #get-field# bar(#1)
```

Unfortunately, the DBD engine is conservative and ignores non-declared fields entirely.

To overcome this, we must emit a null value whenever an unresolvable reference is encountered. But, by applying this rule strictly, we would end up with instructions that would not make the engine raise either:

```
#0 = call #new-object#()
#1 = call #id#(null#-1)
#2 = call #id#(null#-1)
```

In order to make the DBD engine raise on ReferenceError, we must not only emit a null value whenever an unresolvable reference is encountered, but also return a _record_ that never returns an unresolvable reference, so that we end up with this:

```
#0 = call #new-object#()
#1 = call #id#(null#-1)
#2 = call #get-field# bar(#1)
```
