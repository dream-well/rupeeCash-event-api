import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Payin, PayinSchema } from 'schemas/payin.schema';
import { Config, ConfigSchema } from 'schemas/config.schema';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { Payout, PayoutSchema } from 'schemas/payout.schema';
import { Event, EventSchema } from 'schemas/event.schema';
import { Transaction, TransactionSchema } from 'schemas/transaction.schema';
@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/subchain'), 
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    MongooseModule.forFeature([{ name: Payin.name, schema: PayinSchema }]),
    MongooseModule.forFeature([{ name: Payout.name, schema: PayoutSchema }]),
    MongooseModule.forFeature([{ name: Config.name, schema: ConfigSchema }]),
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    AuthModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
