import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePrintRequestDto } from './dto/print-request.dto';

@Injectable()
export class PrintRequestService {
  constructor(private readonly prisma: PrismaService) {}
  create(userId:string,dto:CreatePrintRequestDto){return this.prisma.printRequest.create({data:{userId,...dto}})}
  listForAdmin(){return this.prisma.printRequest.findMany({orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,email:true}}}})}
}
