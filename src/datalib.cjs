'use strict';
var mongo = require('mongodb');
const mongoConfig = require('../keys/mongo.json');
var MongoClient = mongo.MongoClient;
var ObjectID = mongo.ObjectID;
const Sql = require('./sql.cjs');

const connectOption = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
	connectTimeoutMS: 50000,
	serverSelectionTimeoutMS: 50000
}
var _client = null;


async function getDb() {
	try {
		if (_client != null) return _client;
		var url = mongoConfig.url;
		_client = await MongoClient.connect(url, connectOption).catch(err => {
			console.error(err);
		});
		return _client;
	} catch (error) {
		console.error(error);
	}
}

getDb();
//                          ########### READ FUNCTIONS ############




// takes a lambda fragment and min value
// reads most reduced equivalent fragment from its EC (Equivalence Class)
async function readByEquivalenceClass (id) {
	const query = {
		'ecid': entity.ecid
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('EC').find(query).sort({'size':-1}).limit(1);
		if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readByAssociativeValue(sourceId, cb) {
	var associationId = await Sql.getRandomECAstId(sourceId);
	if (associationId) {
		return readById(associationId, (entity) => {
			if (entity) {
				entity.association = associationId; // ************************* needed?
				return cb(entity);
			}
		});
	}
	return cb(null);
  //DONTDO: no assv to report, select at random
	//return readFreeIdentifierByRandomValue(cb);
	//readbyrandomvalue() // todo: also want abs & apps
}

// reads applicator based on probabilistic selection of matching associations
async function readApplicatorByAssociativeValue(sourceId, cb) {
	var associationId = await Sql.getRandomECAstId(sourceId);
	if (associationId) {
		console.log("$$$ A1 $$$");
		return readById(associationId, (entity) => {
			if (entity) {
				entity.association = associationId; // ************************* needed?
				return cb(entity);
			}
		});
	}

  // no assv to report, select at random
	console.log("$$$ A3 $$$");
	return readApplicatorByRandomValue(cb);
}

function readByRandomValueAndType (fragment, cb) {
	switch (typeof fragment) {
		case AST.Identifier:
		  if (fragment.argCount != null) {
		  	// this is a function type free identifier
		  	// look for something with this fntype (return type)
		  	readFreeIdentifierFnByRandomValue(fragment.fntype, fragment.fnclas, (freeIdentifierFn) => {
		  		if (freeIdentifier == null) {
			  	  readFreeIdentifierFnByRandomValue(undefined, undefined, (freeIdentifierFn2) => {
			  			return cb(freeIdentifierFn2)
			  		});
			  	} else {
			  		return cb(freeIdentifierFn);
			  	}
		  	});
		  } else {
		  	// this is a value type free identifier
		  	// look for something with this fntype (value's type)
			  readFreeIdentifierValueByRandomValue(fragment.fntype, (freeIdentifier) => {
		  		if (freeIdentifier == null) {
			  	  readFreeIdentifierValueByRandomValue(undefined, (freeIdentifier2) => {
			  			return cb(freeIdentifierFn2)
			  		});
			  	} else {
			  		return cb(freeIdentifierFn);
			  	}
			  });
			}
			break;
		case AST.Abstraction:
		  readAbstractionByRandomValue((abstraction) => {
		  	return cb(abstraction);
		  });
		  break;
		case AST.Application:
		  readApplicationByRandomValue((application) => {
		  	return cb(application);
		  });
		  break;
		default:
			return cb(null);
	}
}

// randomly reads an abs or free id fragment
// may be suitable for using as a lhs to apply to input
function readApplicatorByRandomValue (cb) {
	if (Math.random() > 0.5) {
		readAbstractionByRandomValue(function(res) {
			if (res) return cb(res);
		  return readFreeIdentifierByRandomValue(cb);
		});
	} else {
		return readFreeIdentifierByRandomValue(cb);
	}
}

// randomly reads an abs fragment
// may be suitable for using as a lhs to apply to input
async function readAbstractionByRandomValue (cb) {
	const query = {
		'type': 'abs',
		'rand': {$lte: Math.random()}
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').find(query).sort({'rand':-1}).limit(1);
		if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

// randomly reads a free fragment
// may be suitable for using as a lhs to apply to input
async function readFreeIdentifierByRandomValue (cb) {
	const match =
		{$match:{
			'type': 'free'
		}};

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match,sample]);
    if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readFreeIdentifierValueByRandomValue (fntype, fnmod, fnclas, cb) {
	const match =
		{$match:{
			'type': 'free',
			'argn': null //{$exists: false}
		}};
	if (fnclas != undefined) {
		match.$match.fntype = 'object';
		match.$match.fnmod = fnmod;
		match.$match.fnclas = fnclas;
	} else {
		if (fntype != undefined) match.$match.fntype = fntype;
		if (fnmod != undefined) match.$match.fnmod = fnmod;
		if (fnclas != undefined) match.$match.fnclas = fnclas;
	}

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match,sample]);
    if (cursor.hasNext()) {
		const res = await cursor.next();
		return res;
	}
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}


async function readFreeIdentifierFnByRandomValue (fntype, fnclas, cb) {
	const match =
		{$match:{
			'type': 'free',
			'argn': {$type:'number'}
		}};
	if (fntype == 'AST') {
		match.$match.fntype = 'object';
		match.$match.fnclas = fnclas;
	} else {
		if (fntype != undefined) match.$match.fntype = fntype;
		if (fnclas != undefined) match.$match.fnclas = fnclas;
	}

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match,sample]);
    if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readFreeIdentifierFnThatTakesArgsByRandomValue (cb) {
	const match =
	{$match:{
		'type': 'free',
		'argn': {$gte: 1}
	}};

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match,sample]);
		if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}


