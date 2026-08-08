import http from 'http';
import dotenv from 'dotenv';
import { sequelize } from './config/db';
import { initSocket } from './socket';
import app from './app';

dotenv.config();

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Database connection verification
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initializeDatabase();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
  });
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
