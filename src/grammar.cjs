const {resolve} = require('path');
const basicFilePath = resolve('../logos-ai/yaml/basic.yaml');
const phrasesFilePath = resolve('../logos-ai/yaml/phrases.yaml');
const wordsFilePath = resolve('../logos-ai/yaml/words.yaml');
const grammarFilePath = resolve('../logos-ai/yaml/grammar.yaml');
const determinersFilePath = resolve('../logos-ai/text/determiners.txt');
const pronounsFilePath = resolve('../logos-ai/text/pronouns.txt');
const prepositionsFilePath = resolve('../logos-ai/text/prepositions.txt');
const complementizersFilePath = resolve('../logos-ai/text/complementizers.txt');
const DataLib = require('./datalib');

var Promise = require("bluebird");
const fs = require('fs');
const yaml = require('js-yaml');
const {reject} = require("async/index");
const {basic} = require("needle/lib/auth");
const grammarTree = loadYamlFileTree(grammarFilePath);
const basicDictionary= loadYamlFileTree(basicFilePath);
const phrasesDictionary= loadYamlFileTree(phrasesFilePath);
const wordsDictionary= loadYamlFileTree(wordsFilePath);
const wordsListDictionary = {};

wordsListDictionary['Determiner'] = loadTextFileList(determinersFilePath);
wordsListDictionary['Pronoun'] = loadTextFileList(pronounsFilePath);
wordsListDictionary['Preposition'] = loadTextFileList(prepositionsFilePath);
wordsListDictionary['Complementizer'] = loadTextFileList(complementizersFilePath);

function loadYamlFileTree(filePath) {
    try {
        let fileContents = fs.readFileSync(filePath, 'utf8');
        let data = yaml.load(fileContents);
        return data;
    } catch (e) {
        console.log(e);
        throw 'could not load grammar yaml: ' + e;
    }
}

function loadTextFileList(filePath) {
    const readFileLines = filename =>
        fs.readFileSync(filename)
            .toString('UTF8')
            .split('\n');

    const textFileLines = readFileLines(filePath);
    return textFileLines;
}

// GENERATE FUCTIONS

// look up in the frequency database first
// check the diary (wordnet) for that word
// make sure its the expected type (POS, part of speech)
// if its not recusively call until one is found...
// TODO: MERGE THESE DATABASES FIRST (IN SENSEI) [done]
async function generateBasicPOS(pos) {
    const promise = new Promise(async function (resolve, reject) {
        try {
            const randomMinimumFrequency = Math.random()/100.0;
            DataLib.readWordFrequencyAtLeast(randomMinimumFrequency, async (wordByFreqencyObj) => {
                if (wordByFreqencyObj == null) {
                    return reject("No word by frequency found! frequency >= '" + randomMinimumFrequency + "'");
                }
                const wordByFreqency = wordByFreqencyObj.word;
//                const randomPOS = await DataLib.readFreeIdentifierValueByRandomValue('object', 'Grammar', pos);
                DataLib.readFreeIdentifierByFn('"'+wordByFreqency+'"', async (randomPOS) => {
                    var word;
                    if (randomPOS == null) {
                        console.log("No wordnet entry found! word: '" + wordByFreqency + "', pos: '" + pos + "'");
                        word = await generateBasicPOS(pos);
//                        return reject("No wordnet entry found! word: '" + wordByFreqency + "', pos: '" + pos + "'");
                    } else if (randomPOS.fnclas !== pos) {
                        console.log("Wordnet entry is not the right part of speech! word: '" + wordByFreqency + "', pos: '" + pos + "'");
                        word = await generateBasicPOS(pos);
                    } else {
                        word = randomPOS.fn.replace(/^\"/, '').replace(/\"$/, '');
                    }
                    return resolve(word);
                });
            });
        } catch (error) {
            return reject(error);
        }
    }).catch((error) => {console.error(error)});
    return promise;
}

async function generatePOSTypeTree(POSTypeDefinitionList) {
    const generatedPOSTree = [];
    // iterate through the POS form type definition list for a random type of desired POS
    for (const POSTypeDefinitionAbbreviationIndex in POSTypeDefinitionList) {
        const POSTypeDefinitionAbbreviation = POSTypeDefinitionList[POSTypeDefinitionAbbreviationIndex];
        if (POSTypeDefinitionAbbreviation in basicDictionary) {
            // see basic.yaml
            const basicPOSType = basicDictionary[POSTypeDefinitionAbbreviation];
            try {
                const generatedPOS = await generateBasicPOS(basicPOSType);
                console.log("generated part of speech:"+JSON.stringify(generatedPOS));
                if (generatedPOSTree.length > 0) generatedPOSTree.push(" ");
                generatedPOSTree.push(generatedPOS);
            } catch (error) {
                console.error(error);
                if (generatedPOSTree.length > 0) generatedPOSTree.push(" ");
                generatedPOSTree.push('(' + basicPOSType + ')');
            }
        } else if (POSTypeDefinitionAbbreviation in phrasesDictionary) {
            // see phrases.yaml
            const generatedPOSTreeTemp = await generatePOSTree(POSTypeDefinitionAbbreviation);
            if (generatedPOSTree.length > 0) generatedPOSTree.push(" ");
            generatedPOSTree.push(generatedPOSTreeTemp);
        } else {
            // see words.yaml
            const textPOSType = wordsDictionary[POSTypeDefinitionAbbreviation];
            const textPOSList = wordsListDictionary[textPOSType];
            if (textPOSList == null || textPOSList.length == 0) {
                debugger;
            }
            const randomIndex = getRandomInt(0, textPOSList.length);
            const generatedPOS = textPOSList[randomIndex];
            if (generatedPOSTree.length > 0) generatedPOSTree.push(" ");
            generatedPOSTree.push(generatedPOS);
        }
    }
    return generatedPOSTree;
}

async function generatePOSTree(POSAbbreviation) {
    const POSTypeList = grammarTree[POSAbbreviation];
    const randomIndex = getRandomInt(0,POSTypeList.length - 1);
    const POSTypeDefinitionList = POSTypeList[randomIndex];
    const generatedPOSTree = await generatePOSTypeTree(POSTypeDefinitionList);
    return generatedPOSTree;
}

async function generatePOS(POSAbbreviation) {
    const generatedPOSTree = await generatePOSTree(POSAbbreviation);
    console.log(JSON.stringify(generatedPOSTree));
    if (generatedPOSTree === undefined) {
        console.error("Couldn't generate a: " + POSAbbreviation);
    }
    const generatedPOS = treeToString(generatedPOSTree);
    return generatedPOS;
}

async function generateSentence() {
    const generatedSentence = await generatePOS('S');
    return generatedSentence;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const treeToString = (tree) => {
    if (!tree) return "(?)";
    if (typeof tree == 'string') return tree;
    if (!Array.isArray(tree)) return "(" + typeof tree + ")";
    var string = '';
    for (const element of tree.values()) {
        if (Array.isArray(element)) {
            string = string + treeToString(element);
        } else if ((typeof element === 'string')) {
            string = string + element;
        } else {
            // element is not string or array (ie, tree)
            string = string + "(?)";
        }
    }
    return string;
}



module.exports = {
    loadYamlFileTree: loadYamlFileTree,
    loadTextFileList: loadTextFileList,
    generateBasicPOS: generateBasicPOS,
    generatePOSTypeTree: generatePOSTypeTree,
    generatePOSTree: generatePOSTree,
    generatePOS: generatePOS,
    generateSentence: generateSentence,
    getRandomInt: getRandomInt,
    treeToString: treeToString
}
