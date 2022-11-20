import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfigDocument = HydratedDocument<Config>;

@Schema()
export class Config {
  @Prop({default: 480000})
  payin_blocknumber: number;

  @Prop({default: 480000})
  payout_blocknumber: number;

  @Prop({default: 480000})
  other_blocknumber: number;

}

export const ConfigSchema = SchemaFactory.createForClass(Config);