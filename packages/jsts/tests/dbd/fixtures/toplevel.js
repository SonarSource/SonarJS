def gcd(x, y):
    pass

x = 92
y = 34
z = gcd(x, y)
assert z == 2

class Rational:
    def __init__(self, nom, denom):
        self.nom = nom
        self.denom = denom

rational = Rational(x, y)

def simplify(rational):
    d = gcd(rational.nom, rational.denom)
    return Rational(rational.nom / d, rational.denom / d)

simplified = simplify(rational)
assert gcd(simplified.denom, simplified.nom) == 1
