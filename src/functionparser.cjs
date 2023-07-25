'use strict';
const async = require("async");
const DataLib = require('./datalib');
const F = require('./function');
const Q = require('q');
const Diary = require('./diary');
const AST = require('./ast');



// TODO: use node vm



// context for evaluating the function body
const contextClosure = function(str, argTypes, args, modules, promise, cb) {
	var requires = '';
	if (modules != null) {
		for (var i = 0; i < modules.length; i++) {
			var module = modules[i];
			requires += `const ${module.name} = require('${module.path}');
									`;
		}
	}

	const CTX = {
		args: {}
	};

  if (argTypes != null) {
		for (var i = 0; i < argTypes.length; i++) {
			var argName = argTypes[i][0];
			var argType = argTypes[i][1];
			var argMod  = argTypes[i][2];
			var argClas = argTypes[i][3];
			CTX.args[argName] = args[i];
		}
	}

  console.log("!!!!!!!!!!!!!!CODE EXECUTION!!!!!!!!!!!\n"
  	+requires+str
  	+"\n!!!!!!!!!!!CTX!!!!!!!!!!!!!!!\n"
  	+JSON.stringify(CTX,null,4)
  	+"\n!!!!!!!!!!!!!!RUNNING!!!!!!!!!!!!!");

  var output = eval(requires + str);            // <=== CODE EXECUTION

  console.log("!!!!!!!!!!!!!!OUTPUT!!!!!!!!!!!\n"
  	+output);

  if (promise == true) {
  	output.then(
	  	(result) => {
/*
			  console.log(
			  	   "!!!!!!!!!!!!!!OUTPUT!!!!!!!!!!\n"
			  	+JSON.stringify(result,null,4)
			  	+"\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
*/
	  		return cb(result)},
	  	(err)=>{
			console.error(
	  		     "!!!!!!!!!!EVAL ERROR!!!!!!!!!!\n"
			+JSON.stringify(err,null,4)
			+"\n!!!!!!!!!!!!!!!!!!!!!!!!!");
		  	
			  return cb(null)}
	);
  } else {
/*
	  console.log(
	  	   "!!!!!!!!!!!!!!OUTPUT!!!!!!!!!!\n"
	  	+JSON.stringify(output,null,4)
	  	+"\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
*/
	  return cb(output);
	}
}

// retrieves all the modules given storedFunction's module array
function loadModules (moduleNames, cb) {
	if (moduleNames == null || moduleNames.length == 0) {
		return cb(null, []);
	}
	async.map(moduleNames, (moduleName, callback) => {
		DataLib.readModuleByName(moduleName, (module) => {
			if (module == null) {
				return callback('Invalid module \'' + moduleName + '\'');
			}
			return callback(null, module);
		});
	}, (err, results) => {
		if (err) {
			return cb(err, []);
		}

		cb(null, results);
	});
}

function loadStoredFunction(freeIdentifier) {
	if ('argTypes' in freeIdentifier) {
		// have ast version
		var storedFunction = new F.StoredFunction(
			freeIdentifier.memo, 
			freeIdentifier.fntype,
			freeIdentifier.fnmod, 
			freeIdentifier.fnclas, 
			freeIdentifier.argTypes, 
			freeIdentifier.mods, 
			freeIdentifier.fn,
			freeIdentifier.promise);
		return storedFunction;
	}
	// straight from db
	var storedFunction = new F.StoredFunction(
		freeIdentifier.memo, 
		freeIdentifier.fntype, 
		freeIdentifier.fnmod,
		freeIdentifier.fnclas, 
		freeIdentifier.argt, 
		freeIdentifier.mods, 
		freeIdentifier.fn, 
		freeIdentifier.promise);
	return storedFunction; 
}

/* parse the given function for consistency and correctness
 *
 * note: if argTypes is null this is a stored value (a function has empty array [] for argTypes)
 *       in this case we can still evaluate the functionbody to match its type & class
 *       (the last line is the returned value of an eval)
 *
 * returns null on success, error message on failure
*/
function parseFunction (storedFunction, args, cb) {
	if (!(storedFunction instanceof F.StoredFunction)) {
		return cb('Must be instance of StoredFunction');
	}

 var type = new String(storedFunction.type);

  loadModules(storedFunction.modules, (err, modulePaths) => {
		if (err) {
			return cb("Module error: " + err  + JSON.stringify(storedFunction));
		}
  	checkArgs(storedFunction.argTypes, args, (err2) => {
  		if (err2) {
  			return cb("Check argument error: " + err2  + JSON.stringify(storedFunction));
  		}

			if (storedFunction.functionBody == null) {
				// this is an extensional function (defined by substitutions) or maybe a plain free identifier ended up here
				return cb(null);
			}

			try {
				contextClosure.call(null, storedFunction.functionBody, storedFunction.argTypes, args, modulePaths, storedFunction.promise, function(result) {
			    if (typeof result === type) {
				    return cb(`storedFunction is type '${typeof result}' and not '${type}'` + JSON.stringify(result));
				  }

				  if (storedFunction.type == 'object') {
				  	return checkClass(result, storedFunction.mod, storedFunction.klass, (err3) => {
				  		if (err3) {
				  			return cb("Check class error: " + err3 + JSON.stringify(storedFunction));
				  		}
				  		return cb(null);
				  	});
			    } else {
			   	  return cb(null);
			    }
				});   // <=== CODE EXECUTION
			} catch (e) {
		    if (e instanceof SyntaxError) {
		      return cb(`SyntaxError on line ${e.lineNumber}: ${e.message}` + JSON.stringify(storedFunction), e);
		    }

		    return cb(`${e.constructor.name} error on line ${extractLineNumberFromStack(e.stack)}: ${e.message}` + JSON.stringify(storedFunction), e);
			}
	  });
  });
}

