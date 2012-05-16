if (a = 1) { // NOK
}

if (a == 1, b = 2) { // NOK
}

if (a == 1) { // OK
}

if ((value = someFunction()) === true) { // OK
}

while (a = 1) { // NOK
}

while (a == 1) { // OK
}

do {
} while (a = 1) // NOK

do {
} while (a == 1) // OK

for (i = 0; i = 10; i++) { // NOK
}

for (i = 0; i < 10; i++) { // OK
}

for (i = 0; ; i++) { // OK
}
