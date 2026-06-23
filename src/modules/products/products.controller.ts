import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductsEnterDto, ProductsFetchDto } from './products.dto';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('info')
  async getProducts(@Query() query: ProductsFetchDto) {
    const products = await this.productsService.fetchProduct(query);
    return { products };
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('enter')
  async enterProducts(
    @Request() req: any,
    @Body() body: ProductsEnterDto,
    @Headers('x-locale') locale: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const { optic_number, password, application_id } = body;
    if (!optic_number || !password || !application_id) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.PRODUCT_CREDS_REQUIRED,
      );
    }

    return await this.productsService.enterProduct(userId, body, locale);
  }

  @HttpCode(HttpStatus.OK)
  @Post('details')
  async details(@Body() body: ProductsFetchDto) {
    return await this.productsService.fetchProduct(body);
  }
}
