import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

// This should be a real class/interface representing a user entity
export type User = any;

@Injectable()
export class UsersService {
  private readonly users = [
    {
      _id: 1,
      email: 'selvan@jax.net',
      password: bcrypt.hashSync('selvan321#@!', 10)
    },
    {
      _id: 2,
      email: 'maria@jax.net',
      password: bcrypt.hashSync('guess', 10)
    },
  ];

  async findOne(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }
}