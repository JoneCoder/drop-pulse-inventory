import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class MerchDrop extends Model {
  declare public id: string;
  declare public name: string;
  declare public price: number;
  declare public total_stock: number;
  declare public available_stock: number;
  declare public start_time: Date;
  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

MerchDrop.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('price');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    total_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_stock'
    },
    available_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'available_stock',
      validate: {
        min: 0,
      },
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_time'
    },
  },
  {
    sequelize,
    tableName: 'merch_drops',
    underscored: true,
    timestamps: true,
  }
);
