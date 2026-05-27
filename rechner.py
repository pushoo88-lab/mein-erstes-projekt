def addiere(a, b):
    return a + b


def subtrahiere(a, b):
    return a - b


def multipliziere(a, b):
    return a * b


def dividiere(a, b):
    if b == 0:
        raise ValueError("Division durch Null ist nicht erlaubt")
    return a / b