function executeFunction(storedFunction, args, cb) {
	if (!(storedFunction instanceof F.StoredFunction)) {
		console.error('executeFunction -> Must be instance of StoredFunction');
		return cb(null);
	}

  loadModules(storedFunction.modules, (err, modulePaths) => {
  	if (err) {
  		console.error("ExecuteFunction module error: " + err  + JSON.stringify(storedFunction));
  		return cb(null);
  	}
  	checkArgs(storedFunction.argTypes, args, (err2) => {
  		if (err2) {
  			console.error("ExecuteFunction args error: " + err2  + JSON.stringify(storedFunction));
  			return cb(null);
  		}

			try {
				contextClosure.call(null, storedFunction.functionBody, storedFunction.argTypes, args, modulePaths, storedFunction.promise, function(result) {
					//TODO: check class of output here
					return cb(result);
				});   // <=== CODE EXECUTION
			} catch (e) {
		    if (e instanceof SyntaxError) {
		      console.error(`executeFunction -> SyntaxError on line ${extractLineNumberFromStack(e.stack)}: ${e.message}` + JSON.stringify(storedFunction), e);
		    }

		    console.error(`executeFunction -> ${e.constructor.name} error on line ${e.lineNumber}: ${e.message}` + JSON.stringify(storedFunction), e);
		    cb(null);
			}
  	});
	});
}

function checkClass(testObject, moduleName, className, cb) {
  if (testObject == null || typeof testObject != 'object' || className == null) return cb(null);
  if (!moduleName || moduleName == 'undefined') moduleName = 'JS';
  DataLib.readClassByNameAndModule(className, moduleName, (klass) => {
  	if (klass == null) {
  		return cb(`class  '${moduleName}.${className}' is not found in the database`);
  	}

  	DataLib.readModuleByName(moduleName, (mod) => {
			if (mod == null) {
				return cb(`class '${klass.name}' belongs to module '${klass.module}' which is not found in the database`);
			}

			if (mod.name == "AST") {
				if (!AST.isA(klass.name, testObject)) {
			    return cb('object is class "'+testObject.constructor.name+'" and not "'+mod.name+'.'+klass.name+'"');
			  }
			}
		  else if (testObject.constructor.name != klass.name) {
			  return cb('object is class "'+testObject.constructor.name+'" and not "'+mod.name+'.'+klass.name+'"');
			}

  	  return cb(null);
    });
  });
}

// match each of args with its respective argType which specifies the 
// colloquial name, the type and optionally the class name
// verify these for consistency in parallel
// if class name is specified then code execution occurs
function checkArgs(argTypes, args, cb) {
	if (!Array.isArray(argTypes)) {
		if (!Array.isArray(args)) {
			return cb(null);
		}
		if (args.length > 0) {
			return cb("More args than argTypes");
		}
		return cb(null);
	} 
	if (argTypes.length > args.length) {
		return cb("More argTypes than args");
	}
	if (argTypes.length < args.length) {
		return cb("More args than argTypes");
	}

	async.eachOf(args, (arg, i, callback) => {
		if (!Array.isArray(argTypes[i]) || argTypes[i].length < 2) {
			return callback("Argtype #" + i + " is not of length >= 2 specifying name and type (& class)" + JSON.stringify(argTypes));
		}
		var argName = argTypes[i][0];
		var argType = argTypes[i][1]; // type, maybe 'object' if so use argMod & argClas
		var argMod  = (argTypes[i].length > 2) ? argTypes[i][2] : null;
		var argClass = (argTypes[i].length > 2) ? argTypes[i][3] : null;

		if (typeof arg != argType && typeof arg != 'object') {
			return callback("Arg " + argName+ " `" + arg + "` is type `" + typeof arg + "` and not `" + argType + "`");
		}
    if (argClass) {
		  checkClass(arg, argMod, argClass, (err) => {
		  	return callback(err);
		  });
    } else {
    	return callback(null);
    }
  }, (err) => {
  	return cb(err);
  });
}

function extractLineNumberFromStack (stack) {
  if(!stack) return '?'; // fix undefined issue reported by @sigod

	var caller_line = stack.split("\n")[1];
	var index = caller_line.indexOf(",") + 14; // ` <anonymous>:`
	var clean = caller_line.slice(index, caller_line.length - 1);

  return clean;
}

function isPromise(obj) {
  return Promise.resolve(obj) == obj;
}

module.exports = {
	loadStoredFunction: loadStoredFunction,
	parseFunction: parseFunction,
	executeFunction: executeFunction
};
