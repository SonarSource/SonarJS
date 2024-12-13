class FakeWebChannel extends EventTarget {
  /**
   * @param {!WebChannel.MessageData} messageData
   * @override
   */
  constructor(messageData) {
    super();

    /** @private {?boolean} */
    this.open_ = null;

    /** @private @const {!Array<!WebChannel.MessageData>} */
    this.messages_ = [];
  }
}
