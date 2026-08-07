import { DropService } from '../drop.service';
import { MerchDrop } from '../../models/MerchDrop';
import { Purchase } from '../../models/Purchase';
import { User } from '../../models/User';

jest.mock('../../models/MerchDrop');
jest.mock('../../models/Purchase');
jest.mock('../../models/User');

describe('DropService', () => {
  let dropService: DropService;

  beforeEach(() => {
    dropService = new DropService();
    jest.clearAllMocks();
  });

  describe('createDrop', () => {
    it('should create a new merch drop successfully', async () => {
      const dto = {
        name: 'Travis Scott Jordan 1',
        price: 150,
        total_stock: 10,
        start_time: '2026-08-08T00:00:00.000Z'
      };

      const mockCreatedDrop = {
        id: 'drop-1',
        name: dto.name,
        price: dto.price,
        total_stock: dto.total_stock,
        available_stock: dto.total_stock,
        start_time: new Date(dto.start_time)
      };

      (MerchDrop.create as jest.Mock).mockResolvedValue(mockCreatedDrop);

      const result = await dropService.createDrop(dto);

      expect(MerchDrop.create).toHaveBeenCalledWith({
        name: dto.name,
        price: dto.price,
        total_stock: dto.total_stock,
        available_stock: dto.total_stock,
        start_time: expect.any(Date)
      });
      expect(result).toEqual(mockCreatedDrop);
    });
  });

  describe('getActiveDrops', () => {
    it('should return active drops with associated purchases', async () => {
      const mockDrops = [
        {
          id: 'drop-1',
          name: 'Travis Scott Jordan 1',
          price: 150,
          total_stock: 10,
          available_stock: 9,
          purchases: []
        }
      ];

      (MerchDrop.findAll as jest.Mock).mockResolvedValue(mockDrops);

      const result = await dropService.getActiveDrops();

      expect(MerchDrop.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: Purchase,
            as: 'purchases',
            limit: 3,
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
      expect(result).toEqual(mockDrops);
    });
  });
});
