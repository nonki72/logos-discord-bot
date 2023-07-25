const DataLib = require('./datalib.cjs');

class Fragment {
  toString(ctx={}) {
    return "<Empty Fragment>";
  }
}

class Abstraction extends Fragment {
  /**
   * param here is the name of the variable of the abstraction. Body is the
   * subtree  representing the body of the abstraction.
   */
  constructor(astid, param, body, bodyid) {
    super();
    this.type = 'abs';
    this.fntype = 'object';
    this.fnmod = "AST";
    this.fnclas = 'Abstraction';
    if (typeof astid === 'object') {
      var data = astid;
      this.astid = (data.astid != null) ? data.astid : data.id;
      this.param = data.name;
      this.body = null;
      this.bodyid = data.def2;
    } else {
      this.astid = astid;
      this.param = param;
      this.body = body;
      this.bodyid = bodyid;
    }
  }

  toString(ctx={}) {
    return `(λ${this.param}. ${this.body.toString([this.param])})`;
  }
}

class Application extends Fragment {
  /**
   * (lhs rhs) - left-hand side and right-hand side of an application.
   */
  constructor(astid, lhs, lhsid, rhs, rhsid) {
    super();
    this.type = 'app';
    this.fntype = 'object';
    this.fnmod = "AST";
    this.fnclas = 'Application';
    if (typeof astid === 'object') {
      var data = astid;
      this.astid = (data.astid != null) ? data.astid : data.id;
      this.lhsid = (data.lhsid != null) ? data.lhsid : data.def1;
      this.rhsid = (data.rhsid != null) ? data.rhsid : data.def2;
      this.lhs = null;
      this.rhs = null;
    } else {
      this.astid = astid;
      this.lhs = lhs;
      this.rhs = rhs;
      this.lhsid = lhsid;
      this.rhsid = rhsid;
    }
  }

  toString(ctx={}) {
    return `${this.lhs.toString(ctx)} ${this.rhs.toString(ctx)}`;
  }
}

class Identifier extends Fragment {
  /**
   * name is the string matched for this identifier.
   */
  constructor(fn, astid, type, fntype, fnmod, fnclas, argCount, argTypes, mods, memo, promise) {
    super();
    if (isIdentifier(fn)) {
      var data = fn;
      this.value = data.name;
      this.astid = (data.astid != null) ? data.astid : data.id;
      this.fn = data.fn;
      this.type = data.type;
      this.fntype = data.fntype;
      this.fnmod = data.fnmod;
      this.fnclas = data.fnclas;
      this.argCount = data.argn;
      if (data.argt == '"undefined"' || data.argt == 'undefined') this.argTypes = undefined;
      else this.argTypes = data.argt;
      this.args = (this.argCount == null) ? null : [];    
      this.mods = data.mods;
      this.memo = data.memo;
      this.promise = data.promise;
    } else {
      this.astid = astid;
      this.fn = fn;
      this.type = type;
      this.fntype = fntype;
      this.fnmod = fnmod
      this.fnclas = fnclas;
      this.argCount = argCount;
      this.argTypes = argTypes;
      this.args = [];
      this.mods = mods;
      this.memo = memo;
      this.promise = promise
    }
  }

  toString(ctx={}) {
    return this.value;
  }
}

class Substitution {

  constructor(styp, def1, def2, invalid) {
    if (typeof styp == 'object') {
      var data = styp;
      this.subType = data.styp;
      this.def1 = data.def1;
      this.def2 = data.def2;
      this.invalid = (data.invalid != null) ? data.invalid : false;
    } else {
      this.subType = styp;
      this.def1 = def1;
      this.def2 = def2;
      this.invalid = (invalid != null) ? invalid : false;
    }
  }

  toString(ctx={}) {
    if (this.invalid) {
      return `${this.styp}: ${this.def1} -x-> ${this.def2}`;
    } else {
      return `${this.styp}: ${this.def1} --> ${this.def2}`;
    }
  }
}

class AlphaSubstitution extends Substitution {
  constructor(obj) {
    super('alpha', obj.def1, obj.def2, obj.invalid);
  }
}
class BetaSubstitution extends Substitution {
  constructor(obj) {
    super('beta', obj.def1, obj.def2, obj.invalid);
  }
}
class EtaSubstitution extends Substitution {
  constructor(obj) {
    super('eta', obj.def1, obj.def2, obj.invalid);
  }
}

const tryParseJson = (input) => {
  try {
    return JSON.parse(input);
  } catch (err) {
    return input;
  }
}

const isFragment = node => isAbstraction(node) || isApplication(node) || isIdentifier(node);
const isAbstraction = node => node instanceof Abstraction || (node.type == 'abs');
const isIdentifier = node => node instanceof Identifier || (node.type == 'id' || node.type == 'free');
const isApplication = node => node instanceof Application || (node.type == 'app');
const isSubstitution = node => isAlphaSubstitution(node) || isBetaSubstitution(node) || isEtaSubstitution(node);
const isAlphaSubstitution = node => node instanceof AlphaSubstitution || (node.styp == 'alpha');
const isBetaSubstitution = node => node instanceof BetaSubstitution || (node.styp == 'beta');
const isEtaSubstitution = node => node instanceof EtaSubstitution || (node.styp == 'eta');

const isA = (clas, data) => {
  switch (clas) {
    case 'Fragment': return isFragment(data); break;
    case 'Abstraction': return isAbstraction(data); break;
    case 'Application': return isApplication(data); break;
    case 'Identifier': return isIdentifier(data); break;
    case 'Substitution': return isSubstitution(data); break;
    case 'AlphaSubstitution': return isAlphaSubstitution(data); break;
    case 'BetaSubstitution': return isBetaSubstitution(data); break;
    case 'EtaSubstitution': return isEtaSubstitution(data); break;
    default: return null;
  }
}
const cast = (input) => {
  return castAst(input);
}

const castAst = (input) => {
  if (isIdentifier(input)) {
    return new Identifier(input);
  } else if (isAbstraction(input)) {
    return new Abstraction(input);
  } else if (isApplication(input)) {
    return new Application(input);
  } else if (isAlphaSubstitution(input)) {
    return new AlphaSubstitution(input);
  } else if (isBetaSubstitution(input)) {
    return new BetaSubstitution(input);
  } else if (isEtaSubstitution(input)) {
    return new EtaSubstitution(input);
  } else {
    DataLib.readOrCreateFreeIdentifierFunction(null, 
      null, input, typeof input, null, null, 0, null, null, false, false, (freeIdentifier) => {
      if (freeIdentifier == null) {
        console.error('Could not create free identifier from:\n>' + JSON.stringify(input,null,4));
        return null;
      }
      return new Identifier(input); // is not a known class, made a free identifier containing simply typed input (could be an object)
    });
  }
}

exports.cast = cast;

exports.isA = isA;
exports.isFragment = isFragment;
exports.isAbstraction = isAbstraction;
exports.isApplication = isApplication;
exports.isIdentifier = isIdentifier;
exports.isSubstitution = isSubstitution;
exports.isAlphaSubstitution = isSubstitution;
exports.isBetaSubstitution = isSubstitution;
exports.isEtaSubstitution = isSubstitution;

exports.Fragment = Fragment;
exports.Abstraction = Abstraction;
exports.Application = Application;
exports.Identifier = Identifier;
exports.Substitution = Substitution;
exports.AlphaSubstitution = AlphaSubstitution;
exports.BetaSubstitution = BetaSubstitution;
exports.EtaSubstitution = EtaSubstitution;
