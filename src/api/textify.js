import resource from 'resource-router-middleware';
import { transcriptText, randomFileName } from '../lib/util';

export default ({ config, db }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'textify',

	/** POST / - Create a new translation */
	create({ body, files }, res) {
		if ( files && files.audio ) {
			let { data } = files.audio;
			let outName = randomFileName();
			let filename = `${__dirname}/../assets/${outName}`;
			transcriptText(data, filename, res);
			
		}
		else {
			res.json({error: 'No audio file given'})
		}


	},

});
