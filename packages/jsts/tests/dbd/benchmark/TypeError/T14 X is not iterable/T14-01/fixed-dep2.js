
const { Base } = require('./reproducer-dep1.js')

class WxCfg extends Base {
  constructor({ dir }) {
    super({ dir })
  }
  static init(dir) {

    return new WxCfg(dir)
  }
  start() {
    const filename = this.getPathName('app-config.json')
    const content = this.getFileContent(filename)
    const config = JSON.parse(content)
    let { subPackages } = config
    const app = {}
    if (subPackages) { app.subPackages = this.getSubPack(subPackages, []) }

  }

  getSubPack(subPackages, pages) {
    let subPs = []
    // let pages = app.pages
    for (let subPackage of subPackages) {
      let { root } = subPackage

      if (!root.endsWith('/')) root += '/'
      if (root.startsWith('/')) root = root.substring(1)

      let newPages = []
      if (subPackage.pages) for (let page of subPackage.pages) {
        let items = page.replace(root, '')
        newPages.push(items)
        let subIndex = pages.indexOf(root + items)
        if (subIndex !== -1) {
          pages.splice(subIndex, 1)
        }
      }
      subPackage.root = root
      subPackage.pages = newPages
      subPs.push(subPackage)
    }
    // app.subPackages = subPs
    // app.pages = pages
    console.log("================\n分包个数为: ", subPs.length, "\n================")
    return subPs
  }
}

module.exports = {
  WxCfg
}
