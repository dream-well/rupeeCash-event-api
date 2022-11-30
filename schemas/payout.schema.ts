import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Event } from './event.schema';

export type PayoutDocument = HydratedDocument<Payout>;

@Schema()
export class Payout {
  
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
  accountInfo: string;

  @Prop()
  infoHash: string;

  @Prop()
  remark: string;

  @Prop()
  created_at: Date;

  @Prop()
  processed_at: Date;

  @Prop()
  merchant: string;

  // Init, NotPaid, Locked, Paid, Error, CriticalError
  @Prop()
  status: number;

}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

export enum PayoutStatus {
  Init, NotPaid, Locked, Paid, Error, CriticalError
}