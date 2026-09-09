import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT || 5000;
connectDB().then(() => {
	const server = app.listen(port, () => console.log(`VSMS API running on http://localhost:${port}`));
	server.on('error', (error) => {
		if (error.code === 'EADDRINUSE') {
			console.error(`Port ${port} is already in use. Stop the existing backend or change PORT in backend/.env.`);
			process.exit(1);
		}
		throw error;
	});
}).catch((error) => { console.error(error.message); process.exit(1); });
