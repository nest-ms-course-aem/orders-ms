import { Catch, RpcExceptionFilter, ArgumentsHost, UnauthorizedException, ExceptionFilter, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { isNil } from 'lodash'
import { error } from 'console';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger('RpcException');
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const rpcError = exception.getError();


    if (
      typeof rpcError === 'object' &&
      'status' in rpcError &&
      'message' in rpcError
    ) {
      
      const status = isNaN(+rpcError.status) ? 400 :+rpcError.status;

      this.logger.error(`status: ${status}, error" ${rpcError.message}`);
      return response.status(status).json(rpcError.message);
    }
    
    this.logger.error(`status: ${400}, error" ${rpcError}`);
    response.status(400).json({
      status: 400,
      message: rpcError,
    });
  }
}