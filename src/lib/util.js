import ffmpeg from 'fluent-ffmpeg';
import streamifier from 'streamifier';


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


export function toFlac(inBuffer, outName) {

	let inStream = streamifier.createReadStream(inBuffer);

	ffmpeg(inStream)
		.format('flac')
		.on('error', err => {
			console.log('error! marco estúpido: ' + err);
		})
		.on('end', () => console.log('ready'))
		.save(`${__dirname}/../assets/${outName}.flac`);
}
