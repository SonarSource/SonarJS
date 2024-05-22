function simple_assignment() {
    x = null

} 

function assignment_to_int() {
    x = 42

} 

function assignment_to_bool() {
    x = true
    y = false

} 

function unpacking_assignment() {
    [x, y] = [null, null]

} 

function unpacking_iterable(my_iterable) {
    [x, y] = my_iterable

} 

function unpacking_iterable_field_access(x, my_iterable) {
    [x.my_field, y] = my_iterable

} 

function unpacking_iterable_star_token(my_iterable) {
    [x, ...y] = my_iterable

} 

function unpacking_iterable_subscription(x, my_iterable) {
    [x[0], y] = my_iterable

} 

function augmented_assignment(x) {
    x += 42
    x -= 2
    x *= 2
    x /= 2
    x %= 2
    x **= 2

} 


function augmented_assignment_undefined_name() {
    unknown_name += 42

} 

function augmented_assignment_qualified_expression(x) {
    x.y += 42

} 

function augmented_assignment_subscription(x) {
    x[10] += 42

} 

function subscription_assignment(arr) {
    arr[0] = 42

} 

function subscription_to_dict(x) {
    x['key'] = 42

} 

function attribute_assignment(obj) {
    obj.x = 42

} 

function foo(x) {
    pass

} 

function assignment_expression() {
    foo(x=42)

} 

function assignment_expression_reassigned() {
    y = (x=42)
    return y

} 

function assignment_expression_if_stmt() {
   if (x = foo(true)) {
     return x.bar
   }
} 

function assign_global_variable_assignement_exp() {
    y = (my_global_x = 42)

} 

function multiple_assignments(t) {
    x = y = null
    x, y = i, j = t

} 

function assign_global_variable() {
    my_global_x = null

}
