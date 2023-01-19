import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema()
export class Event {
  
  @Prop()
  txHash: string;

  @Prop()
  name: string;

  @Prop()
  timestamp: number;

  @Prop({ type: SchemaTypes.Mixed})
  params: any;

  @Prop({index: true})
  firstParam: string;

}



export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ txHash: 1, name: 1 }, { unique: true });