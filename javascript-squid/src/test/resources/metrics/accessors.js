var obj = {
    key = "value",
    set key(key) { this.key = key; },
    get key() { return this.key; }
}

class c {

    constructor () {
        key = "value"
    }
    set key(key) {
        this.key = key;
    }

    get key() {
        return this.key;
    }
}
