# Twilio Flex for Discord

### **Team Members**:
@nlittman
@hhargreaves
@nhuynh
@sbapat

---

## Project Overview

Discord is one of the fastest growing communications platforms ever. With over 10x growth since 2017 to over 100 million daily active users, there is no denying the appeal of discord as a channel for enterprises to consider when they want to engage with younger demographics.

To demonstrate the art of the possible to enterprises, we built a demo that seamlessly integrates systems they already have like Salesforce, Twilio, and Segment to new ones like Discord. This demo shows how to set up a Support channel and bot in Discord so users and customers can ask questions. In the support channel, users' sentiment is calculated using IBM's Watson and recorded in Segment so when they eventually reach an agent via the support bot, the agent can be apprised of how to work with the customer. Agents get connected to users in the Discord chat via custom web chat plugin in Flex. Additionally within the agent's Flex UI, they will have a Salesforce connection to see more information about the user including their most recent sentiment recorded in the Discord support channel.

Since there are keys across multiple 3rd party tools, below in the Setup Instructions, you will see a `.env` overview with links to where to find them. Additionally, the instructions are broken out by app and will describe where to find them as well.

## Setup Instructions

### Installation

#### Tools and Accounts required
- Discord account -- [Free sign up here](https://discord.com/)
- IBM account with Watson Tone Analyzer -- [Free sign up here](https://cloud.ibm.com/registration?target=/catalog/services/tone-analyzer%3FhideTours%3Dtrue%26%3Fcm_sp%3DWatsonPlatform-WatsonPlatform-_-OnPageNavCTA-IBMWatson_ToneAnalyzer-_-Watson_Developer_Website)
- Salesforce account -- [Free Sign up here](https://developer.salesforce.com/signup)
- Dialogue Flow account -- [Sign up here](https://cloud.google.com/dialogflow)
- Segment with access to Personas -- [Sign up here](https://segment.com/)
- Twilio account
- Node v17
- ngrok

#### Setting up Discord
1. Create a Discord login if you don't already have one on their site [here](https://discord.com/)
2. Log in to your Discord account, and create a new server by clicking the green plus icon on the left tool bar, select `Create My Own`, and give your Server a name. See Discord's [documentation](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server-) for more details.
3. Create a new text channel by selecting the '+' icon next to `Text Channels` on the left hand side, and name it `Support`. For more details see Discord's [documentation](https://support.discord.com/hc/en-us/articles/206143877-How-do-I-set-up-a-Role-Exclusive-channel-#:~:text=Text%20Channel%3A,Finally%2C%20click%20create.).
4. Follow Discord.JS's documentation on how to set up a bot in your Discord UI and retrieve your bot key. Copy and paste this key as the value for the `DISCORD_KEY` variable in your `.env` file.
5. Your bot is already programmed to respond to `help` if typed in your #support channel, test it out by sending `help` and make sure you get a dm from the Help Bot.

#### Setting up Segment
1. Login into your Segment account, navigate to `Connections`, and create a new Node source. More detailed instructions can be found on Segment's site [here](https://segment.com/docs/connections/sources/catalog/libraries/server/node/quickstart/).
2. Get your source write key and save this for your `.env` file; this will be used for the `SEGMENT_KEY` variable. More detailed instructions can be found on Segment's site [here](https://segment.com/docs/connections/find-writekey/).
3. In your Segment account, navigate to `Personas > Settings > Sources` and add your newly made node source.
4. Then navigate to `API Access` in the `Personas > Settings` section, generate a token, and save that. That will be used for the `SEGMENT_PERSONA_TOKEN` variable in your `.env` file. Additionally, copy the `Space ID` that is above your token and save that to use for the `SEGMENT_SPACEID` variable in your `.env` file as well.
5. Once the Sentiment Analysis Server is done, we will come back to Segment to set up the trait.

#### Setting up IBM Watson Tone Analyzer
1. Sign up and login to your IVM developer account.
2. Use the instructions on IBM's site ([see here](https://cloud.ibm.com/docs/tone-analyzer?topic=tone-analyzer-gettingStarted)) to navigate to the Tone Analyzer service and get the relevant token and URL. Save both, the token will be used for `WATSON_KEY` variable and the URL will be used for the `IBM_TONE_ANALYZER_URL` in the `.env` file.

#### Setting up Sentiment Analysis Server (*come back to this section once your server is running*)
1. Now navigate to your Discord #support channel and type in something while the server is running. You should see your text broken up into sentences and analyzed. The strongest sentiment is what is being recorded to Segment.
2. Navigate to Segment, and you should see your user from the Discord chat and their `Contacted Discord Support` event where the event property `sentiment` is the strongest sentence sentiment that Tone Analyzer recorded in the debugger of your Node source. 
3. In Segment, navigate to `Personas > Computed Traits` and click `Create new trait`. Select `Last` from the list, and click `configure`. In your trait builder select the event name `Contacted Discord Support` and under select `Sentiment` for the event property. This creates a trait that shows the last sentiment recorded for this user. Now you will be able to fetch the traits for this user based on their discord id from the Segment profile API which we will use later.


#### Setting up Salesforce
1. Login
2. Set up dashboard
3. plug in `segment-fetch.js`

#### Setting up Dialogflow
1. Set up Dialogflow by following Google's guide [here](https://cloud.google.com/dialogflow/es/docs/quick/setup). Throughout this set up you will get the values for the following variables in your `.env` file. See below:
`GOOGLE_PROJECT_ID=
GOOGLE_PROJECT_LOCATION=
GOOGLE_AGENT_ID=
GOOGLE_LANGUAGE_CODE=`

#### Setting up Twilio

##### Flex Project Set Up
1. Set up a new Flex project, see instructions [here](https://www.twilio.com/docs/flex/tutorials/setup) in Twilio's documentation.
2. Copy and paste the Account SID in your `.env` file as the `TWILIO_ACCOUNT_SID`, and do the same for the Auth Token and the `TWILIO_AUTH_TOKEN` variable.
3. Navigate to your Twilio Studio Dashboard and click on the "plus" icon to add a new flow.
4. [Create a new Studio Flow](https://www.twilio.com/blog/add-custom-chat-channel-twilio-flex)
    1. Give a name to the new Flow, e.g., Custom Webchat Flow
    2. In the template selection pop-up, select "Start from Scratch". Look at the other templates, in case you want your webchat to go to some additional steps before being assigned to a Flex Agent.
    3. Once the Studio Flow editor opens, look for the "Send To Flex" Widget, and drop it on the canvas
    4. Connect the "Incoming message" trigger to "Send To Flex" widget
    5. Select the "Send to Flex Widget" and choose the following values:
        - Workflow: "Assign to Anyone"
        - Channel: "Programmable Chat"
        - Attributes: Paste the following: {"name": "{{trigger.message.ChannelAttributes.from}}", "channelType": "web", "channelSid": "{{trigger.message.ChannelSid}}"}
    6. Click on "Save"
    7. Click on "Publish" to publish the Flow
5. [Create a new Flex Flow](https://www.twilio.com/blog/add-custom-chat-channel-twilio-flex)
    ```sh 
    twilio api:flex:v1:flex-flows:create \
    --friendly-name="Custom Webchat Flex Flow" \
    --channel-type=custom \
    --integration.channel=studio \
    --chat-service-sid=<Flex Chat Service SID> \
    --integration.flow-sid=<Flex Studio Flow SID> \
    --contact-identity=custom \
    --enabled
    ```
##### Flex Plugin Setup   
1. Review Twilio's [documentation](https://www.twilio.com/docs/flex/quickstart/getting-started-plugin) to set up a Flex Plugin from the Command line within your current Flex Project. Start with the first steps of initializing the plugin, and review the steps below when asked for Plugin names or code.
2. Give it the name of `salesforce-plugin` when prompted for a name instead of `plugin-sample`.
3. Add the Flex Plugin code from `./flex/plugin-sample/src/SamplePlugin.js` to your code editor for your new Flex plugin when prompted by Twilio's quickstart guide.
4. Replace the iframe URL with your Salesforce dashboard URL on [`line 28`](https://code.hq.twilio.com/salesengineering/twilio-discord-flex/blob/529e80966d67993916c6c04187bf959d820bc060/flex/plugin-sample/src/SamplePlugin.js#L28).
5. Finish Twilio's Plugin Quickstart guide and deploy the plugin to your Flex instance. Once it is available in your Flex Plugin dashboard, make sure it is visible from your agent view.


##### Salesforce Project Set Up
1. Sign up for a new Salesforce Instance, see instructions [here](https://www.developer.salesforce.com) in Salesforce's documentation.
2. Install Salesforce CLI commandline, see intructions [here](https://developer.salesforce.com/tools/sfdxcli)
3. Install SalesforceDX in VS Studio, walkthrough [here](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components/set-up-visual-studio-code)
4. Deploy the sfdx package in the salesforce folder to your salesforce instance 
5. Grab your Salesforce myDomain url, and paste it into the Flex Salesforce instance variable. It should be https://<your-my-domain>.salesforce.com.


## Usage
1. Open new terminal
2. Choose a port, if you can't think of any, use 10123
3. Run _ngrok http 10123_ _or use the port of your choosing._
4. Copy the https url generated by the ngrok command
5. Navigate to the project directory
6. Open the .env file and set NGROK_URL=10123 _or use the port of your choosing_ 
7. Save the .env file
8. In the project directory, type the command _npm start_
9. Type any variation of 'help' in the #support channel
10. Type 'agent' in the DM from the bot to initate a Flex conversation
11. :D 

