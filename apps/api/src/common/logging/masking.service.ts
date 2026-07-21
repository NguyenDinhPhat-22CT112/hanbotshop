import { Injectable } from '@nestjs/common';

/**
 * Service responsible for masking sensitive data in logs
 * Implements recursive traversal and pattern-based masking
 */
@Injectable()
export class MaskingService {
    private readonly SENSITIVE_FIELD_NAMES = [
        'password',
        'pwd',
        'token',
        'apikey',
        'authorization',
        'secret',
        'creditcard',
        'cardnumber',
        'cvv',
    ];

    private readonly CREDIT_CARD_PATTERN = /\b\d{13,19}\b/g;
    private readonly MASKED_VALUE = '***MASKED***';

    /**
     * Mask sensitive data in any data structure
     * @param data - Data to mask (can be object, array, string, or primitive)
     * @returns Masked copy of the data
     */
    mask(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data === 'string') {
            return this.maskCreditCardPattern(data);
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.mask(item));
        }

        if (typeof data === 'object') {
            const masked: any = {};
            for (const [key, value] of Object.entries(data)) {
                if (this.isSensitiveField(key)) {
                    masked[key] = this.MASKED_VALUE;
                } else {
                    masked[key] = this.mask(value);
                }
            }
            return masked;
        }

        return data;
    }

    /**
     * Check if a field name indicates sensitive data
     * @param fieldName - Name of the field to check
     * @returns True if field name matches sensitive patterns
     */
    private isSensitiveField(fieldName: string): boolean {
        const lowerField = fieldName.toLowerCase();
        return this.SENSITIVE_FIELD_NAMES.some((sensitive) =>
            lowerField.includes(sensitive),
        );
    }

    /**
     * Mask credit card numbers in strings
     * Preserves last 4 digits
     * @param value - String that may contain credit card numbers
     * @returns String with masked credit card numbers
     */
    private maskCreditCardPattern(value: string): string {
        return value.replace(this.CREDIT_CARD_PATTERN, (match) => {
            const lastFour = match.slice(-4);
            const masked = '*'.repeat(match.length - 4);
            return `${masked}${lastFour}`;
        });
    }
}
