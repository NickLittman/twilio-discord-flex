require('dotenv').config();
const _ = require('lodash');
const Analytics = require('analytics-node');
const analytics = new Analytics(process.env.SEGMENT_KEY);

// ////////////////////////
// //// User Profile //////
// ////////////////////////
let discord_id;
let discord_handle;


// ////////////////////////
// Watson Tone Analyzer //
// ////////////////////////

const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const toneAnalyzer = new ToneAnalyzerV3({
  version: '2021-10-24',
  authenticator: new IamAuthenticator({
    apikey: process.env.WATSON_KEY,
  }),
  serviceUrl: process.env.IBM_TONE_ANALYZER_URL,
});


// ////////////////////////
// /////// Disord /////////
// ////////////////////////

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL']
});

let text;

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

    client.on('messageCreate', async function(message) {
        discord_id = message.author.id;
        if (discord_id == process.env.BOT_ID) {
          console.log('NO BOTS ALLOWED');
          return;
        }
        discord_handle = message.author.username;
        text = message.content;
        console.log('this is the text', text);


        const toneParams = {
            toneInput: { 'text': text },
            contentType: 'application/json',
        };
          let sentiment_result;

          const get_sentiment_result = async () => toneAnalyzer.tone(toneParams)
            .then(toneAnalysis => {
              const tonesArr = toneAnalysis.result.document_tone.tones;
              console.log('tones analysis', toneAnalysis.result);
              if (tonesArr.length < 1) {
                  sentiment_result = 'No strong sentiment detected';
                  console.log(sentiment_result);
              }
              else if (tonesArr.length > 0) {
                const sentiment = _.orderBy(tonesArr, 'score', ['desc']) || [ { 'tone_name': 'no strong sentiment detected', 'score': 0.0 }];
                sentiment_result = sentiment[0].tone_name;
                console.log(sentiment, sentiment_result);
              }

              return sentiment_result;
            })
            .catch(err => {
              console.log('error:', err);
            });

            // ////////////////////////
            // /// Start Segment //////
            // ////////////////////////

            async function identify_segment() {

                analytics.identify({
                    userId: discord_id,
                    traits: {
                      discord_handle: discord_handle,
                    },
                });
            }

            async function track_segment_event() {
                const result = await get_sentiment_result();
                analytics.track({
                    userId: discord_id,
                    event: 'Contacted Discord Support',
                    properties: {
                      sentiment: result || 'no sentiment recorded',
                    },
                });
                console.log('this is the sentiment', result);
            }

            // ////////////////////////
            // //// End Segment ///////
            // ////////////////////////

            identify_segment();
            track_segment_event();

        return message;
    });

// Login to Discord with your client's token
client.login(process.env.DISCORD_KEY);