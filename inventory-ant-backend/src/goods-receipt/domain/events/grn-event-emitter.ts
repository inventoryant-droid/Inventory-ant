import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class GoodsReceiptEventEmitter extends EventEmitter {}
