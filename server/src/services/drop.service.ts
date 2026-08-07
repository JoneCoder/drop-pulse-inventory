import { MerchDrop } from '../models/MerchDrop';
import { Purchase } from '../models/Purchase';
import { User } from '../models/User';
import { CreateDropRequestDto } from '../dtos/drop.dto';

export class DropService {
  /**
   * Create a new sneaker drop
   */
  public async createDrop(dto: CreateDropRequestDto): Promise<MerchDrop> {
    const drop = await MerchDrop.create({
      name: dto.name,
      price: dto.price,
      total_stock: dto.total_stock,
      available_stock: dto.total_stock, // Initial available is total
      start_time: new Date(dto.start_time)
    });
    return drop;
  }

  /**
   * Fetch all drops, including recent purchases and buyer usernames
   */
  public async getActiveDrops(): Promise<MerchDrop[]> {
    return await MerchDrop.findAll({
      include: [
        {
          model: Purchase,
          as: 'purchases',
          limit: 5,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['username']
            }
          ]
        }
      ],
      order: [['start_time', 'ASC']]
    });
  }
}
