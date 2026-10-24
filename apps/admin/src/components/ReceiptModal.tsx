import { useRef } from 'react';
import { X, Printer, Check } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

interface ReceiptModalProps {
  cart: CartItem[];
  total: number;
  packagingFee: number;
  grandTotal: number;
  orderType: string;
  paymentMethod: string;
  orderNumber?: string;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function ReceiptModal({
  cart, total, packagingFee, grandTotal, orderType, paymentMethod, orderNumber, onConfirm, onClose, isSubmitting
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - RR Cafe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 58mm auto; margin: 2mm 2mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      width: 54mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .logo { font-size: 13pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-solid { border-top: 1px solid #000; margin: 4px 0; }
    .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .item-name { flex: 1; padding-right: 4px; word-break: break-word; }
    .item-amount { white-space: nowrap; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; margin: 2px 0; }
    .grand-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt; margin: 3px 0; }
    .small { font-size: 8pt; }
    .thank-you { font-size: 9pt; font-weight: bold; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="logo">RR CAFE</div>
    <div class="small">Victoria Rd, Kulasekharapatnam - 628206</div>
    <div class="small">Ph: 9003244241</div>
  </div>
  <div class="divider"></div>
  <div class="small">Date: ${dateStr}</div>
  <div class="small">Time: ${timeStr}</div>
  ${orderNumber ? `<div class="small">Order#: ${orderNumber}</div>` : ''}
  <div class="small">Type: ${orderType === 'dine_in' ? 'Dine In' : orderType === 'dine_out' ? 'Takeaway' : 'Delivery'}</div>
  <div class="small">Payment: ${paymentMethod === 'cash' ? 'Cash' : 'UPI / QR'}</div>
  <div class="divider-solid"></div>
  <div class="item-row bold small">
    <span>ITEM</span><span>QTY</span><span>AMT</span>
  </div>
  <div class="divider"></div>
  ${cart.map(item => `
  <div style="margin: 3px 0;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <span class="item-name small">${item.name}</span>
      <span class="item-amount small">${item.quantity} x &#8377;${item.price} = &#8377;${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  </div>
  `).join('')}
  <div class="divider"></div>
  <div class="item-row small">
    <span>Items: ${totalItems}</span>
    <span>Subtotal: &#8377;${total.toFixed(2)}</span>
  </div>
  ${packagingFee > 0 ? `<div class="item-row small"><span>Packaging Fee</span><span>&#8377;${packagingFee.toFixed(2)}</span></div>` : ''}
  <div class="divider-solid"></div>
  <div class="grand-row">
    <span>TOTAL</span><span>&#8377;${grandTotal.toFixed(2)}</span>
  </div>
  <div class="divider"></div>
  <div class="center">
    <div class="thank-you">Thank You!</div>
    <div class="small">Visit us again :)</div>
    <div class="small" style="margin-top:4px;">Powered by RR Cafe POS</div>
  </div>
</body>
</html>`;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900 text-lg">Receipt Preview</h3>
            <p className="text-xs text-gray-500 mt-0.5">58mm thermal format</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            ref={receiptRef}
            className="mx-auto bg-white border border-dashed border-gray-300 rounded-lg p-3 shadow-inner"
            style={{
              width: '220px',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '11px',
              lineHeight: '1.4'
            }}
          >
            {/* Receipt Header */}
            <div className="text-center mb-2">
              <p className="font-black text-sm tracking-widest">RR CAFE</p>
              <p className="text-[9px] text-gray-600 leading-tight">Victoria Rd, Kulasekharapatnam</p>
              <p className="text-[9px] text-gray-600">Ph: 9003244241</p>
            </div>
            <div className="border-t border-dashed border-gray-400 my-1.5" />

            {/* Order Info */}
            <div className="text-[9px] text-gray-600 space-y-0.5 mb-1.5">
              <p>Date: {dateStr}</p>
              <p>Time: {timeStr}</p>
              {orderNumber && <p>Order#: {orderNumber}</p>}
              <p>Type: {orderType === 'dine_in' ? 'Dine In' : orderType === 'dine_out' ? 'Takeaway' : 'Delivery'}</p>
              <p>Pay: {paymentMethod === 'cash' ? 'Cash' : 'UPI/QR'}</p>
            </div>
            <div className="border-t border-gray-400 my-1.5" />

            {/* Items */}
            <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-1">
              <span>ITEM</span>
              <span>TOTAL</span>
            </div>
            <div className="border-t border-dashed border-gray-300 mb-1" />
            <div className="space-y-1">
              {cart.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between text-[9px]">
                    <span className="flex-1 pr-1 leading-tight font-medium">{item.name}</span>
                    <span className="font-bold shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <p className="text-[8px] text-gray-400">{item.quantity} × ₹{item.price}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-300 my-1.5" />

            {/* Totals */}
            <div className="space-y-0.5 text-[9px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              {packagingFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Packaging Fee</span>
                  <span>₹{packagingFee.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-400 my-1.5" />
            <div className="flex justify-between font-black text-sm">
              <span>TOTAL</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-gray-300 mt-2 pt-2 text-center">
              <p className="font-bold text-[10px]">Thank You!</p>
              <p className="text-[8px] text-gray-500">Visit us again :)</p>
              <p className="text-[8px] text-gray-400 mt-1">Powered by RR Cafe POS</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25'
            }`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}
