import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';

import { transcriptAudio, randomFileName } from './lib/util';
import axios from 'axios';

const Telegraf = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.telegram.setWebhook('https://3692b07f.ngrok.io/secret-path')

bot.startWebhook('/secret-path', null, 3030)

bot.on('voice', (ctx) => {
  const file_id = ctx.update.message.voice.file_id;
  axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${file_id}`)
  .then(res => {
    axios.get(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${res.data.result.file_path}`, {
      responseType: 'arraybuffer',
    })
    .then(res => {
      let outName = randomFileName();
      let filename = `${__dirname}/assets/${outName}`;
      console.log(res.data)
      transcriptAudio(res.data, filename, {
        json: ({ status, result }) => {
          if(status === 'success') {
            ctx.reply(result);
          } else {
            console.log(result);
          }
        }
      })
    })
    .catch(err => console.log(err))
  })
  .catch(err => console.log(err));
})

let app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(fileUpload());

app.use(bodyParser.json({
	limit : config.bodyLimit
}));

// connect to db
initializeDb( db => {

	// internal middleware
	app.use(middleware({ config, db }));

	// api router
	app.use('/api', api({ config, db }));

	app.server.listen(process.env.PORT || config.port);

	console.log(`Started on port ${app.server.address().port}`);
});

export default app;
