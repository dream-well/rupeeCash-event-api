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
    mongoose.connect('mongodb://localhost/mainchain-events',async () => {
        /* Drop the DB */
        await mongoose.connection.db.dropDatabase();
        console.log(mongoose.connection.db.databaseName, "dropped");
        process.exit(0);
    });
    break;
  default:
    bootstrap();
}

