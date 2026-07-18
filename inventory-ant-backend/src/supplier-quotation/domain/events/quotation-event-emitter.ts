import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class QuotationEventEmitter extends EventEmitter {}
