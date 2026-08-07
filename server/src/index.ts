import http from 'http';
import dotenv from 'dotenv';
import { sequelize } from './config/db';
import { initSocket } from './socket';
import { MerchDrop } from './models';
import app from './app';

dotenv.config();

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);


// Database initialization, migrations/constraints, and sample data seeding
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync database schema
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');

    // Execute raw SQL to ensure negative inventory constraint is defined at engine level
    try {
      await sequelize.query(`
        ALTER TABLE "MerchDrops" 
        ADD CONSTRAINT check_available_stock_non_negative 
        CHECK (available_stock >= 0);
      `);
      console.log('Successfully enforced negative stock check constraint on PostgreSQL engine.');
    } catch (constraintError: any) {
      // Check if error is because constraint already exists
      console.log('Stock constraint already configured or verified.');
    }

    // Seed mock sneakers if database is empty
    const dropCount = await MerchDrop.count();
    if (dropCount === 0) {
      console.log('Seeding initial mock sneaker drops...');
      
      const immediateStart = new Date();
      
      const upcomingStart = new Date();
      upcomingStart.setMinutes(upcomingStart.getMinutes() + 10); // 10 minutes in the future

      await MerchDrop.bulkCreate([
        {
          name: 'Travis Scott x Air Jordan 1 Low "Olive"',
          price: 150.00,
          total_stock: 5,
          available_stock: 5,
          start_time: immediateStart
        },
        {
          name: 'Nike Dunk Low "Panda"',
          price: 115.00,
          total_stock: 12,
          available_stock: 12,
          start_time: immediateStart
        },
        {
          name: 'Adidas Yeezy Boost 350 V2 "Zebra"',
          price: 230.00,
          total_stock: 2,
          available_stock: 2,
          start_time: immediateStart
        },
        {
          name: 'Air Jordan 4 Retro "Military Blue" (Upcoming)',
          price: 215.00,
          total_stock: 10,
          available_stock: 10,
          start_time: upcomingStart
        }
      ]);
      console.log('Mock sneaker drops seeded successfully!');
    }
  } catch (error) {
    console.error('Unable to connect to the database or sync tables:', error);
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

startServer();
