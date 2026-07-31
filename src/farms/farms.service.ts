import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UserRole } from '@prisma/client';

import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateFarmAssetDto } from './dto/create-farm-asset.dto';
import { CreateFarmRecordDto } from './dto/create-farm-record.dto';


@Injectable()
export class FarmsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async create(
    ownerId: string,
    dto: CreateFarmDto,
  ) {

    return this.prisma.farm.create({
      data:{
        ...dto,
        ownerId,
      },
    });

  }



  async findMyFarms(
    ownerId:string,
  ){

    return this.prisma.farm.findMany({
      where:{
        ownerId,
      },
      include:{
        assets:true,
        records:true,
      },
      orderBy:{
        createdAt:'desc',
      },
    });

  }



  async findOne(
    id:string,
    userId:string,
    role:UserRole,
  ){

    const farm =
      await this.prisma.farm.findUnique({
        where:{
          id,
        },
        include:{
          assets:true,
          records:true,
          owner:{
            select:{
              id:true,
              name:true,
              email:true,
            },
          },
        },
      });


    if(!farm){
      throw new NotFoundException(
        'Farm not found',
      );
    }


    if(
      farm.ownerId !== userId &&
      role !== UserRole.ADMIN &&
      role !== UserRole.SUPER_ADMIN
    ){

      throw new ForbiddenException(
        'Access denied',
      );

    }


    return farm;

  }




  async update(
    id:string,
    userId:string,
    role:UserRole,
    dto:UpdateFarmDto,
  ){

    await this.findOne(
      id,
      userId,
      role,
    );


    return this.prisma.farm.update({
      where:{
        id,
      },
      data:dto,
    });

  }





  async addAsset(
    farmId:string,
    dto:CreateFarmAssetDto,
  ){

    return this.prisma.farmAsset.create({
      data:{
        farmId,
        ...dto,
      },
    });

  }





  async addRecord(
    farmId:string,
    dto:CreateFarmRecordDto,
  ){

    return this.prisma.farmRecord.create({
      data:{
        farmId,
        ...dto,
      },
    });

  }





  async remove(
    id:string,
    userId:string,
    role:UserRole,
  ){

    await this.findOne(
      id,
      userId,
      role,
    );


    await this.prisma.farm.delete({
      where:{
        id,
      },
    });


    return {
      message:
      'Farm deleted successfully',
    };

  }

}