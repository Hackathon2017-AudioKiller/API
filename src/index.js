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

import { transcriptAudio, randomFileName, speech_to_text, createSRT } from './lib/util';
import axios from 'axios';
import fs from 'fs';

import path from 'path';

import { audify } from './lib/util';
import { Markup, Extra } from 'telegraf';
const Telegraf = require('telegraf')


const bot = new Telegraf(process.env.BOT_TOKEN)
const telegram = new Telegraf.Telegram(process.env.BOT_TOKEN);

bot.telegram.setWebhook(process.env.WEBHOOK + '/secret-path')

bot.startWebhook('/secret-path', null, 3030)

bot.on('voice', (ctx) => {
  const file_id = ctx.update.message.voice.file_id;
  axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${file_id}`)
  .then(res => {
    axios.get(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${res.data.result.file_path}`, {
      responseType: 'arraybuffer',
    })
    .then(res => {
      let outName = randomFileName('.flac');
      let filename = `${__dirname}/assets/${outName}`;
      transcriptAudio(res.data, filename, {
        json: ({ status, result }) => {
          if(status === 'success') {
            ctx.reply(`${ctx.update.message.from.username}: ${result}`);
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

bot.on('video', (ctx) => {
  const file_id = ctx.update.message.video.file_id;
  const chat_id = ctx.update.message.chat.id;
  axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${file_id}`)
  .then(res => {
    axios.get(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${res.data.result.file_path}`, {
      responseType: 'arraybuffer',
    })
    .then(res => {
      let fileName = randomFileName('');
      let videoName = `${__dirname}/assets/${fileName}.mp4`;	
      let audioName = `${__dirname}/assets/${fileName}.flac`;	
      let subtName = `${__dirname}/assets/${fileName}.srt`;	
      let outName = `${__dirname}/assets/${fileName}v2.mp4`;	

      fs.writeFile(videoName, res.data, function(err) {
          if(err) {
              // res.json( {status: 'error', result: 'internal failure'});
              console.log('internal error');
          }
          else {
              audify(videoName, audioName).then(() => {
                  var params = {
                      model: 'en-US_NarrowbandModel',
                      speaker_labels: true,
                      content_type: 'audio/flac',
                      audio: fs.createReadStream(audioName),
                  };
                  speech_to_text.recognize(params, function(error, transcript) {
                      if (error){
                          // res.json({status: 'error', result: 'Watson API error'})
                          console.log('Watson API error');
                      }
                      else{
                          createSRT(subtName, transcript.results);
                          let cmd = `ffmpeg -i ${videoName} -vf subtitles=${subtName} -strict -2 ${outName}`;
                          var exec = require('child_process').exec;
                          exec(cmd, (error, stdout, stderr) => {
                              if (error){
                                  // res.json({status: 'error', result: 'Cant add subtitles to video'})
                                  ctx.reply('Cant add subtitles to video');
                              }
                              else {
                                  telegram.sendVideo(chat_id, 
                                  {
                                    source: fs.createReadStream(path.resolve(outName))
                                  },
                                  {
                                      reply_to_message_id: ctx.update.message.id,
                                      caption: 'Subtitled version'
                                  });
                              }
                          });
                      }
                  });
              });
              
          }
      }); 





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
