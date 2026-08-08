require('dotenv').config();

const dbUri = process.env.DATABASE_URL || 'postgres://postgres:postgres_password@localhost:5432/sneaker_drop';

const useSsl = dbUri.includes('sslmode=require') || 
                process.env.NODE_ENV === 'production' || 
                !!process.env.VERCEL ||
                (!dbUri.includes('localhost') && !dbUri.includes('@db:'));

const config = {
  url: dbUri,
  dialect: 'postgres',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
  dialectOptions: useSsl ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
};

module.exports = {
  development: {
    ...config,
    logging: console.log
  },
  test: {
    ...config,
    logging: false
  },
  production: {
    ...config,
    logging: false
  }
};
