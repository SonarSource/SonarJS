def raise_new_exception():
    raise ValueError()


def raise_param(param):
    raise param


def bare_raise():
    raise


def raise_from(param):
    raise ValueError() from param


def python2_raise_not_supported():
    raise Exception, "a message"
