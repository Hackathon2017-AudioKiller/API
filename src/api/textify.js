import resource from 'resource-router-middleware';
import { transcriptAudio, transcriptVideo, randomFileName } from '../lib/util';
import fs from 'fs';

export default ({ config, db }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'textify',

	/** POST / - Create a new translation */
	create({ body, files }, res) {
		if ( files && files.audio ) {
			let { name, data } = files.audio;
			let outName = `${__dirname}/../assets/${randomFileName()}`;			
			if (/.*.mp4/.exec(name)){
				let inName = `${__dirname}/../assets/${name}`;			
				fs.writeFile(inName, data, function(err) {
					if(err) {
						res.json( {status: 'error', result: 'internal failure'});
					}
					else {
						transcriptVideo(inName, outName, res);
					}
				}); 
			}
			else{
				transcriptAudio(data, outName, res);
			}			
		}
		else {
			res.json({error: 'No audio file given'})
		}


	},

});
