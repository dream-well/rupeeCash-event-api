import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema()
export class Event {
  
  @Prop({unique: true})
  transactionHash: string;

  @Prop()
  name: string;

  @Prop()
  timestamp: number;

  @Prop({ type: SchemaTypes.Mixed})
  params: any;

}

export const EventSchema = SchemaFactory.createForClass(Event);
