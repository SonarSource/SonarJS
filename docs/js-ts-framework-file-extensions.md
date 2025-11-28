# JavaScript/TypeScript Framework File Extensions

A comprehensive list of all JavaScript/TypeScript file extensions from frameworks and template engines in the ecosystem.

## Component-Based UI Frameworks (With Custom Extensions)

| Framework           | Extensions     | Notes                                           |
| ------------------- | -------------- | ----------------------------------------------- |
| **Vue**             | `.vue`         | Single-file components                          |
| **Svelte**          | `.svelte`      | Component files                                 |
| **Astro**           | `.astro`       | Multi-framework meta-framework                  |
| **Ember (new)**     | `.gjs`, `.gts` | Glimmer JavaScript/TypeScript (official future) |
| **Ember (classic)** | `.hbs`         | Handlebars templates (separate from .js)        |
| **Riot.js**         | `.riot`        | Component files                                 |
| **Imba**            | `.imba`        | Full programming language for web               |
| **Marko**           | `.marko`       | eBay's UI framework                             |

## Component-Based Frameworks (Standard .jsx/.tsx)

| Framework    | Extensions     | Notes                   |
| ------------ | -------------- | ----------------------- |
| **React**    | `.jsx`, `.tsx` | Industry standard       |
| **Preact**   | `.jsx`, `.tsx` | React alternative       |
| **Solid.js** | `.jsx`, `.tsx` | Reactive framework      |
| **Qwik**     | `.tsx`         | Resumable framework     |
| **Stencil**  | `.tsx`         | Web Components compiler |
| **Lit**      | `.ts`, `.js`   | Web Components library  |

## Angular Framework

| Type                     | Extensions                          | Notes           |
| ------------------------ | ----------------------------------- | --------------- |
| **Component TypeScript** | `.component.ts`                     | Component logic |
| **Component Template**   | `.component.html`, `.ng.html`       | HTML templates  |
| **Component Styles**     | `.component.css`, `.component.scss` | Styles          |

## Cross-Framework Tools

| Tool        | Extensions               | Notes                                |
| ----------- | ------------------------ | ------------------------------------ |
| **Mitosis** | `.lite.tsx`, `.lite.jsx` | Write once, compile to any framework |
| **MDX**     | `.mdx`                   | Markdown + JSX (ubiquitous in docs)  |
| **MDSveX**  | `.svx`                   | Markdown + Svelte                    |

## Template Engines (Server-Side Rendering)

### Logic-Heavy Templates

| Engine           | Extensions          | Notes                              |
| ---------------- | ------------------- | ---------------------------------- |
| **EJS**          | `.ejs`              | Embedded JavaScript                |
| **Pug**          | `.pug`, `.jade`     | Indentation-based (formerly Jade)  |
| **Nunjucks**     | `.njk`, `.nunjucks` | Jinja2-like for Node.js            |
| **Eta**          | `.eta`              | Modern, written in TypeScript      |
| **art-template** | `.art`              | High performance Chinese framework |

### Logic-Light Templates

| Engine         | Extensions                    | Notes                             |
| -------------- | ----------------------------- | --------------------------------- |
| **Handlebars** | `.hbs`, `.handlebars`, `.hjs` | Mustache superset                 |
| **Mustache**   | `.mustache`                   | Logic-less templates              |
| **doT.js**     | `.dot`, `.def`, `.jst`        | Fast & concise                    |
| **Liquid**     | `.liquid`                     | Shopify's template language       |
| **Swig**       | `.swig`                       | Django-like (inactive since 2016) |

## Standard Extensions (Included for Completeness)

| Type           | Extensions            | Notes                           |
| -------------- | --------------------- | ------------------------------- |
| **JavaScript** | `.js`, `.mjs`, `.cjs` | Standard                        |
| **TypeScript** | `.ts`, `.mts`, `.cts` | Standard                        |
| **JSX/TSX**    | `.jsx`, `.tsx`        | React-style (now standard)      |
| **Markdown**   | `.md`, `.markdown`    | Often processed with JS tooling |

## TypeScript Program Integration

For **TypeScript's `parseJsonConfigFileContent`** (which is what SonarJS uses), the relevant parameter is `extraFileExtensions`.

### Current SonarJS Support

Currently the code supports only Vue:

```typescript
[
  {
    extension: 'vue',
    isMixedContent: true,
    scriptKind: ts.ScriptKind.Deferred,
  },
];
```

### Candidates for Similar Treatment

Extensions that could benefit from TypeScript program support (in priority order):

1. **`.svelte`** - Very popular, similar to Vue
2. **`.astro`** - Growing meta-framework
3. **`.gjs`, `.gts`** - Ember's future (though SonarSource declined this request)
4. **`.mdx`** - Ubiquitous in documentation
5. **`.riot`** - Less common but similar pattern

### Note on Template Engines

Most server-side template engines (`.ejs`, `.pug`, `.hbs`, etc.) are **server-side only** and don't contain TypeScript-analyzable code, so they wouldn't need TypeScript program support via `extraFileExtensions`.
