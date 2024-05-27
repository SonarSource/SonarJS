// import fs from "fs";
// import { config } from "./config.js";
// import { fileExist } from "./utils/fileExist.js";
// import { getArraysDiff } from "./utils/getArraysDiff.js";
// import { getDirectories } from "./utils/getDirectories.js";


//config.scssImportsList = [];
function writeSassImportsFile(cb) {
  // const newScssImportsList = [];
  // config.addStyleBefore.forEach(function (src) {
  //   newScssImportsList.push(src);
  // });
  // config.alwaysAddBlocks.forEach(function (blockName) {
  //   if (fileExist(`${config.from.blocks}/${blockName}/${blockName}.scss`)) {
  //     newScssImportsList.push(`${config.from.blocks}/${blockName}/${blockName}.scss`);
  //   }
  // });
  // let allBlocksWithScssFiles = getDirectories("scss");
  // allBlocksWithScssFiles.forEach(function (blockWithScssFile) {
  //   let url = `${config.from.blocks}/${blockWithScssFile}/${blockWithScssFile}.scss`;
  //   if (config.blocksFromHtml.indexOf(blockWithScssFile) === -1) return;
  //   if (newScssImportsList.indexOf(url) > -1) return;
  //   newScssImportsList.push(url);
  // });
  // config.addStyleAfter.forEach(function (src) {
  //   newScssImportsList.push(src);
  // });
  // let diff = getArraysDiff(newScssImportsList, config.scssImportsList);
  // if (diff.length) {
  //   let msg = `\n/*!*${config.doNotEditMsg.replace(/\n /gm, "\n * ").replace(/\n\n$/, "\n */\n\n")}`;
  //   let styleImports = msg;
  //   newScssImportsList.forEach(function (src) {
  //     styleImports += `@import '${src}';\n`;
  //   });
  //   styleImports += msg;
  //   fs.writeFileSync(`${config.from.style}/style.scss`, styleImports);
  //   console.log("---------- Write new style.scss");
  //   config.scssImportsList = newScssImportsList;
  // }
  cb(); // Noncompliant: cb can be undefined
  // cb?.();
}

writeSassImportsFile(undefined);
