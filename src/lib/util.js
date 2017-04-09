import ffmpeg from 'fluent-ffmpeg';
import streamifier from 'streamifier';
import uuid from 'uuid/v4';
import google from 'googleapis';
import speech from '@google-cloud/speech';
import fs from 'fs';


var gcloud = require('google-cloud')({
  projectId: 'autos-163700',
  keyFilename: '../../key.json',
  credentials: require('../../key.json'),
});

var speechClient = speechClient = speech();

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

export function transcriptAudio(inBuffer, outFilePath, onFinish) {

	let inStream = streamifier.createReadStream(inBuffer);

	ffmpeg(inStream)
		.format('flac')
		.on('error', err => {
			onFinish.json({
				status: 'error',
				result: 'Could not transform file to flac'
			})
		})
		.on('end', () => {
			textify(outFilePath, onFinish)
		})
		.save(outFilePath);
}


export function transcriptVideo(inFilePath, outFilePath, onFinish) {
	var exec = require('child_process').exec;
	var cmd = `ffmpeg -i ${inFilePath} -ac 1 -ab 64000 -ar 16000 ${outFilePath}`;
	exec(cmd, () => textify(outFilePath, onFinish));
}



export function randomFileName(extension){
	return uuid() + extension;
}

function textify(outFilePath, onFinish){
	let config = {
				encoding: 'FLAC',
				languageCode: 'es-ES',
				verbose: true,
	};
	// speechClient.startRecognition(outFilePath, config)
	// 		.then((results) => {
	// 			return results[0].promise();
	// 		}).then((transcription) => {
	// 			console.log(transcription);
	// 			onFinish.json({
	// 				status: 'success',
	// 				result: transcription[0],
	// 			})
	// 		}).catch( (err) => {
	// 			onFinish.json({
	// 				status: 'error',
	// 				result: err,
	// 			})
	// 		});

	let spanish = speechClient.startRecognition(outFilePath, config)
		.then((results) => {
			return results[0].promise();
		});
	let english = speechClient.startRecognition(outFilePath, {
			encoding: 'FLAC',
			languageCode: 'en-US',
			verbose: true
		})
		.then((results) => {
			return results[0].promise();
		});

	Promise.all([spanish, english])
		.then( results => {
			let es = results[0][0][0];
			let en = results[1][0][0];
			onFinish.json({
				status: 'success',
				result: es.confidence > en.confidence ? es.transcript : en.transcript,
			})
		})
		.catch( err => {
			onFinish.json({
				status: 'error',
				result: err,
			});
		})
}

export function audify(videoPath, videoAudioPath) {
	var exec = require('child_process').exec;
	let videoPathAudio = videoPath + '.flac'; 
	let cmd = `ffmpeg -i ${videoPath} -ac 1 -ab 64000 -ar 16000 ${videoAudioPath}`;

	return new Promise( resolve => exec(cmd, resolve));
}


export function createSRT(filename, results){
	
	let outfile = fs.createWriteStream(filename);
	
	let currentSubtIdx = 0;
	let subtitles = [];

	for (let i=0; i < results.length; i++){

		let { alternatives } = results[i];
		let { timestamps, transcript } = alternatives[0];

		let startTime = timestamps[0][1];
		let endTime = timestamps[timestamps.length-1][2];

		subtitles.push(`${++currentSubtIdx}\n00:00:${startTime.toFixed(3)} --> 00:00:${endTime.toFixed(3)}\n${transcript}\n\n`);
	}
	outfile.write(subtitles.join('\n'));
	outfile.close();
}