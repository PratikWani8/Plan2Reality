import { app } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/environment.js';

async function startServer() {
  await connectDB();

  const port = parseInt(ENV.PORT, 10) || 5000;
  app.listen(port, () => {
    console.log(`Plan2Reality Backend Server listening on http://localhost:${port}`);
    console.log(`Environment: ${ENV.NODE_ENV}`);
  });
}

startServer();
