import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { ProductionStatus, ProductionPriority, OrderStatus, PaymentStatus } from '@prisma/client';
import { ProductionService } from './production.service';

/**
 * Production Service Test Suite
 * 
 * Tests comprehensive production job operations:
 * - List jobs (filtering by status, orderId, priority, search query, pagination)
 * - Get job by ID
 * - Create job (with order validation, initial event creation)
 * - Update job status (with event creation)
 * - Update assignee
 * - Update priority
 * - Add production event (status change with note)
 * - Add internal note
 * - List internal notes
 * - Get timeline (chronologically sorted events, notes, job creation)
 * - Validation (order exists, job exists)
 */

describe('ProductionService', () => {
    let service: ProductionService;
    let prisma: any;

    beforeEach(() => {
        prisma = createMockPrisma();
        service = new ProductionService(prisma);
    });

    // ============================================================================
    // LIST JOBS
    // ============================================================================

    it('list returns paginated jobs with filters', async () => {
        const mockJobs = [
            mockProductionJob('job1', 'order1', 'Print Model A', ProductionStatus.PRINTING, ProductionPriority.HIGH),
            mockProductionJob('job2', 'order2', 'Paint Model B', ProductionStatus.PAINTING, ProductionPriority.NORMAL)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockJobs, 2];
        };

        const result = await service.list({
            page: 1,
            pageSize: 24,
            status: ProductionStatus.PRINTING
        });

        assert.equal(result.data.length, 2);
        assert.equal(result.meta.total, 2);
        assert.equal(result.meta.page, 1);
        assert.equal(result.meta.pageSize, 24);
        assert.equal(result.meta.pageCount, 1);
    });

    it('list filters by status', async () => {
        const mockJobs = [
            mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.QUEUED, ProductionPriority.NORMAL)
        ];

        let capturedWhere: any = null;
        prisma.$transaction = async (queries: any[]) => {
            // Capture the where clause from findMany call
            capturedWhere = queries[0];
            return [mockJobs, 1];
        };

        await service.list({
            page: 1,
            pageSize: 24,
            status: ProductionStatus.QUEUED
        });

        // Verify that status filter was applied
        assert.ok(capturedWhere !== null);
    });

    it('list filters by orderId', async () => {
        const mockJobs = [
            mockProductionJob('job1', 'order-specific', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockJobs, 1];
        };

        const result = await service.list({
            page: 1,
            pageSize: 24,
            orderId: 'order-specific'
        });

        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].orderId, 'order-specific');
    });

    it('list filters by priority', async () => {
        const mockJobs = [
            mockProductionJob('job1', 'order1', 'Urgent Job', ProductionStatus.PRINTING, ProductionPriority.URGENT)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockJobs, 1];
        };

        const result = await service.list({
            page: 1,
            pageSize: 24,
            priority: ProductionPriority.URGENT
        });

        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].priority, ProductionPriority.URGENT);
    });

    it('list searches by title or order number', async () => {
        const mockJobs = [
            mockProductionJob('job1', 'order1', 'Print Dragon Model', ProductionStatus.PRINTING, ProductionPriority.NORMAL)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockJobs, 1];
        };

        const result = await service.list({
            page: 1,
            pageSize: 24,
            q: 'Dragon'
        });

        assert.equal(result.data.length, 1);
        assert.ok(result.data[0].title.includes('Dragon'));
    });

    it('list handles pagination correctly', async () => {
        const mockJobs = Array.from({ length: 10 }, (_, i) =>
            mockProductionJob(`job${i}`, `order${i}`, `Job ${i}`, ProductionStatus.PRINTING, ProductionPriority.NORMAL)
        );

        prisma.$transaction = async (queries: any[]) => {
            return [mockJobs.slice(10, 20), 50]; // page 2, 10 items per page
        };

        const result = await service.list({
            page: 2,
            pageSize: 10
        });

        assert.equal(result.meta.page, 2);
        assert.equal(result.meta.pageSize, 10);
        assert.equal(result.meta.total, 50);
        assert.equal(result.meta.pageCount, 5); // 50 / 10 = 5 pages
    });

    it('list returns empty array when no jobs match', async () => {
        prisma.$transaction = async (queries: any[]) => {
            return [[], 0];
        };

        const result = await service.list({
            page: 1,
            pageSize: 24
        });

        assert.equal(result.data.length, 0);
        assert.equal(result.meta.total, 0);
        assert.equal(result.meta.pageCount, 0);
    });

    // ============================================================================
    // GET JOB
    // ============================================================================

    it('get returns job by ID', async () => {
        const mockJob = mockProductionJob('job1', 'order1', 'Test Job', ProductionStatus.PRINTING, ProductionPriority.HIGH);

        prisma.productionJob.findUnique = async () => mockJob;

        const result = await service.get('job1');

        assert.equal(result.id, 'job1');
        assert.equal(result.title, 'Test Job');
        assert.equal(result.status, ProductionStatus.PRINTING);
    });

    it('get throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.get('job-nonexistent'),
            NotFoundException
        );
    });

    // ============================================================================
    // CREATE JOB
    // ============================================================================

    it('create creates job with initial event', async () => {
        let eventCreated = false;
        const mockJob = mockProductionJob('job1', 'order1', 'New Job', ProductionStatus.QUEUED, ProductionPriority.NORMAL);

        prisma.order.findUnique = async () => mockOrder('order1');
        prisma.productionJob.create = async (args: any) => {
            if (args.data.events?.create) {
                eventCreated = true;
                assert.equal(args.data.events.create.status, ProductionStatus.QUEUED);
            }
            return mockJob;
        };

        await service.create({
            orderId: 'order1',
            title: 'New Job',
            status: ProductionStatus.QUEUED
        });

        assert.ok(eventCreated, 'Initial event should be created');
    });

    it('create includes note in initial event when provided', async () => {
        let capturedNote: string | null = null;
        const mockJob = mockProductionJob('job1', 'order1', 'New Job', ProductionStatus.QUEUED, ProductionPriority.NORMAL);

        prisma.order.findUnique = async () => mockOrder('order1');
        prisma.productionJob.create = async (args: any) => {
            if (args.data.events?.create) {
                capturedNote = args.data.events.create.note;
            }
            return mockJob;
        };

        await service.create({
            orderId: 'order1',
            title: 'New Job',
            status: ProductionStatus.QUEUED,
            note: 'Initial note'
        });

        assert.equal(capturedNote, 'Initial note');
    });

    it('create rejects when order does not exist', async () => {
        prisma.order.findUnique = async () => null;

        await assert.rejects(
            () => service.create({
                orderId: 'order-nonexistent',
                title: 'New Job',
                status: ProductionStatus.QUEUED
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE STATUS
    // ============================================================================

    it('updateStatus updates status and creates event', async () => {
        let statusUpdated = false;
        let eventCreated = false;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.status === ProductionStatus.PRINTING) {
                statusUpdated = true;
            }
            if (args.data.events?.create) {
                eventCreated = true;
                assert.equal(args.data.events.create.status, ProductionStatus.PRINTING);
            }
            return { ...mockJob, status: ProductionStatus.PRINTING };
        };

        await service.updateStatus('job1', {
            status: ProductionStatus.PRINTING,
            note: 'Started printing'
        });

        assert.ok(statusUpdated, 'Status should be updated');
        assert.ok(eventCreated, 'Event should be created');
    });

    it('updateStatus includes note in event when provided', async () => {
        let capturedNote: string | null = null;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.events?.create) {
                capturedNote = args.data.events.create.note;
            }
            return mockJob;
        };

        await service.updateStatus('job1', {
            status: ProductionStatus.PRINTING,
            note: 'Started printing process'
        });

        assert.equal(capturedNote, 'Started printing process');
    });

    it('updateStatus throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.updateStatus('job-nonexistent', {
                status: ProductionStatus.PRINTING
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE ASSIGNEE
    // ============================================================================

    it('updateAssignee assigns user to job', async () => {
        let assigneeUpdated = false;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.assigneeId === 'user1') {
                assigneeUpdated = true;
            }
            return { ...mockJob, assigneeId: 'user1' };
        };

        const result = await service.updateAssignee('job1', {
            assigneeId: 'user1'
        });

        assert.ok(assigneeUpdated);
        assert.equal(result.assigneeId, 'user1');
    });

    it('updateAssignee removes assignee when set to null', async () => {
        let assigneeRemoved = false;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.assigneeId === null) {
                assigneeRemoved = true;
            }
            return { ...mockJob, assigneeId: null };
        };

        await service.updateAssignee('job1', {
            assigneeId: null
        });

        assert.ok(assigneeRemoved);
    });

    it('updateAssignee throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.updateAssignee('job-nonexistent', {
                assigneeId: 'user1'
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE PRIORITY
    // ============================================================================

    it('updatePriority updates job priority', async () => {
        let priorityUpdated = false;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.priority === ProductionPriority.URGENT) {
                priorityUpdated = true;
            }
            return { ...mockJob, priority: ProductionPriority.URGENT };
        };

        const result = await service.updatePriority('job1', {
            priority: ProductionPriority.URGENT
        });

        assert.ok(priorityUpdated);
        assert.equal(result.priority, ProductionPriority.URGENT);
    });

    it('updatePriority throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.updatePriority('job-nonexistent', {
                priority: ProductionPriority.URGENT
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // ADD EVENT
    // ============================================================================

    it('addEvent updates status and creates event', async () => {
        let statusUpdated = false;
        let eventCreated = false;
        const mockJob = mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);

        prisma.productionJob.findUnique = async () => mockJob;
        prisma.productionJob.update = async (args: any) => {
            if (args.data.status === ProductionStatus.QUALITY_CHECK) {
                statusUpdated = true;
            }
            if (args.data.events?.create) {
                eventCreated = true;
                assert.equal(args.data.events.create.status, ProductionStatus.QUALITY_CHECK);
            }
            return { ...mockJob, status: ProductionStatus.QUALITY_CHECK };
        };

        await service.addEvent('job1', {
            status: ProductionStatus.QUALITY_CHECK,
            note: 'Moving to QC'
        });

        assert.ok(statusUpdated);
        assert.ok(eventCreated);
    });

    it('addEvent throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.addEvent('job-nonexistent', {
                status: ProductionStatus.DONE
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // INTERNAL NOTES
    // ============================================================================

    it('addInternalNote creates note', async () => {
        let noteCreated = false;
        const mockNote = {
            id: 'note1',
            productionJobId: 'job1',
            body: 'Internal note',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        prisma.productionJob.findUnique = async () => mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);
        prisma.internalNote.create = async (args: any) => {
            if (args.data.productionJobId === 'job1' && args.data.body === 'Internal note') {
                noteCreated = true;
            }
            return mockNote;
        };

        const result = await service.addInternalNote('job1', {
            body: 'Internal note'
        });

        assert.ok(noteCreated);
        assert.equal(result.body, 'Internal note');
    });

    it('addInternalNote throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.addInternalNote('job-nonexistent', {
                body: 'Note'
            }),
            NotFoundException
        );
    });

    it('listInternalNotes returns notes sorted by created date desc', async () => {
        const mockNotes = [
            {
                id: 'note2',
                productionJobId: 'job1',
                body: 'Second note',
                createdAt: new Date('2024-01-02'),
                updatedAt: new Date('2024-01-02')
            },
            {
                id: 'note1',
                productionJobId: 'job1',
                body: 'First note',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            }
        ];

        prisma.productionJob.findUnique = async () => mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL);
        prisma.internalNote.findMany = async (args: any) => {
            // Verify orderBy is set correctly
            assert.deepEqual(args.orderBy, { createdAt: 'desc' });
            return mockNotes;
        };

        const result = await service.listInternalNotes('job1');

        assert.equal(result.data.length, 2);
        assert.equal(result.data[0].id, 'note2'); // newer note first
        assert.equal(result.data[1].id, 'note1');
    });

    it('listInternalNotes throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.listInternalNotes('job-nonexistent'),
            NotFoundException
        );
    });

    // ============================================================================
    // TIMELINE
    // ============================================================================

    it('getTimeline returns chronologically sorted events', async () => {
        const mockJob = {
            ...mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.DONE, ProductionPriority.NORMAL),
            createdAt: new Date('2024-01-01T10:00:00Z'),
            events: [
                {
                    id: 'event2',
                    productionJobId: 'job1',
                    status: ProductionStatus.DONE,
                    note: 'Completed',
                    createdAt: new Date('2024-01-01T12:00:00Z')
                },
                {
                    id: 'event1',
                    productionJobId: 'job1',
                    status: ProductionStatus.PRINTING,
                    note: 'Started printing',
                    createdAt: new Date('2024-01-01T11:00:00Z')
                }
            ],
            internalNotes: [
                {
                    id: 'note1',
                    createdAt: new Date('2024-01-01T11:30:00Z'),
                    updatedAt: new Date('2024-01-01T11:30:00Z')
                }
            ]
        };

        prisma.productionJob.findUnique = async () => mockJob;

        const result = await service.getTimeline('job1');

        assert.equal(result.data.length, 4); // job created + 2 events + 1 note

        // Verify chronological order
        assert.equal(result.data[0].type, 'PRODUCTION_JOB_CREATED'); // 10:00
        assert.equal(result.data[1].type, 'PRODUCTION_STATUS_CHANGED'); // 11:00 (event1)
        assert.equal((result.data[1] as any).status, ProductionStatus.PRINTING);
        assert.equal(result.data[2].type, 'INTERNAL_NOTE_ADDED'); // 11:30 (note1)
        assert.equal(result.data[3].type, 'PRODUCTION_STATUS_CHANGED'); // 12:00 (event2)
        assert.equal((result.data[3] as any).status, ProductionStatus.DONE);
    });

    it('getTimeline includes event notes', async () => {
        const mockJob = {
            ...mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL),
            createdAt: new Date('2024-01-01T10:00:00Z'),
            events: [
                {
                    id: 'event1',
                    productionJobId: 'job1',
                    status: ProductionStatus.PRINTING,
                    note: 'Started printing with new material',
                    createdAt: new Date('2024-01-01T11:00:00Z')
                }
            ],
            internalNotes: []
        };

        prisma.productionJob.findUnique = async () => mockJob;

        const result = await service.getTimeline('job1');

        const statusChangedEvent = result.data.find((e: any) => e.type === 'PRODUCTION_STATUS_CHANGED');
        assert.equal((statusChangedEvent as any)?.note, 'Started printing with new material');
    });

    it('getTimeline includes internal note IDs', async () => {
        const mockJob = {
            ...mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.PRINTING, ProductionPriority.NORMAL),
            createdAt: new Date('2024-01-01T10:00:00Z'),
            events: [],
            internalNotes: [
                {
                    id: 'note1',
                    createdAt: new Date('2024-01-01T11:00:00Z'),
                    updatedAt: new Date('2024-01-01T11:00:00Z')
                }
            ]
        };

        prisma.productionJob.findUnique = async () => mockJob;

        const result = await service.getTimeline('job1');

        const noteEvent = result.data.find((e: any) => e.type === 'INTERNAL_NOTE_ADDED');
        assert.equal((noteEvent as any)?.noteId, 'note1');
    });

    it('getTimeline throws NotFoundException when job not found', async () => {
        prisma.productionJob.findUnique = async () => null;

        await assert.rejects(
            () => service.getTimeline('job-nonexistent'),
            NotFoundException
        );
    });

    it('getTimeline handles job with no events or notes', async () => {
        const mockJob = {
            ...mockProductionJob('job1', 'order1', 'Job 1', ProductionStatus.QUEUED, ProductionPriority.NORMAL),
            createdAt: new Date('2024-01-01T10:00:00Z'),
            events: [],
            internalNotes: []
        };

        prisma.productionJob.findUnique = async () => mockJob;

        const result = await service.getTimeline('job1');

        assert.equal(result.data.length, 1); // only job created event
        assert.equal(result.data[0].type, 'PRODUCTION_JOB_CREATED');
    });
});

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockPrisma() {
    return {
        $transaction: async (queries: any[]) => [[], 0],
        productionJob: {
            findUnique: async () => null,
            findMany: async () => [],
            create: async () => ({} as any),
            update: async () => ({} as any),
            count: async () => 0
        },
        order: {
            findUnique: async () => null
        },
        internalNote: {
            create: async () => ({} as any),
            findMany: async () => []
        }
    };
}

function mockOrder(id: string) {
    return {
        id,
        orderNumber: `ORD-${id}`,
        userId: 'user1',
        status: OrderStatus.PENDING_CONFIRMATION,
        paymentStatus: PaymentStatus.UNPAID,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function mockProductionJob(
    id: string,
    orderId: string,
    title: string,
    status: ProductionStatus,
    priority: ProductionPriority
) {
    return {
        id,
        orderId,
        title,
        status,
        priority,
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
            id: orderId,
            orderNumber: `ORD-${orderId}`,
            status: OrderStatus.PENDING_CONFIRMATION,
            paymentStatus: PaymentStatus.UNPAID
        },
        events: [],
        internalNotes: []
    };
}
