import { NotFoundException, BadRequestException } from '@nestjs/common';

export class BatchNotFoundException extends NotFoundException {
  constructor(message = 'Batch not found in the specified storage location') {
    super(message);
  }
}

export class InsufficientStockException extends BadRequestException {
  constructor(message = 'Insufficient available stock for this operation') {
    super(message);
  }
}

export class InvalidWarehouseException extends BadRequestException {
  constructor(message = 'Invalid warehouse or warehouse not active') {
    super(message);
  }
}

export class InvalidReservationException extends BadRequestException {
  constructor(message = 'Invalid reservation state or quantity') {
    super(message);
  }
}
