var obj = {
    key: 'value',
    "key": 'value',

    get key() { return this.key ; },
    set key(p) { this.key = p; }
};