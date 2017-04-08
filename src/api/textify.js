import resource from 'resource-router-middleware';
import { toFlac, toRes } from '../lib/util';

export default ({ config, db }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'textify',

	/** POST / - Create a new translation */
	create({ body, files }, res) {
		if ( files && files.audio ) {
			let { name, data } = files.audio;
			let outName = /(\w+)\.\w+/.exec(name)[1];
			toFlac(data, outName);
			res.json({content: `File transformed and saved as '${outName}'`});
			return;
		}
		else {
			res.json({error: 'No audio file given'})
		}
	},

});
