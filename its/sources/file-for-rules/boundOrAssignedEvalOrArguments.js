
function foo1(arguments){
    return arguments;
}

foo1();

function foo2(){
    arguments[0] = 1;
    arguments = 1;

    function eval(){
        return 1;
    }
}

foo2();

eval('');
