import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class PurchaseOrderEventEmitter extends EventEmitter {}
