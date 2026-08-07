import { User } from './User';
import { MerchDrop } from './MerchDrop';
import { Reservation } from './Reservation';
import { Purchase } from './Purchase';

// User Associations
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
User.hasMany(Purchase, { foreignKey: 'user_id', as: 'purchases' });

// MerchDrop Associations
MerchDrop.hasMany(Reservation, { foreignKey: 'drop_id', as: 'reservations' });
MerchDrop.hasMany(Purchase, { foreignKey: 'drop_id', as: 'purchases' });

// Reservation Associations
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Reservation.belongsTo(MerchDrop, { foreignKey: 'drop_id', as: 'drop' });
Reservation.hasOne(Purchase, { foreignKey: 'reservation_id', as: 'purchase' });

// Purchase Associations
Purchase.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Purchase.belongsTo(MerchDrop, { foreignKey: 'drop_id', as: 'drop' });
Purchase.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

export {
  User,
  MerchDrop,
  Reservation,
  Purchase
};
