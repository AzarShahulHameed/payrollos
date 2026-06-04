import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { setNotificationGateway } from '../../common/notification.helper';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'payrollos-jwt-secret' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private gateway: NotificationsGateway) {}
  onModuleInit() {
    // Inject gateway into helper so all services can push real-time
    setNotificationGateway(this.gateway);
  }
}
