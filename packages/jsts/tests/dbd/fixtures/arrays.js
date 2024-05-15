function subscription_read(x) {
    return x[0];
}

function subscription_multiple_index(x) {
    return x[0, 1]
}

function subscription_read_dict(x) {
    return x['key']
}

function list_literal() {
    return [1, 2, 3]
}

function list_literal_empty() {
    return []
}

function list_literal_inception() {
    return [1, 2, [3, 4]]
}

function list_literal_unpacking() {
    const l1 = [1, 2, 3]
    return [4, 5, ...l1];
}

function list_literal_unpacking_assignment() {
    const l1 = [1, 2, 3];
    const [x, y, z] = l1;
}

function list_literal_args(x, y) {
    let l = [];
    l = [x];
    l = [x, y];
}