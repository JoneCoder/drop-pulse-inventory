'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merch_drops', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_stock: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      available_stock: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Enforce check constraint check_available_stock_non_negative
    await queryInterface.sequelize.query(`
      ALTER TABLE "merch_drops" 
      ADD CONSTRAINT check_available_stock_non_negative 
      CHECK (available_stock >= 0);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('merch_drops');
  }
};
