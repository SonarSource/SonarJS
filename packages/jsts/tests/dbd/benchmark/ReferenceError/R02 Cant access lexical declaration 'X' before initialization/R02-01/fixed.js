var viewer;

// window.addEventListener("load", DOMViewer_initialize, false);
// window.addEventListener("unload", DOMViewer_destroy, false);

function DOMViewer_initialize() {
  viewer = new DOMViewer();
  // viewer.initialize(parent.FrameExchange.receiveData(window));
}

function DOMViewer_destroy() {
  PrefUtils.removeObserver('inspector', PrefChangeObserver);
  viewer.removeClickListeners();
  viewer = null;
}

//////////////////////////////////////////////////////////////////////////////
//// class DOMViewer

function DOMViewer() {
  // implements inIViewer
  // this.mDOMTree = document.getElementById("trDOMTree");
  this.mDOMTree = {
    view: {
      selection: {
        getRangeCount: function () {
          return 42;
        },
        getRangeAt: function () {},
      },
    },
  };
}

DOMViewer.prototype = {
  mSubject: null,
  mDOMView: null,
  // searching stuff
  mFindResult: null,
  mColumns: null,
  mFindDir: null,
  mFindParams: null,
  mFindType: null,
  mFindWalker: null,
  mSelecting: false,

  mSelectionBatchNest: 0,
  mPendingSelection: null,

  /**
   * Determine the tree's selected rows.
   * @return An array of row indexes.
   */
  getSelectedIndexes: function DVr_GetSelectedIndexes() {
    var indexes = [];
    var selection = this.mDOMTree.view.selection;
    for (let i = 0, n = selection.getRangeCount(); i < n; ++i) {
      var min = {};
      var max = {};
      selection.getRangeAt(i, min, max);
      for (let j = min.value; j <= max.value; ++j) {
        // not sure about this one
        indexes.push(j);
      }
    }
    return indexes;
  },
};

DOMViewer_initialize();
viewer.getSelectedIndexes();
