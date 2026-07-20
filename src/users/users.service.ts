import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return [
      {
        id: 'USR001',
        name: 'Admin',
        email: 'admin@krishikendram.com',
        role: 'ADMIN',
      },
    ];
  }
}