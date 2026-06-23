import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@/src/common/decorators/public-route.decorator';
import { DocsService } from './docs.service';

@ApiExcludeController()
@Public()
@Controller('docs-md')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Get()
  async docsIndex(@Res() res: Response) {
    const page = await this.docsService.render('');
    return res.type('html').send(page.html);
  }

  @Get('*')
  async docsPage(@Req() req: Request, @Res() res: Response) {
    const requestedPath = (req.params as Record<string, string | undefined>)['0'] ?? '';
    const page = await this.docsService.render(requestedPath);
    return res.type('html').send(page.html);
  }
}
