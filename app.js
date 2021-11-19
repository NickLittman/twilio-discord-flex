require('dotenv').config({ debug: process.env.DEBUG });
// console.log(process.env.TWILIO_ACCOUNT_SID);
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL'] });
const { SessionsClient } = require('@google-cloud/dialogflow-cx');
const fetch = require('node-fetch');
const base64 = require('base-64');

const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ---------------------------------------------------------------------------------------------------------------------------
// Discord bot
// ---------------------------------------------------------------------------------------------------------------------------

let lookupTable = {};

const User = class {
  constructor(userId, userName, dialogFlowSessionId, channelSid) {
    this.userId = userId;
    this.userName = userName;
    this.dialogFlowSessionId = dialogFlowSessionId;
    this.channelSid = channelSid;
    this.liveAgent = false;
  }
};

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  const channel = await client.channels.fetch(process.env.SUPPORT_CHANNEL_ID);
  channel.send('I\'m alive!');
  console.log('Ready!');
});

client.on('messageCreate', async (message) => {
  const author = message.author;
  if (author.id == process.env.BOT_ID) {
    return;
  }
  if (lookupTable[author.id] == undefined) {
    const newUser = new User(author.id, author.username, undefined, undefined);
    lookupTable[author.id] = newUser;
  }
  if (message.channel.type == 'GUILD_TEXT' && message.content.toLowerCase().includes('help')) {
    const tempMsg = message;
    tempMsg.content = 'hello there';
    await detectIntentText(tempMsg);
  }
  else if (message.channel.type == 'DM') {
    if (message.content.toLowerCase().includes('agent')) {
      lookupTable[author.id].liveAgent = true;
      await detectIntentText(message);
    }
    if (lookupTable[author.id].liveAgent) {
      if (lookupTable[author.id].channelSid == undefined) {
        const chatChannelSid = await createNewChannel(author.id);
        lookupTable[author.id].channelSid = chatChannelSid;
        await sendChatMessage(chatChannelSid, author.id, message.content);
      }
       else {
        await sendChatMessage(lookupTable[author.id].channelSid, author.id, message.content);
      }
    }
    else {
      await detectIntentText(message);
    }

  }
});

client.login(process.env.DISCORD_TOKEN);
//  ---------------------------------------------------------------------------------------------------------------------------
// Google Dialogflow
//  ---------------------------------------------------------------------------------------------------------------------------
const goog = new SessionsClient({ apiEndpoint: 'us-east1-dialogflow.googleapis.com' });

async function detectIntentText(discordMessage) {
  const userId = discordMessage.author.id;
  const query = discordMessage.content;
  const languageCode = 'en';

  let sessionId;
  if (lookupTable[userId].dialogFlowSessionId != undefined) {
    sessionId = lookupTable[userId].dialogFlowSessionId;
  }
  else {
    sessionId = Math.random().toString(36).substring(7);
    lookupTable[userId].dialogFlowSessionId = sessionId;
  }

  const sessionPath = goog.projectLocationAgentSessionPath(
    process.env.GOOGLE_PROJECT_ID,
    process.env.GOOGLE_PROJECT_LOCATION,
    process.env.GOOGLE_AGENT_ID,
    sessionId,
  );
  console.info(sessionPath);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
      },
      languageCode,
    },
  };
  const [response] = await goog.detectIntent(request);
  for (const message of response.queryResult.responseMessages) {
    if (message.text) {
      discordMessage.author.send(`**${message.text.text}**`);
    }
  }
}
//  ----------------------------------------------------------------------------------------------------------------
// Twilio
//  ----------------------------------------------------------------------------------------------------------------

const createNewChannel = async (chatUserName) => {
  const twilioChannel = await twilioClient.flexApi.channel
    .create({
      flexFlowSid: process.env.TWILIO_FLEX_FLOW_ID,
      identity: chatUserName,
      chatUserFriendlyName: lookupTable[chatUserName].userName,
      chatFriendlyName: 'Flex Custom Chat',
      target: chatUserName,
    });
  lookupTable[chatUserName].channelSid = twilioChannel.sid;
  const onMessageSent = await twilioClient
    .chat
    .services(process.env.TWILIO_FLEX_CHAT_ID)
    .channels(twilioChannel.sid)
    .webhooks
    .create({
      type: 'webhook',
      'configuration.method': 'POST',
      'configuration.url': `${process.env.NGROK_URL}/new-message?channel=${twilioChannel.sid}&user=${chatUserName}`,
      'configuration.filters': ['onMessageSent'],
    });

  const onChannelUpdated = await twilioClient
    .chat
    .services(process.env.TWILIO_FLEX_CHAT_ID)
    .channels(twilioChannel.sid)
    .webhooks
    .create({
      type: 'webhook',
      'configuration.method': 'POST',
      'configuration.url': `${process.env.NGROK_URL}/channel-update?channel=${twilioChannel.sid}&user=${chatUserName}`,
      'configuration.filters': ['onChannelUpdated'],
    });
  return twilioChannel.sid;
};


const sendChatMessage = async (channelSid, userId, body) => {
  const params = new URLSearchParams();
  params.append('Body', body);
  params.append('From', userId);
  const response = await fetch(`https://chat.twilio.com/v2/Services/${process.env.TWILIO_FLEX_CHAT_ID}/Channels/${channelSid}/Messages`,
    {
      method: 'post',
      body: params,
      headers: {
        'X-Twilio-Webhook-Enabled': 'true',
        Authorization: `Basic ${base64.encode(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)}`,
      },
    });
  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    throw new Error(message);
  }
  const msgStatus = await response.text();
  return msgStatus;
};

const express = require('express');

const app = express();

app.use(express.urlencoded({ extended: false }));


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/new-message', async (req, res) => {
  if (req.body.Source == 'API') return;
  const recipientId = req.query.user;
  const recipient = await client.users.fetch(recipientId);
  recipient.send(`**${req.body.Body}**`);
});

app.post('/channel-update', async (req, res) => {
  const attributes = JSON.parse(req.body.Attributes);
  if (attributes.status == 'INACTIVE') {
    if (lookupTable[req.query.user].liveAgent) {
      const recipientId = req.query.user;
      const recipient = await client.users.fetch(recipientId);
      recipient.send('***Owl Gaming Agent has left the chat.***');

      lookupTable[recipientId].liveAgent = false;
      lookupTable[recipientId].dialogFlowSessionId = undefined;
      lookupTable[recipientId].channelSid = undefined;
    }
    else {
      await twilioClient.chat.services(process.env.TWILIO_FLEX_CHAT_ID)
                     .channels(req.query.channel).remove();
    }
}
});


app.listen(process.env.APP_PORT, () => {
  console.log(`Proxy app listening at http://localhost:${process.env.APP_PORT}`);
});
