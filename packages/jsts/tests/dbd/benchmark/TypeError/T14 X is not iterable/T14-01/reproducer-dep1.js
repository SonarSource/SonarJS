const fs = require("fs")
const path = require("path")

class Base {
  constructor({ dir, mainDir = '', root = '', filename = '', moreInfo = false } = {}) {
    this.dir = dir
    this.mainDir = mainDir || dir
    this.root = root
    this.filename = filename
    this.moreInfo = moreInfo
    this.pathSep = path.sep
  }
  getFileContent(filename, encoding = 'utf8') {
    return fs.readFileSync(filename, { encoding })
  }
  getPathName(name, dir = this.dir) {
    return path.resolve(dir, name)
  }
  changeExt(name, ext = '') {
    return name.slice(0, name.lastIndexOf(".")) + ext
  }
}

module.exports = {
  Base
}
