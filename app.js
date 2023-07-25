import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import * as generate from './generate.js';
import { setTimeout } from 'timers/promises';
import { Client, Events, GatewayIntentBits, WebhookClient} from 'discord.js';



  
  function filter(item) {
    var i = 0;
  
    return function(key, value) {
      if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
        return '[Circular]'; 
  
      if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
        return '[Unknown]';
  
      ++i; // so we know we aren't using the original object anymore
  
      return value;  
    }
  }
  
  function stringify(item, censor, space) {
    return JSON.stringify(item, censor ? censor : filter(item), space)
  }
  




  
// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.DISCORD_BOT_PORT || 7777;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;


    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      // "test" command
      if (name === 'test') {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: 'hello world ' + getRandomEmoji(),
          },
        });
      }

      // "test" command
      if (name === 'talk') {


        var deferMessage={
                  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                  data: {content:"..."}
              };

        var deferredResponse = await res.send(deferMessage);

        console.log("deferredResponse:"+stringify(deferredResponse));
        console.log("deferredResponse.req:"+stringify(req));

        const appId = process.env.APP_ID;
        const token = process.env.DISCORD_TOKEN;
        console.log("id:"+stringify(id));
        console.log("req.body.token:"+stringify(req.body.token));
        console.log("appId:"+stringify(appId));
        console.log("token:"+stringify(token));


        
        const generated = await generate.generateChatResponse();

        // Send a message into the channel where command was triggered from
        // const talkMessage = {
        //       content: getRandomEmoji() + generated,
        // };
        // const finalResponse = await fetch(`https://discordapp.com/api/webhooks/${id}/${req.body.token}  `, { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": 'application/json' }, body:  talkMessage })
        // .then((response) => response.text())
        // .then((body) => {
        //     console.log(body);
        // }); 
        
      const webhookClient = new WebhookClient({
          id: appId,
          token: req.body.token,
      });

      const finalResponse = webhookClient.send(getRandomEmoji() + generated).catch(console.error);


      return deferredResponse;

      }
    }
});


app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