async function readFreeIdentifierFnThatTakesFirstArgOfTypeByRandomValue (argtype, argmod, argclas, cb) {
	const match = (argclas == null) ?
	{$match:{
//		'type': 'free',
//		'argn': {$gte: 1},
		'argt.0.1': argtype
	}}
	:
	{$match:{
		'argt.0.1': 'object', // expect argtype to be 'object'
		'argt.0.2': argmod,
		'argt.0.3': argclas
	}};

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match,sample]);
		if (cursor.hasNext()) res = await cursor.next();
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}


async function readFreeIdentifierByName (name, cb) {
	const query = {
		'type': 'free',
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readFreeIdentifierByFn (fn, cb) {
	const query = {
		'type': 'free',
		'fn': fn
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

// randomly reads a fragment
async function readByRandomValue (type, cb) {
	var client = await getDb();
	const db = client.db("logos");
	var res = null;
	let cursor = await db.collection('Diary').aggregate([
		{
			$match: {
				type: type
			}
		},
		{ $sample: { size: 1 } }
	]);
	if (await cursor.hasNext()) {
		res = await cursor.next()
	}
/*
	try {
		const db = client.db("logos");

		var prc = spawn('python3', ['rdrandom.py']);
		prc.stdout.setEncoding('utf8');
		prc.stdout.on('data', function (data) {
			const str = data.toString();
			const lines = str.split(/(\r?\n)/g);
			const randString = (lines.join(""));
			const randFloat = Number.parseFloat(randString);
			console.log(randFloat);
			var count = 137093;
			console.log(count);
			var rand = function(){return Math.floor( randFloat * count )}
			const randInt = rand();
			console.log(randInt);
			const res = db.collection('Diary').find().limit(-1).skip(randInt).next()
		});

		prc.on('close', function (code) {
			// pass
		});

		const res = await db.collection('Diary').find().limit(1).skip(randInt).next();
		console.log(res);
	} catch(err) {
		console.error(err);
	}
 */
  return cb(res);
}

async function readFreeIdentifierByTypeAndRandomValue (fntype, fnmod, fnclas, isFunction, cb) {
	var match1;
	var match2;
	if (fnclas == 'AST') {
		match1 = {$match:{
				type: 'free',
				fntype: 'object',
				fnclas: (fnclas == 'Fragment') ? {$in: ['Fragment', 'Abstraction', 'Application', 'Identifier']} : fnclas
			}};

		match2 = {$match:{
				type: (fnclas == 'Abstraction') ? 'abs' : ((fnclas == 'Application') ? 'app' : 'free')
			}};
	} else if (fntype == 'string' && Math.random() > 0.2) {
		match1 = {$match:{
				fntype: 'object',
				fnmod: 'Grammar'
			}};
		match2 = {$match:{
				fntype: 'string'
			}};
	} else if (isFunction || isFunction == null) {
		match1 = {$match: {
				'type': 'free',
				'argn': 0 // readFreeIdentifierByTypeAndRandomValue is used to fill args, we would blow the stack if we allowed recursive args
			}};
		match2 = {$match:{
				'type': 'free',
				'argn': null
			}};
		if (fntype != undefined) {
			match1.$match.fntype = fntype;
			match2.$match.fntype = fntype;
		}
		if (fnmod != undefined) {
			match1.$match.fnmod = fnmod;
			match2.$match.fnmod = fnmod;
		}
		if (fnclas != undefined) {
			match1.$match.fnclas = fnclas;
			match2.$match.fnclas = fnclas;
		}
	} else {
		match1 = {$match:{argn:null}};
		match2 = null;
		if (fntype != undefined) {
			match1.$match.fntype = fntype;
		}
		if (fnmod != undefined) {
			match1.$match.fnmod = fnmod;
		}
		if (fnclas != undefined) {
			match1.$match.fnclas = fnclas;
		}
	}

	const sample = {$sample:{
		size: 1
	}};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		let cursor = await db.collection('Diary').aggregate([match1,sample]);
		if (await cursor.hasNext()) {
			res = await cursor.next()
		} else if (match2 != null) {
			cursor = await db.collection('Diary').aggregate([match2,sample]);
			if (await cursor.hasNext()) {
				res = await cursor.next()
			}
		}
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readWordFrequency (word, cb) {
	const query = {
		'word': word
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('WordFreq').findOne(query);
	} catch(err) {
		console.error(err);
	}
	return cb(res);
}

async function readWordFrequencyAll (cb) {
	const query = {
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('WordFreq').find(query);
	} catch(err) {
		console.error(err);
	}
	return cb(res);
}

async function readWordFrequencyAtLeast (float, cb) {
	const query = {
		'frequency': {$gte: float}
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('WordFreq').findOne(query);
	} catch(err) {
		console.error(err);
	}
	return cb(res);
}

async function readById (id, cb) {
	let objId = (id instanceof ObjectID) ? id : new ObjectID(id);
	const query = {
		'id': objId
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readClassByNameAndModule(name, mod, cb) {
	const query = {
		'name': name,
		'module': mod
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Class').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readModuleByName(name, cb) {
	const query = {
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Module').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}

async function readModuleByPath(path, cb) {
	const query = {
		'path': path
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Module').findOne(query);
  } catch(err) {
  	console.error(err);
  }
  return cb(res);
}




//                     ######### WRITE FUNCTIONS ############


async function readOrCreateWordFrequency ( word, freq, cb ) {
	var client = await getDb();
	var res = null;
	var query = {'word': word};
	try {
		const db = client.db("logos");
		res = await db.collection('WordFreq').findOne(query);
		if (res) {
			return cb(res);
		}
	} catch(err) {
		console.error(err);
	}

	// if not found
	try {
		var data = {'word': word, 'frequency': freq};
		const db = client.db("logos");
		res = await db.collection('WordFreq').insertOne(data);
	} catch (err) {
		console.error(err);
	}

	return cb(data);
}

async function readOrCreateAbstraction (name, definition2, cb) {
	const query = {
		'type': 'abs',
//		'name': name,
		'def2': definition2
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	type: 'abs',
  	name: name,
  	def2: definition2,
  	invalid: false
  };

  try {
		const db = client.db("logos");
  	res = await db.collection('Diary').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

async function readOrCreateApplication (definition1, definition2, cb) {
	const query = {
		'type': 'app',
		'def1': definition1,
		'def2': definition2
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	type: 'app',
  	def1: definition1,
  	def2: definition2,
  	invalid: false
  };

  try {
		const db = client.db("logos");
  	res = await db.collection('Diary').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

async function readOrCreateFreeIdentifier ( name, cb ) {
	const query = {
		'type': 'id',
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	type: 'id',
  	name: name,
  	argn: 0,
  	promise:false
  };

  try {
		const db = client.db("logos");
  	res = await db.collection('Diary').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

async function readOrCreateFreeIdentifierFunction (name, astid, fn, fntype, fnmod, fnclass, argnum, argtypes, modules, memoize, promise, cb) {
	const query = {
		'type': 'free',
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Diary').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	type: 'free',
  	name: name,
    astid: astid, // location (id)
    fn: fn,
    fntype: fntype,
    fnmod: fnmod,
    fnclas: fnclass,
    argn: argnum,
    argt: argtypes,
    mods: modules,
    memo: memoize,
    promise: promise
  };
  try {
		const db = client.db("logos");
  	res = await db.collection('Diary').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

// lots of stuff going on here
// might want to make this a transaction in the future
// TODO
async function readOrCreateSubstitution (subType, location1, location2, cb) {
  if (subType == 'beta') {
    // check that action1 lhs is abstraction
  }

  // see if this sub already exists (dont care if its invalid)
	const query = {  
		'styp': subType,
		'def1': location1,
		'def2': location2
	};
	var client = await getDb();
  var db;
	try {
		db = client.db("logos");
		let res = await db.collection('Substitution').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// sub does not already exist
	var data2 = null;
  try {
  	// invalidate old sub that subs to this one, if one exists
		const query = {
			invalid: false,
			def2: location1
		};
		let res = await db.collection('Substitution').findOne(query);
		if (res != null) {
			// does exist, create a new sub as direct replacement and invalidate the old one
			// (in addition to the sub we were asked to create)
			//create
		  var data = {
		  	id: new ObjectID(),
		  	invalid: false,
		  	styp: subType,
		  	def1: res.def1,
		  	def2: location2
		  };
	  	let res2 = await db.collection('Substitution').insertOne(data);
	  	if (!res2) {
	  		throw new Error("Failed to create new replacement sub: \n"+JSON.stringify(data,null,4));
	  	}

			//invalidate
	  	const queryOld = {
	  		def1: res.def1,
	  		def2: res.def2 // location1
	  	};
	  	let res3 = await db.collection('Substitution').updateOne(queryOld, {$set:{invalid:true}});
	  	if (!res3) {
	  		throw new Error("Failed to invalidate old sub: \n"+JSON.stringify(queryOld,null,4));
	  	}
		}

  	// create the new sub
	  data2 = {
	  	id: new ObjectID(),
	  	invalid: false,
	  	styp: subType,
	  	def1: location1,
	  	def2: location2
	  };
  	let res4 = await db.collection('Substitution').insertOne(data2);
  	if (!res4) {
	  	throw new Error("Failed to create sub: \n"+JSON.stringify(data2,null,4));
  	}
  } catch (err) {
  	console.error(err);
  	return cb(null);
  }

  // add sub data to EC
  const equid = await Sql.incrementECRecord(location1, location2);
  if (equid == null) {
  	console.error("Failed to increment EC for substitution: "+location1+" -> "+location2);
  	return cb(null);
  }

  return cb(data2);
}

async function readOrCreateClass (name, module, cb) {
	const query = {
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Class').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	name: name,
  	module: module
  };
  try {
		const db = client.db("logos");
  	res = await db.collection('Class').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

async function readOrCreateModule (name, path, cb) {
	const query = {
		'name': name
	};
	var client = await getDb();
	var res = null;
	try {
		const db = client.db("logos");
		res = await db.collection('Module').findOne(query);
		if (res) {
			return cb(res);
		}
  } catch(err) {
  	console.error(err);
  }

	// if not found
  var data = {
  	id: new ObjectID(),
  	name: name,
  	path: path
  };
  try {
		const db = client.db("logos");
  	res = await db.collection('Module').insertOne(data);
  } catch (err) {
  	console.error(err);
  }

  return cb(data);
}

async function update (data, cb) {
	const query = {
		'id': data.id
	};

  var res = null;
  try {
		const db = client.db("logos");
  	res = await db.updateOne(query, data);
  } catch (err) {
  	console.error(err);
  }

  return cb(res);
}

exports.readByEquivalenceClass = readByEquivalenceClass;
exports.readByRandomValueAndType = readByRandomValueAndType;
exports.readApplicatorByRandomValue = readApplicatorByRandomValue;
exports.readAbstractionByRandomValue = readAbstractionByRandomValue;
exports.readFreeIdentifierByRandomValue = readFreeIdentifierByRandomValue;
exports.readFreeIdentifierFnByRandomValue = readFreeIdentifierFnByRandomValue;
exports.readFreeIdentifierValueByRandomValue = readFreeIdentifierValueByRandomValue;
exports.readFreeIdentifierFnThatTakesArgsByRandomValue = readFreeIdentifierFnThatTakesArgsByRandomValue;
exports.readFreeIdentifierFnThatTakesFirstArgOfTypeByRandomValue = readFreeIdentifierFnThatTakesFirstArgOfTypeByRandomValue;
exports.readFreeIdentifierByName = readFreeIdentifierByName;
exports.readFreeIdentifierByFn = readFreeIdentifierByFn;
exports.readByRandomValue = readByRandomValue;
exports.readByAssociativeValue = readByAssociativeValue;
exports.readFreeIdentifierByTypeAndRandomValue = readFreeIdentifierByTypeAndRandomValue;
exports.readWordFrequency = readWordFrequency;
exports.readWordFrequencyAtLeast = readWordFrequencyAtLeast;
exports.readById = readById;
exports.readClassByNameAndModule = readClassByNameAndModule;
exports.readModuleByName = readModuleByName;
exports.readModuleByPath = readModuleByPath;
exports.readOrCreateWordFrequency = readOrCreateWordFrequency;
exports.readOrCreateAbstraction = readOrCreateAbstraction;
exports.readOrCreateApplication = readOrCreateApplication;
exports.readOrCreateFreeIdentifier = readOrCreateFreeIdentifier;
exports.readOrCreateFreeIdentifierFunction = readOrCreateFreeIdentifierFunction;
exports.readOrCreateSubstitution = readOrCreateSubstitution;
exports.readOrCreateClass = readOrCreateClass;
exports.readOrCreateModule = readOrCreateModule;
exports.update = update;