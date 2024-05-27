const FmcFile = {
  storeGet: async () => { return {} },
  storeSet: () => {},
};
const dialog = {
  showOpenDialog: () => {
    return {
      filePaths: 'foo'
    }
  },
};

////// fixtures above this point

class Foo {
  /**
   * @function selectFolderDialog
   * @param {object} args - Arguments
   * @param {string} args.dialogTitle - Dialog title
   * @param {string} args.dialogButtonLabel - Dialog button label
   * @param {string} args.restore - Restore previously stored return
   * @param {string} args.storeKey - Store return value with this key
   * @param {boolean} args.retrieveImagesData - Return imagesData
   * @returns {object} { folderName, folderPath, imagesData }
   * @memberof FmcFile
   * @static
   */
  static async selectFolderDialog({
    dialogTitle,
    dialogButtonLabel,
    retrieveImagesData,
    restore,
    storeKey,
  }) {
    let folderPath;

    const data = await FmcFile.storeGet(null, {
      key: storeKey,
    });

    if (typeof data !== "undefined") {
      ({
        folderPath = "~/", // default
      } = data);
    }
    if (restore) {
      if (typeof data === "undefined") {
        return {};
      }
      if (retrieveImagesData) {
        const imageFiles = FmcFile.getImageFiles(data.folderPath);
        const dataCopy = { ...data }; // #30
        // imagesData retrieved separately to accommodate file renaming in the interim
        dataCopy.imagesData = await FmcFile.getImagesData(imageFiles);
        return dataCopy;
      }
      return data; // !retrieveImagesData
    }
    const { canceled, filePaths } = await dialog.showOpenDialog({
      buttonLabel: dialogButtonLabel,
      defaultPath: folderPath,
      message: dialogTitle,
      properties: ["createDirectory", "openDirectory", "showHiddenFiles"],
      title: dialogTitle,
    });
    if (!canceled && filePaths.length) {
      let imagesData = [];
      folderPath = filePaths[0];
      if (retrieveImagesData) {
        const imageFiles = FmcFile.getImageFiles(folderPath);
        imagesData = await FmcFile.getImagesData(imageFiles);
      }
      const pathSeparator = folderPath.lastIndexOf("/");
      const folderName = folderPath.slice(pathSeparator + 1);
      data = {  // Noncompliant: Assignment to constant variable
        folderName,
        folderPath,
        imagesData,
      };
      FmcFile.storeSet(null, {
        key: storeKey,
        value: {
          folderName,
          folderPath,
        },
      });
      return data;
    }
    return {};
  }
}

Foo.selectFolderDialog({
  restore: undefined,
  retrieveImagesData: undefined,
})
