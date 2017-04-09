import resource from 'resource-router-middleware';
import { createSRT, randomFileName, audify, speech_to_text } from '../lib/util';
import fs from 'fs';
import path from 'path';


export default ({ config, db }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'subtitlify',

	/** POST / - Create a new translation */
	create({ body, files }, res) {
		if ( files && files.video ) {
            let fileName = randomFileName('');
            let videoName = `${__dirname}/../assets/${fileName}.mp4`;	
            let audioName = `${__dirname}/../assets/${fileName}.flac`;	
            let subtName = `${__dirname}/../assets/${fileName}.srt`;	
            let outName = `${__dirname}/../assets/${fileName}v2.mp4`;	
            let { data } = files.video;

            fs.writeFile(videoName, data, function(err) {
                if(err) {
                    res.json( {status: 'error', result: 'internal failure'});
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
                                res.json({status: 'error', result: 'Watson API error'})
                            }
                            else{
                                createSRT(subtName, transcript.results);
                                let cmd = `ffmpeg -i ${videoName} -vf subtitles=${subtName} -strict -2 ${outName}`;
                                var exec = require('child_process').exec;
                                exec(cmd, (error, stdout, stderr) => {
                                    if (error){
                                        res.json({status: 'error', result: 'Cant add subtitles to video'})
                                    }
                                    else {
                                        res.json({status: 'success', result: `http://104.131.85.110/assets/${outName}`});
                                    }
                                });
                            }
                        });
                    });
                    
                }
            }); 
        }
	}
});
