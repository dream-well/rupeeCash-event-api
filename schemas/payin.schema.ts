import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PayinDocument = HydratedDocument<Payin>;

@Schema()
export class Payin {
  
  @Prop({unique: true})
  transactionHash: string;

  @Prop()
  requestId: number;

  @Prop({type: String, enum: ['Request_Payin', 'Process_Payin']})
  event: string;

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