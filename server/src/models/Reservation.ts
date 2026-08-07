import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export class Reservation extends Model {
  declare public id: string;
  declare public user_id: string;
  declare public drop_id: string;
  declare public status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  declare public expires_at: Date;
  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

Reservation.init(
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
    status: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED', 'EXPIRED'),
      defaultValue: 'PENDING',
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
  },
  {
    sequelize,
    tableName: 'reservations',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['status', 'expires_at'],
        name: 'idx_reservations_status_expires'
      },
    ],
  }
);
