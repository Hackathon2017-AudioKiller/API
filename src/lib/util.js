import ffmpeg from 'fluent-ffmpeg';
import streamifier from 'streamifier';
import uuid from 'uuid/v4';
import fs from 'fs';

import axios from 'axios';


/**	Creates a callback that proxies node callback style arguments to an Express Response object.
 *	@param {express.Response} res	Express HTTP Response
 *	@param {number} [status=200]	Status code to send on success
 *
 *	@example
 *		list(req, res) {
 *			collection.find({}, toRes(res));
 *		}
 */
export function toRes(res, status=200) {
	return (err, thing) => {
		if (err) return res.status(500).send(err);

		if (thing && typeof thing.toObject==='function') {
			thing = thing.toObject();
		}
		res.status(status).json(thing);
	};
}


export function transcriptText(inBuffer, outFilePath, onFinish) {

	let inStream = streamifier.createReadStream(inBuffer);


	let headers = { Authorization: 'Bearer ya29.El8nBAD7O3Elk-8yBNoIqsjkGgGG1LB1F3eZ-A5Fi7SgZ0OFYYOScL0H2OKtF4XmcAW6-KLIFd4j27YWUXFq1dgUr9mcc2EWiKIG70EVfbffKIVXdjtts4_B-MfcjaZ7tA'};

	ffmpeg(inStream)
		.format('flac')
		.on('error', err => {
			onFinish.json({
				status: 'error',
				result: 'Could not transform file to flac'
			})
		})
		.on('end', () => {
			let buffer = fs.readFileSync(outFilePath);
			let content = buffer.toString('base64');

			axios.post('https://speech.googleapis.com/v1beta1/speech:syncrecognize', {
						config: {
							encoding:"FLAC",
							languageCode:"es-ES"
						},
						audio: { content },
					},
					{ headers })
				.then( res =>  {
					onFinish.json({
						status: 'success',
						result: res.data.results[0].alternatives[0].transcript
					})
				})
				.catch( err =>
					onFinish.json({
						status: 'error',
						result: 'Google api error',
					}))
		})
		.save(outFilePath);
		axios.post()

}

// export function toTextPromise(filename) {

// 	let buffer = fs.readFileSync(filename);
// 	let content = buffer.toString('base64');
// 	let headers = { Authorization: 'Bearer ya29.El8nBOmxBy5BGi6o_FO1CC5BumV2a8OPkwih6oKjvF3rMVpIGdIttJRtf1AAxGWkulSwN60roEQPmOGRDFQoyHWrswixWh-g2iKKk0VWNaYU4HxTLpgEt9_w2mC9pLUS3w'};

// 	return axios.post('https://speech.googleapis.com/v1beta1/speech:syncrecognize', 
// 				{
// 					config: {
// 						encoding:"FLAC",
// 						languageCode:"es-ES"
// 					},
// 					audio: { content },
// 				}, 
// 				{ headers });
// }


export function randomFileName(){
	return uuid() + '.flac';
}
