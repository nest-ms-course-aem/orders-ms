import { OrderStatus } from "@prisma/client";
import { IsEAN, IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from "../enums/order.enum";


export class ChangeOrderStatusDto {


    @IsUUID(4)
    id: string;

    @IsEnum(OrderStatusList, {
        message: `Valid order status: ${OrderStatusList}`
    })
    status: OrderStatus;

}