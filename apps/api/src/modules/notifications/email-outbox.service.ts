import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmailOutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailOutboxService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processPending(), 15_000);
    this.timer.unref();
    void this.processPending();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processPending() {
    await this.prisma.emailOutbox.updateMany({
      where: { status: EmailOutboxStatus.PROCESSING, updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: EmailOutboxStatus.FAILED, lastError: 'Recovered stale processing lease.', nextAttemptAt: new Date() }
    });

    const messages = await this.prisma.emailOutbox.findMany({
      where: { status: { in: [EmailOutboxStatus.PENDING, EmailOutboxStatus.FAILED] }, nextAttemptAt: { lte: new Date() }, attempts: { lt: 5 } },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    for (const message of messages) await this.deliver(message.id);
  }

  private async deliver(id: string) {
    const claimed = await this.prisma.emailOutbox.updateMany({
      where: { id, status: { in: [EmailOutboxStatus.PENDING, EmailOutboxStatus.FAILED] } },
      data: { status: EmailOutboxStatus.PROCESSING, attempts: { increment: 1 } }
    });
    if (claimed.count !== 1) return;

    const message = await this.prisma.emailOutbox.findUnique({ where: { id } });
    if (!message) return;

    try {
      await this.send(message.to, message.subject, message.html);
      await this.prisma.emailOutbox.update({ where: { id }, data: { status: EmailOutboxStatus.SENT, sentAt: new Date(), lastError: null } });
    } catch (error) {
      const nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** message.attempts) * 60_000);
      await this.prisma.emailOutbox.update({
        where: { id },
        data: { status: EmailOutboxStatus.FAILED, lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown email error', nextAttemptAt }
      });
    }
  }

  private async send(to: string, subject: string, html: string) {
    const provider = process.env.EMAIL_PROVIDER?.trim() || (process.env.NODE_ENV === 'production' ? 'resend' : 'log');
    if (provider === 'log') return;
    if (provider !== 'resend') throw new Error(`Unsupported email provider: ${provider}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html })
    });
    if (!response.ok) throw new Error(`Resend rejected email with status ${response.status}`);
  }
}
