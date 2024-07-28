import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import {  PrismaClient } from '@prisma/client';
import { isNil } from 'lodash';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit  {

  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.verbose('Postgresql database running')
  }

  create(createOrderDto: CreateOrderDto) {
    return {
      service: this.create.name,
      createOrderDto,
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      }
    });

    const {page, limit} = orderPaginationDto;

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          status: orderPaginationDto.status,
        }
      }),
      meta: {
        total: totalPages,
        page,
        lastPage: Math.ceil(totalPages/limit) 
      }
    }
  }

  async findOne(id: string) {

    const order = await this.order.findFirst({where: {id}});

    console.log("order", {order});
    

    if(isNil(order)){
      console.log("me puteo");
      
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID: ${id} not found`,
      })
    }

    return order;
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto){
    const {id, status} = changeOrderStatusDto;
    const order = await this.findOne(id);

    if(order.status === status) return order;

    return this.order.update({
      where: {id},
      data: {
        status
      }
    })
  }

}
