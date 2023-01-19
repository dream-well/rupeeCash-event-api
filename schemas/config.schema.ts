import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfigDocument = HydratedDocument<Config>;

@Schema()
export class Config {
  @Prop({default: 480000})
  blocknumber_scan: number;

  @Prop({default: 480000})
  tx_scan: number;

  @Prop({default: 306264})
  event_scan: number;

  @Prop({default: 26440000 })
  bsc_scan: number;

  @Prop({default: 26440000 })
  bsc_rupeecash_scan: number;

}

export const ConfigSchema = SchemaFactory.createForClass(Config);