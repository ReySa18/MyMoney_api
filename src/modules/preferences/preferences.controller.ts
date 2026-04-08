import { Controller, Get, Patch, Body } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Controller('api/me/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.preferencesService.getPreferences(user.sub);
  }

  @Patch()
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(user.sub, dto);
  }
}
