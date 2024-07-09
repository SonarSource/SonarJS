interface FooProps {
    x: number;
    y: string;
}

function Foo(props: FooProps) { // Noncompliant [[qf1]] {{Mark the props of the component as read-only.}}
//           ^^^^^^^^^^^^^^^
// fix@qf1 {{Mark the props as read-only}}
// edit@qf1 [[sc=20;ec=28]] {{Readonly<FooProps>}}
    return (
        <div>{props.x}</div>
    );
}

type BarProps = {
    x: number;
    y: string;
}

function Bar(props: BarProps) { // Noncompliant
    return (
        <div>{props.x}</div>
    );
}

interface BazProps {
    x: number;
    y: string;
}

function Baz(props: Readonly<BazProps>) { // Compliant
    return (
        <div>{props.x}</div>
    );
}

type QuxProps = {
    readonly x: number;
    readonly y: string;
}

function Qux(props: QuxProps) { // Compliant
    return (
        <div>{props.x}</div>
    );
}

interface QuuxProps {
    readonly x: number;
    readonly y: string;
}

function Quux(props: QuuxProps) { // Compliant
    return (
        <div>{props.x}</div>
    );
}

function Corge(props: { readonly x: number, readonly y: string }) { // Compliant
    return (
        <div>{props.x}</div>
    );
}

function Grault(props: Readonly<{ x: number, y: string }>) { // Compliant
    return (
        <div>{props.x}</div>
    );
}

function coverage() {

    (function () {

    });

    function a() {

    }

    function B() {

    }

    function C() {
        return;
    }

    function D() {
        return 42;
    }

    function E() {
        return <div></div>;
    }

    function F(props) {
        return <div></div>;
    }

    function G(props: number) {
        return <div></div>;
    }

    function I(props: number, extra: string) {
        return <div></div>;
    }

    function J(props: UnknownProps) {
        return <div></div>;
    }
}
