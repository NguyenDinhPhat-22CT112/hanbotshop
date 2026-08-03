'use client';

type CheckoutProgressProps = {
    currentStep: 'cart' | 'shipping' | 'payment' | 'complete';
};

const steps = [
    { key: 'cart' as const, label: 'Giỏ hàng' },
    { key: 'shipping' as const, label: 'Vận chuyển' },
    { key: 'payment' as const, label: 'Thanh toán' },
    { key: 'complete' as const, label: 'Hoàn tất' }
];

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
    const currentIndex = steps.findIndex((step) => step.key === currentStep);

    return (
        <div className="checkout-progress">
            <div className="checkout-progress-track">
                {steps.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    const stepNumber = index + 1;

                    return (
                        <div
                            key={step.key}
                            className={`checkout-progress-step ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
                        >
                            <div className="checkout-progress-indicator">
                                {isCompleted ? (
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <span>{stepNumber}</span>
                                )}
                            </div>
                            <span className="checkout-progress-label">{step.label}</span>
                            {index < steps.length - 1 && <div className="checkout-progress-connector" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
