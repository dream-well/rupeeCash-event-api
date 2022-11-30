import dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(8000);
}

switch(process.env.mode) {
  case "db-drop":
    mongoose.connect('mongodb://localhost/subchain',function(){
        /* Drop the DB */
        console.log(mongoose.connection.db.databaseName);
        mongoose.connection.db.dropDatabase();
        process.exit(0);
    });
    break;
  default:
    bootstrap();
}

