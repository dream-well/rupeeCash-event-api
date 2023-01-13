import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, MixedSchemaTypeOptions, SchemaType, SchemaTypeOptions } from 'mongoose';
import * as mongoose from 'mongoose';
import { Event } from './event.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  
  @Prop({ unique: true })
  txHash: string;

  @Prop()
  func: string;

  @Prop()
  args: mongoose.Schema.Types.Mixed;

  @Prop()
  timestamp: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
