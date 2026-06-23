import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JusoDto {
  @ApiProperty({
    description: `Search keyword for address.\n
- Korean input → Korean address search (Juso API)\n
- English input → International address search (Geoapify API)`,
    example: '서울',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;
}
