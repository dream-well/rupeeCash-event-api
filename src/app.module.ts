import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Payin, PayinSchema } from 'schemas/payin.schema';
import { Config, ConfigSchema } from 'schemas/config.schema';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/subchain'), 
    MongooseModule.forFeature([{ name: Payin.name, schema: PayinSchema }]),
    MongooseModule.forFeature([{ name: Config.name, schema: ConfigSchema }]),
    AuthModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
