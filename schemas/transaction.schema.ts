import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, MixedSchemaTypeOptions, SchemaType, SchemaTypeOptions } from 'mongoose';
import * as mongoose from 'mongoose';
import { Event } from './event.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  
  @Prop()
  txHash: string;

  @Prop()
  func: string;

  @Prop()
  args: mongoose.Schema.Types.Mixed;

  @Prop()
  timestamp: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ txHash: 1, func: 1 }, { unique: true });