import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { isNil } from 'lodash';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { PRODUCTS_SERVICE } from 'src/config/envs/service';
import { firstValueFrom } from 'rxjs';
import { log } from 'console';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productsClient: ClientProxy
  ) {
    super();
  }

  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.verbose('Postgresql database running')
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map(item => item.productId);

      console.log({ productIds });

      //Confirm product ids
      const products = await firstValueFrom(this.productsClient.send({ cmd: 'validateProducts' }, productIds));

      //Measure values

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
      const price = products.find(product => product?.id === orderItem.productId).price;

      return acc + (price * orderItem.quantity);

      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)

      // Database transaction

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map(item => ({
                price: products.find(product => product.id === item.productId).price,
                productId: item.productId,
                quantity: item.quantity
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
      })

      // Orders and order item are tables with relations so filling out the order object is enough to
      // generate the new record with its corresponding relation
      // If those tables does not have realtion then you should do this.$transaction...

      return {
        ...order,
        OrderItem: order.OrderItem.map(order => ({
          ...order,
          name: products.find(product => product.id === order.productId).name,
        }))
      }

    } catch (error) {

      console.log({ error });


      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Failed due to an unexpected issue'
      });

    }

    // return {
    //   service: this.create.name,
    //   createOrderDto,
    // }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      }
    });

    const { page, limit } = orderPaginationDto;

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
        lastPage: Math.ceil(totalPages / limit)
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({ where: { id } , include: {
    OrderItem: {
        select: {
          price: true,
          productId: true,
          quantity: true,
        }
      }
    }});

    const orderItemProductIds = order?.OrderItem.map(item => item.productId);
    try {

    const products = await firstValueFrom(this.productsClient.send({cmd: 'validateProducts'}, orderItemProductIds))
      
    if (isNil(order)) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID: ${id} not found`,
      })
    }

    return {
      ...order,
      OrderItem: order.OrderItem.map(item => ({
        ...item,
        name: products.find(product => product.id === item.productId).name
      }))
    };

  } catch (error) {
    throw new RpcException({
      status: HttpStatus.BAD_REQUEST,
      message: error?.message ?? error,
    })
  }
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    // if (order.status === status) return order; TODO UNCOMMENT

    return this.order.update({
      where: { id },
      data: {
        status
      }
    })
  }

}
