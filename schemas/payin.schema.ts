import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Event } from './event.schema';

export type PayinDocument = HydratedDocument<Payin>;

@Schema()
export class Payin {
  
  @Prop()
  txHash: string;

  @Prop()
  requestId: number;

  @Prop({type: [{ type: SchemaTypes.ObjectId, ref: 'Event' }]})
  events: Event[];

  @Prop()
  customerId: string;

  @Prop()
  amount: number;

  @Prop()
  fee_amount: number;

  @Prop()
  rolling_reserve_amount: number;

  @Prop()
  chargebackId: number;

  @Prop()
  created_at: Date;

  @Prop()
  processed_at: Date;

  @Prop()
  merchant: string;

  // Init, NotPaid, Paid, Expired, Chargebacked, Error, CriticalError
  @Prop()
  status: number;
}

export const PayinSchema = SchemaFactory.createForClass(Payin);

export enum PayinStatus {
  Init, NotPaid, Paid, Expired, Chargebacked, Error, CriticalError
}