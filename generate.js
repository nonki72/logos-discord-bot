const DataLib = require('./src/datalib.cjs');
const FunctionParser = require('./src/functionparser.cjs');
const Grammar = require('./src/grammar.cjs');
const  {TwitterApi} =  require('twitter-api-v2');
const twitterConfig = require('./keys/twitter.json');
const { Configuration, OpenAIApi } = require("openai");

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function generateChatResponse() {
    // get tweet code from database (not hard coded i/o here, rely on sensei)
    async function getFreeIdentifierByName (name) {
        return new Promise((resolve, reject) => {
            DataLib.readFreeIdentifierByName(name, (freeIdentifier) => {
                if (freeIdentifier == null) {
                    return reject("couldn't retrieve "+name+" from database");
                }
                return resolve(freeIdentifier);
            });
        });
    }

    // use above code to read from database and convert to DAO objects
    const tweetFreeIdentifier = await getFreeIdentifierByName("twitterTweet")
        .catch((reason) => {console.error(reason); return null;});
    if (tweetFreeIdentifier == null) {
        return setTimeout(interact, 0);
    }
const storedTweetFunction = FunctionParser.loadStoredFunction(tweetFreeIdentifier);

    const generatedSentenceTree = await Grammar.generateSentence();
    const generatedSentence = Grammar.treeToString(generatedSentenceTree);
    console.log("generated sentence tree: " + generatedSentenceTree);


    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          "role": "system",
          "content": "You will be provided with statements, and your task is to convert them to standard English."
        },
        {
          "role": "user",
          "content": generatedSentence
        }
      ],
      temperature: 0,
      max_tokens: 256,
    });


    var chatResponse = generatedSentence + " :: " + response.data.choices[0].text;
    console.log("generated chat response: " + chatResponse);

    console.log(JSON.stringify(response.data.choices));

    return chatResponse;

}

exports.generateChatResponse = generateChatResponse;
