class C {
    public static a = 1; // Noncompliant [[qf1]] {{Make this public static property readonly.}}
//                ^
// fix@qf1 {{Add "readonly" keyword}}
// edit@qf1 [[sc=4;ec=24]] {{public static readonly a = 1;}}

    static b = 1; // Noncompliant [[qf2]]
//         ^
// fix@qf2 {{Add "readonly" keyword}}
// edit@qf2 [[sc=4;ec=17]] {{static readonly b = 1;}}

    static readonly c = 1; // Compliant
    private static d = 1; // Compliant
}
