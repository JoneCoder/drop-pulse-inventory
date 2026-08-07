import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation Failed',
      errors: errors.array().map((err: any) => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .isEmail()
    .withMessage('Provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

export const createDropValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Product name must be between 3 and 100 characters'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive float greater than 0'),
  body('total_stock')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Total stock must be an integer between 1 and 100,000'),
  body('start_time')
    .isISO8601()
    .withMessage('Start time must be a valid ISO8601 date timestamp'),
  validateRequest
];

export const reserveItemValidation = [
  body('drop_id')
    .notEmpty()
    .withMessage('Drop ID is required')
    .isUUID(4)
    .withMessage('Drop ID must be a valid UUIDv4'),
  validateRequest
];

export const purchaseItemValidation = [
  body('reservation_id')
    .notEmpty()
    .withMessage('Reservation ID is required')
    .isUUID(4)
    .withMessage('Reservation ID must be a valid UUIDv4'),
  validateRequest
];
