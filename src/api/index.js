import { version } from '../../package.json';
import { Router } from 'express';
import textify from './textify';
import subtitlify from './subtitlify';

export default ({ config, db }) => {
	let api = Router();

	// mount the facets resource
	api.use('/textify', textify({ config, db }));
	api.use('/subtitlify', subtitlify({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	return api;
}
