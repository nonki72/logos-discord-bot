class StoredFunction {
  /**
   * memoize: boolean - should return values be stored or not
   * type: javascript type
   * klass: if type=='object' then the name of the class goes here. must exist in Class database
   * argTypes: array of javascript types. 
   *           may be Application, Identifier, Abstraction from ast.js
   * modules: array of 'Module' names which are already stored in the 'Module' database
   *          modules will be provided to the functionBody by the construct
   * functionBody: function body in javascript as 
   *               may refer to provided context object 'CTX'.
   *               may be data (with zero argTypes)
   *
   *               CTX.args: access arguments array for function instance (already typechecked against argTypes)
   *               CTX.fn(functionName): access named function (free identifier) by name. 
   *                                     invoke with CTX.fn().call() CTX.fn().apply() or use as data
   */
  constructor(memoize, type, mod, klass, argTypes, modules, functionBody, promise) {
    this.memoize = memoize;
    this.type = type;
    if (type === 'undefined') this.type = undefined;
    this.mod = mod;
    this.klass = klass;
    this.argTypes = argTypes;
    this.modules = modules;
    this.functionBody = functionBody;
    this.promise = promise;
  }

  toString() {
    return `(κ ${this.memoize}. ${this.type}. ${this.mod}. ${this.klass}. ${this.argTypes}. ${this.functionBody}. ${this.promise})`;
  }
}

exports.StoredFunction = StoredFunction;