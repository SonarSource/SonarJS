This project demonstrates that some files don't need to be listed in the `tscofig.json` file and are still part of the
tsc `Program`

To see the list of the files which are part of the project run

```asciidoc
npx tsc --listFiles --noEmit
```

It should output something similar to

```asciidoc
$ npx tsc --listFiles --noEmit
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/node_modules/typescript/lib/lib.d.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/node_modules/typescript/lib/lib.es5.d.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/node_modules/typescript/lib/lib.dom.d.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/node_modules/typescript/lib/lib.webworker.importscripts.d.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/node_modules/typescript/lib/lib.scripthost.d.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/lib.ts
C:/projects/SonarJS/its/plugin/projects/tsproject-implicit-import/main.ts
```

To run the program itself run, it should output `2`
```asciidoc
$ npx ts-node main
2
```
