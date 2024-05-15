try:
    import answer_to_life
except ImportError:
    import this

def continue_stmt():
  continue

# Supported: only thing to be translated
def pass_stmt():
    pass

def global_stmt():
  global x

def match_stmt(x):
  match x:
    case 400:
        ...
    case 404:
        ...
    case _:
        ...

def non_local_stmt():
  nonlocal x

def try_stmt():
    try:
      ...
    except:
      ...

def with_stmt():
  with open('file-path', 'w') as file:
      file.write('Lorem ipsum')

def yield_stmt(i):
  yield i + 1


if some:
    def ambiguous_definition():
        f()
else:
    def ambiguous_definition():
        g()

@some_decorator
def decorated_function():
    ...
