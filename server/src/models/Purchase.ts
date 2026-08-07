import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Purchase extends Model {
  declare public id: string;
  declare public user_id: string;
  declare public drop_id: string;
  declare public reservation_id: string;
  declare public amount_paid: number;
  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

Purchase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    drop_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'drop_id'
    },
    reservation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reservation_id'
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'amount_paid',
      get() {
        const rawValue = this.getDataValue('amount_paid');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
  },
  {
    sequelize,
    tableName: 'purchases',
    underscored: true,
    timestamps: true,
  }
);
