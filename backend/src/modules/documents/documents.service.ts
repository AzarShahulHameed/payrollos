import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async listEmployees(orgId: string) {
    return this.prisma.employee.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: {
        department: { select: { name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getByEmployee(orgId: string, employeeId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      include: { department: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const docs = await this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { uploadedAt: 'desc' },
    });
    return { employee: emp, documents: docs };
  }

  async create(orgId: string, employeeId: string, dto: any) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    // Use only original fields — new fields (category, notes, organizationId etc.)
    // added via cast until migration runs
    return (this.prisma.employeeDocument as any).create({
      data: {
        employeeId,
        name:       dto.name,
        type:       dto.category || dto.type || 'OTHER',
        fileUrl:    dto.fileUrl,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        // New fields — will work after migration, silently ignored before
        ...(dto.category    && { category:       dto.category }),
        ...(dto.notes       && { notes:          dto.notes }),
        ...(dto.fileType    && { fileType:        dto.fileType }),
        ...(dto.fileSize    && { fileSize:        +dto.fileSize }),
        ...(orgId           && { organizationId:  orgId }),
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    const doc = await this.prisma.employeeDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    return (this.prisma.employeeDocument as any).update({
      where: { id },
      data: {
        name:       dto.name       || doc.name,
        type:       dto.category   || dto.type || doc.type,
        fileUrl:    dto.fileUrl    || doc.fileUrl,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : doc.expiryDate,
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.notes    !== undefined && { notes:    dto.notes }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    const doc = await this.prisma.employeeDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.employeeDocument.delete({ where: { id } });
  }
}
