import { X, Banknote, Smartphone } from 'lucide-react';

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (method: string) => void;
}

export function PaymentMethodModal({ isOpen, onClose, onSelect }: PaymentMethodModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Paid Via</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-3">
                    <p className="text-sm text-gray-500 mb-4">How was this payment received?</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => onSelect('bank_transfer')}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                        >
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-white transition-colors">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-gray-900">Bank Transfer</span>
                        </button>
                        <button
                            onClick={() => onSelect('cash')}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                        >
                            <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-white transition-colors">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-gray-900">Cash</span>
                        </button>
                        <button
                            onClick={() => onSelect('upi')}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                        >
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-white transition-colors">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-gray-900">UPI</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
