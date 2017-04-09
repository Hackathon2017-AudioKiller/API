import { version } from '../../package.json';
import { Router } from 'express';
import textify from '../api/textify';

export default ({ config, db }) => {
  let telegram = Router();

  // mount the facets resource
  telegram.use('/textify', textify({ config, db }));

  // perhaps expose some telegram metadata at the root
  telegram.get('/', (req, res) => {
    res.json({ version });
  });

  return telegram;
}
