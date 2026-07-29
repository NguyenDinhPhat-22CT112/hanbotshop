import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus, AuditAction, Prisma } from '@prisma/client';
import { UsersService } from './users.service';

/**
 * Users Service Test Suite
 * 
 * Tests comprehensive user management operations:
 * - Profile operations (getMe, updateMe)
 * - User list (admin operations with filters, pagination, search)
 * - User details (get user with addresses, recent orders)
 * - Status management (activate/disable user with audit)
 * - Role management (promote/demote user with audit)
 * - User orders listing
 * - Address CRUD (create, update, delete, list)
 * - Default address management (only one default per user)
 * - Address ownership validation
 * - Self-operation prevention (admin cannot change own status/role)
 * - Audit logging for sensitive operations
 */

describe('UsersService', () => {
    let service: UsersService;
    let prisma: any;
    let auditService: any;

    beforeEach(() => {
        auditService = createMockAuditService();
        prisma = createMockPrisma();
        service = new UsersService(prisma, auditService);
    });

    // ============================================================================
    // PROFILE OPERATIONS
    // ============================================================================

    it('getMe returns current user profile', async () => {
        const mockUser = mockUserData('user1', 'user@example.com', 'John Doe', UserRole.CUSTOMER, UserStatus.ACTIVE);

        prisma.user.findUnique = async () => mockUser;

        const result = await service.getMe('user1');

        assert.equal(result.id, 'user1');
        assert.equal(result.email, 'user@example.com');
        assert.equal(result.name, 'John Doe');
    });

    it('getMe throws NotFoundException when user not found', async () => {
        prisma.user.findUnique = async () => null;

        await assert.rejects(
            () => service.getMe('user-nonexistent'),
            NotFoundException
        );
    });

    it('updateMe updates user profile', async () => {
        let updatedData: any = null;
        const mockUser = mockUserData('user1', 'user@example.com', 'John Doe', UserRole.CUSTOMER, UserStatus.ACTIVE);

        prisma.user.update = async (args: any) => {
            updatedData = args.data;
            return { ...mockUser, name: 'Jane Doe', phone: '+84901234567' };
        };

        const result = await service.updateMe('user1', {
            name: 'Jane Doe',
            phone: '+84901234567'
        });

        assert.equal(updatedData.name, 'Jane Doe');
        assert.equal(updatedData.phone, '+84901234567');
        assert.equal(result.name, 'Jane Doe');
        assert.equal(result.phone, '+84901234567');
    });

    it('updateMe handles partial updates', async () => {
        let updatedData: any = null;
        const mockUser = mockUserData('user1', 'user@example.com', 'John Doe', UserRole.CUSTOMER, UserStatus.ACTIVE);

        prisma.user.update = async (args: any) => {
            updatedData = args.data;
            return { ...mockUser, phone: '+84901234567' };
        };

        await service.updateMe('user1', {
            phone: '+84901234567'
        });

        assert.equal(updatedData.phone, '+84901234567');
        assert.equal(updatedData.name, undefined); // name not updated
    });

    // ============================================================================
    // USER LIST (ADMIN)
    // ============================================================================

    it('listUsers returns paginated users', async () => {
        const mockUsers = [
            mockUserData('user1', 'user1@example.com', 'User 1', UserRole.CUSTOMER, UserStatus.ACTIVE),
            mockUserData('user2', 'user2@example.com', 'User 2', UserRole.CUSTOMER, UserStatus.ACTIVE)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 5 } })), 2];
        };

        const result = await service.listUsers({
            page: 1,
            pageSize: 24
        });

        assert.equal(result.data.length, 2);
        assert.equal(result.meta.total, 2);
        assert.equal(result.meta.page, 1);
        assert.equal(result.meta.pageSize, 24);
        assert.equal(result.meta.pageCount, 1);
    });

    it('listUsers filters by role', async () => {
        const mockUsers = [
            mockUserData('admin1', 'admin@example.com', 'Admin User', UserRole.ADMIN, UserStatus.ACTIVE)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 0 } })), 1];
        };

        const result = await service.listUsers({
            page: 1,
            pageSize: 24,
            role: UserRole.ADMIN
        });

        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].role, UserRole.ADMIN);
    });

    it('listUsers filters by status', async () => {
        const mockUsers = [
            mockUserData('user1', 'disabled@example.com', 'Disabled User', UserRole.CUSTOMER, UserStatus.DISABLED)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 0 } })), 1];
        };

        const result = await service.listUsers({
            page: 1,
            pageSize: 24,
            status: UserStatus.DISABLED
        });

        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].status, UserStatus.DISABLED);
    });

    it('listUsers searches by email, name, or phone', async () => {
        const mockUsers = [
            mockUserData('user1', 'john@example.com', 'John Doe', UserRole.CUSTOMER, UserStatus.ACTIVE)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 3 } })), 1];
        };

        const result = await service.listUsers({
            page: 1,
            pageSize: 24,
            q: 'john'
        });

        assert.equal(result.data.length, 1);
        assert.ok(result.data[0].email.includes('john') || result.data[0].name?.includes('John'));
    });

    it('listUsers handles pagination correctly', async () => {
        const mockUsers = Array.from({ length: 10 }, (_, i) =>
            mockUserData(`user${i}`, `user${i}@example.com`, `User ${i}`, UserRole.CUSTOMER, UserStatus.ACTIVE)
        );

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 0 } })), 50];
        };

        const result = await service.listUsers({
            page: 2,
            pageSize: 10
        });

        assert.equal(result.meta.page, 2);
        assert.equal(result.meta.pageSize, 10);
        assert.equal(result.meta.total, 50);
        assert.equal(result.meta.pageCount, 5);
    });

    it('listUsers includes order count', async () => {
        const mockUsers = [
            mockUserData('user1', 'user1@example.com', 'User 1', UserRole.CUSTOMER, UserStatus.ACTIVE)
        ];

        prisma.$transaction = async (queries: any[]) => {
            return [mockUsers.map(u => ({ ...u, _count: { orders: 12 } })), 1];
        };

        const result = await service.listUsers({
            page: 1,
            pageSize: 24
        });

        assert.equal((result.data[0] as any)._count.orders, 12);
    });

    // ============================================================================
    // GET USER DETAILS
    // ============================================================================

    it('getUser returns user with addresses and recent orders', async () => {
        const mockUser = {
            ...mockUserData('user1', 'user@example.com', 'John Doe', UserRole.CUSTOMER, UserStatus.ACTIVE),
            addresses: [
                mockAddress('addr1', 'user1', 'John Doe', '+84901234567', true)
            ],
            orders: [
                mockOrder('order1', 'ORD-001', new Prisma.Decimal(500000))
            ]
        };

        prisma.user.findUnique = async () => mockUser;

        const result = await service.getUser('user1');

        assert.equal(result.id, 'user1');
        assert.equal(result.addresses.length, 1);
        assert.equal(result.orders.length, 1);
        assert.equal(result.orders[0].total, '500000');
    });

    it('getUser throws NotFoundException when user not found', async () => {
        prisma.user.findUnique = async () => null;

        await assert.rejects(
            () => service.getUser('user-nonexistent'),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE STATUS
    // ============================================================================

    it('updateStatus updates user status and creates audit log', async () => {
        let statusUpdated = false;
        let auditRecorded = false;
        const mockUser = mockUserData('user1', 'user@example.com', 'User 1', UserRole.CUSTOMER, UserStatus.ACTIVE);

        prisma.user.findUnique = async () => mockUser;
        prisma.user.update = async (args: any) => {
            if (args.data.status === UserStatus.DISABLED) {
                statusUpdated = true;
            }
            return { ...mockUser, status: UserStatus.DISABLED };
        };
        auditService.record = async (args: any) => {
            if (args.action === AuditAction.USER_STATUS_CHANGE) {
                auditRecorded = true;
                assert.equal(args.before.status, UserStatus.ACTIVE);
                assert.equal(args.after.status, UserStatus.DISABLED);
            }
        };

        await service.updateStatus('admin1', 'user1', {
            status: UserStatus.DISABLED
        });

        assert.ok(statusUpdated);
        assert.ok(auditRecorded);
    });

    it('updateStatus prevents admin from changing own status', async () => {
        await assert.rejects(
            () => service.updateStatus('admin1', 'admin1', {
                status: UserStatus.DISABLED
            }),
            ForbiddenException
        );
    });

    it('updateStatus throws NotFoundException when user not found', async () => {
        prisma.user.findUnique = async () => null;

        await assert.rejects(
            () => service.updateStatus('admin1', 'user-nonexistent', {
                status: UserStatus.DISABLED
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE ROLE
    // ============================================================================

    it('updateRole updates user role and creates audit log', async () => {
        let roleUpdated = false;
        let auditRecorded = false;
        const mockUser = mockUserData('user1', 'user@example.com', 'User 1', UserRole.CUSTOMER, UserStatus.ACTIVE);

        prisma.user.findUnique = async () => mockUser;
        prisma.user.update = async (args: any) => {
            if (args.data.role === UserRole.ADMIN) {
                roleUpdated = true;
            }
            return { ...mockUser, role: UserRole.ADMIN };
        };
        auditService.record = async (args: any) => {
            if (args.action === AuditAction.ROLE_CHANGE) {
                auditRecorded = true;
                assert.equal(args.before.role, UserRole.CUSTOMER);
                assert.equal(args.after.role, UserRole.ADMIN);
            }
        };

        await service.updateRole('admin1', 'user1', {
            role: UserRole.ADMIN
        });

        assert.ok(roleUpdated);
        assert.ok(auditRecorded);
    });

    it('updateRole prevents admin from changing own role', async () => {
        await assert.rejects(
            () => service.updateRole('admin1', 'admin1', {
                role: UserRole.CUSTOMER
            }),
            ForbiddenException
        );
    });

    it('updateRole throws NotFoundException when user not found', async () => {
        prisma.user.findUnique = async () => null;

        await assert.rejects(
            () => service.updateRole('admin1', 'user-nonexistent', {
                role: UserRole.ADMIN
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // ADMIN PASSWORD RESET
    // ============================================================================

    it('updatePassword stores only a hash and audits the admin action', async () => {
        let updatedData: any = null;
        let auditEntry: any = null;
        service = new UsersService(prisma, auditService, {
            hashPassword: async (password: string) => `hashed:${password}`
        } as never);
        prisma.user.findUnique = async () => ({ id: 'user1', email: 'user@example.com' });
        prisma.user.update = async (args: any) => {
            updatedData = args.data;
            return { id: 'user1' };
        };
        auditService.record = async (entry: any) => {
            auditEntry = entry;
        };

        const result = await service.updatePassword('admin1', 'user1', { password: 'new-password-123' });

        assert.deepEqual(result, { success: true });
        assert.equal(updatedData.passwordHash, 'hashed:new-password-123');
        assert.equal(auditEntry.action, AuditAction.PASSWORD_RESET_COMPLETED);
        assert.equal(auditEntry.metadata.source, 'admin-user-management');
        assert.equal(JSON.stringify(auditEntry).includes('new-password-123'), false);
    });

    it('updatePassword prevents an admin from setting their own password', async () => {
        await assert.rejects(
            () => service.updatePassword('admin1', 'admin1', { password: 'new-password-123' }),
            ForbiddenException
        );
    });

    // ============================================================================
    // USER ORDERS
    // ============================================================================

    it('getUserOrders returns user orders with items', async () => {
        const mockOrders = [
            {
                ...mockOrder('order1', 'ORD-001', new Prisma.Decimal(500000)),
                items: [
                    mockOrderItem('item1', 'order1', 'prod1', 2, new Prisma.Decimal(200000), new Prisma.Decimal(400000))
                ]
            }
        ];

        prisma.user.findUnique = async () => mockUserData('user1', 'user@example.com', 'User 1', UserRole.CUSTOMER, UserStatus.ACTIVE);
        prisma.order.findMany = async () => mockOrders;

        const result = await service.getUserOrders('user1');

        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].items.length, 1);
        assert.equal(result.data[0].total, '500000');
        assert.equal(result.data[0].items[0].unitPrice, '200000');
        assert.equal(result.data[0].items[0].totalPrice, '400000');
    });

    it('getUserOrders throws NotFoundException when user not found', async () => {
        prisma.user.findUnique = async () => null;

        await assert.rejects(
            () => service.getUserOrders('user-nonexistent'),
            NotFoundException
        );
    });

    // ============================================================================
    // ADDRESS CRUD
    // ============================================================================

    it('listAddresses returns addresses sorted by default first, then updated', async () => {
        const mockAddresses = [
            mockAddress('addr1', 'user1', 'Default Address', '+84901111111', true),
            mockAddress('addr2', 'user1', 'Other Address', '+84902222222', false)
        ];

        prisma.address.findMany = async (args: any) => {
            // Verify orderBy is correct
            assert.deepEqual(args.orderBy, [{ isDefault: 'desc' }, { updatedAt: 'desc' }]);
            return mockAddresses;
        };

        const result = await service.listAddresses('user1');

        assert.equal(result.data.length, 2);
        assert.equal(result.data[0].isDefault, true);
    });

    it('createAddress creates new address', async () => {
        let addressCreated = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'John Doe', '+84901234567', false);

        prisma.$transaction = async (callback: any) => {
            const tx = {
                address: {
                    updateMany: async () => { },
                    create: async (args: any) => {
                        addressCreated = true;
                        assert.equal(args.data.recipient, 'John Doe');
                        return mockAddress1;
                    }
                }
            };
            return callback(tx);
        };

        const result = await service.createAddress('user1', {
            recipient: 'John Doe',
            phone: '+84901234567',
            line1: '123 Main St',
            city: 'Ho Chi Minh',
            countryCode: 'VN',
            isDefault: false
        });

        assert.ok(addressCreated);
        assert.equal(result.recipient, 'John Doe');
    });

    it('createAddress unsets other defaults when creating default address', async () => {
        let otherDefaultsUnset = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'John Doe', '+84901234567', true);

        prisma.$transaction = async (callback: any) => {
            const tx = {
                address: {
                    updateMany: async (args: any) => {
                        if (args.data.isDefault === false) {
                            otherDefaultsUnset = true;
                        }
                    },
                    create: async () => mockAddress1
                }
            };
            return callback(tx);
        };

        await service.createAddress('user1', {
            recipient: 'John Doe',
            phone: '+84901234567',
            line1: '123 Main St',
            city: 'Ho Chi Minh',
            countryCode: 'VN',
            isDefault: true
        });

        assert.ok(otherDefaultsUnset);
    });

    it('updateAddress updates address', async () => {
        let addressUpdated = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'Jane Doe', '+84901234567', false);

        prisma.address.findFirst = async () => mockAddress1;
        prisma.$transaction = async (callback: any) => {
            const tx = {
                address: {
                    updateMany: async () => { },
                    update: async (args: any) => {
                        addressUpdated = true;
                        assert.equal(args.data.recipient, 'Jane Doe');
                        return { ...mockAddress1, recipient: 'Jane Doe' };
                    }
                }
            };
            return callback(tx);
        };

        const result = await service.updateAddress('user1', 'addr1', {
            recipient: 'Jane Doe',
            phone: '+84901234567',
            line1: '123 Main St',
            city: 'Ho Chi Minh',
            countryCode: 'VN'
        });

        assert.ok(addressUpdated);
        assert.equal(result.recipient, 'Jane Doe');
    });

    it('updateAddress validates address ownership', async () => {
        prisma.address.findFirst = async () => null; // address not found or not owned

        await assert.rejects(
            () => service.updateAddress('user1', 'addr-other', {
                recipient: 'Jane Doe',
                phone: '+84901234567',
                line1: '123 Main St',
                city: 'Ho Chi Minh',
                countryCode: 'VN'
            }),
            NotFoundException
        );
    });

    it('updateAddress unsets other defaults when setting new default', async () => {
        let otherDefaultsUnset = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'John Doe', '+84901234567', false);

        prisma.address.findFirst = async () => mockAddress1;
        prisma.$transaction = async (callback: any) => {
            const tx = {
                address: {
                    updateMany: async (args: any) => {
                        if (args.data.isDefault === false && args.where.id?.not === 'addr1') {
                            otherDefaultsUnset = true;
                        }
                    },
                    update: async () => ({ ...mockAddress1, isDefault: true })
                }
            };
            return callback(tx);
        };

        await service.updateAddress('user1', 'addr1', {
            recipient: 'John Doe',
            phone: '+84901234567',
            line1: '123 Main St',
            city: 'Ho Chi Minh',
            countryCode: 'VN',
            isDefault: true
        });

        assert.ok(otherDefaultsUnset);
    });

    it('deleteAddress deletes address', async () => {
        let addressDeleted = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'John Doe', '+84901234567', false);

        prisma.address.findFirst = async () => mockAddress1;
        prisma.address.delete = async (args: any) => {
            if (args.where.id === 'addr1') {
                addressDeleted = true;
            }
            return mockAddress1;
        };

        const result = await service.deleteAddress('user1', 'addr1');

        assert.ok(addressDeleted);
        assert.equal(result.success, true);
    });

    it('deleteAddress validates address ownership', async () => {
        prisma.address.findFirst = async () => null;

        await assert.rejects(
            () => service.deleteAddress('user1', 'addr-other'),
            NotFoundException
        );
    });

    it('setDefaultAddress sets address as default', async () => {
        let otherDefaultsUnset = false;
        let addressSetDefault = false;
        const mockAddress1 = mockAddress('addr1', 'user1', 'John Doe', '+84901234567', false);

        prisma.address.findFirst = async () => mockAddress1;
        prisma.$transaction = async (callback: any) => {
            const tx = {
                address: {
                    updateMany: async (args: any) => {
                        if (args.data.isDefault === false) {
                            otherDefaultsUnset = true;
                        }
                    },
                    update: async (args: any) => {
                        if (args.data.isDefault === true) {
                            addressSetDefault = true;
                        }
                        return { ...mockAddress1, isDefault: true };
                    }
                }
            };
            return callback(tx);
        };

        const result = await service.setDefaultAddress('user1', 'addr1');

        assert.ok(otherDefaultsUnset);
        assert.ok(addressSetDefault);
        assert.equal(result.isDefault, true);
    });

    it('setDefaultAddress validates address ownership', async () => {
        prisma.address.findFirst = async () => null;

        await assert.rejects(
            () => service.setDefaultAddress('user1', 'addr-other'),
            NotFoundException
        );
    });
});

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockPrisma() {
    return {
        $transaction: async (queries: any[]) => [[], 0],
        user: {
            findUnique: async () => null,
            findMany: async () => [],
            update: async () => ({} as any),
            count: async () => 0
        },
        order: {
            findMany: async () => []
        },
        address: {
            findFirst: async () => null,
            findMany: async () => [],
            create: async () => ({} as any),
            update: async () => ({} as any),
            delete: async () => ({} as any),
            updateMany: async () => ({} as any)
        }
    };
}

function createMockAuditService() {
    return {
        record: async () => { }
    };
}

function mockUserData(
    id: string,
    email: string,
    name: string | null,
    role: UserRole,
    status: UserStatus
) {
    return {
        id,
        email,
        name,
        phone: null,
        role,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function mockAddress(
    id: string,
    userId: string,
    recipient: string,
    phone: string,
    isDefault: boolean
) {
    return {
        id,
        userId,
        recipient,
        phone,
        line1: '123 Main St',
        line2: null,
        city: 'Ho Chi Minh',
        province: null,
        postalCode: null,
        countryCode: 'VN',
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function mockOrder(id: string, orderNumber: string, total: Prisma.Decimal) {
    return {
        id,
        orderNumber,
        userId: 'user1',
        status: 'PENDING_CONFIRMATION' as any,
        paymentStatus: 'UNPAID' as any,
        subtotal: new Prisma.Decimal(450000),
        shippingFee: new Prisma.Decimal(50000),
        total,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function mockOrderItem(
    id: string,
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: Prisma.Decimal,
    totalPrice: Prisma.Decimal
) {
    return {
        id,
        orderId,
        productId,
        variantId: null,
        quantity,
        unitPrice,
        totalPrice,
        snapshotName: 'Product Name',
        snapshotImage: 'https://example.com/img.jpg',
        snapshotOptions: null
    };
}
