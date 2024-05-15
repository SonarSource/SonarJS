def import_stmt():
    import mod
    import other_mod, third_mod
    x = mod.f()

def import_multiple():
    import mod
    from mod.f import x
    return 42

def import_from():
    from mod import f
    x = 42
