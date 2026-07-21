import { Global, InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET')?.trim();

        if (!secret) {
          throw new InternalServerErrorException('JWT_SECRET environment variable is not configured.');
        }

        if (secret === 'change-me') {
          throw new InternalServerErrorException('JWT_SECRET must be changed from the default value.');
        }

        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            noTimestamp: true
          },
          verifyOptions: {
            algorithms: ['HS256'],
            ignoreExpiration: true
          }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, AuthGuard, RolesGuard],
  exports: [AuthService, PasswordService, TokenService, AuthGuard, RolesGuard]
})
export class IdentityModule {}
