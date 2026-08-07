require('dotenv').config();

const dbUri = process.env.DATABASE_URL || 'postgres://postgres:postgres_password@localhost:5432/sneaker_drop';

const config = {
  url: dbUri,
  dialect: 'postgres',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData'
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
