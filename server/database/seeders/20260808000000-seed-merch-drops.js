'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const immediateStart = new Date();
    const upcomingStart = new Date();
    upcomingStart.setMinutes(upcomingStart.getMinutes() + 10); // 10 minutes in the future

    await queryInterface.bulkInsert('merch_drops', [
      {
        id: uuidv4(),
        name: 'Travis Scott x Air Jordan 1 Low "Olive"',
        price: 150.00,
        total_stock: 5,
        available_stock: 5,
        start_time: immediateStart,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Nike Dunk Low "Panda"',
        price: 115.00,
        total_stock: 12,
        available_stock: 12,
        start_time: immediateStart,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Adidas Yeezy Boost 350 V2 "Zebra"',
        price: 230.00,
        total_stock: 2,
        available_stock: 2,
        start_time: immediateStart,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Air Jordan 4 Retro "Military Blue" (Upcoming)',
        price: 215.00,
        total_stock: 10,
        available_stock: 10,
        start_time: upcomingStart,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('merch_drops', null, {});
  }
};
