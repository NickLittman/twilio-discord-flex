const express = require('express')
const app = express()
const port = 4000
require('dotenv').config()

const https = require('https')

const user_id =  '902273325076717588' // make this dynamic to the user id from discord
const SEGMENT_SPACEID = 'spa_ofNinuSHqE4Utte3hQmVpC';
const SEGMENT_PERSONA_TOKEN = 'lwHi7f19U-vuYClh4BYIYKdTBoCnMmcUqq0Lmet5LVd3Vxed37eCDQFKta-o-';
let url = `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACEID}/collections/users/profiles/${user_id}/traits`
let sentiment

const options = {
    hostname: 'profiles.segment.com',
    port: 443,
    path: '/v1/spaces/' + 'spa_ofNinuSHqE4Utte3hQmVpC' + '/collections/users/profiles/user_id:' + user_id + '/traits',
    method: 'GET',
    auth: 'vuYClh4BYIYKdTBoCnMmcUqq0Lmet5LVd3Vxed37eCDQFKta'
};

const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)
  
    res.on('data', d => {
      process.stdout.write(d)
      const data = JSON.parse(d)
      sentiment = data.last_sentiment_trait_recorded
      console.log(data.traits.last_sentiment_recorded)
      return sentiment
    })
  })
  
  req.on('error', error => {
    console.error(error)
  })
  
  req.end()

app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })