import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres_password@localhost:5432/sneaker_drop';

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
