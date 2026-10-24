import { useRef, useState } from 'react';
import { X, Printer, Download, CheckCircle2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import rrcafeLogo from '../assets/rrcafe-logo.svg';

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  orderId: string;
  createdAt: string;
  orderType: string;
  paymentMethod: string;
  items: ReceiptItem[];
  total: number;
  packagingFee: number;
  grandTotal: number;
  totalItems: number;
}

interface ReceiptModalProps {
  data: ReceiptData;
  onClose: () => void;
}

// Global Bluetooth printer device cache so user only selects once per session
let cachedBtDevice: any = null;
let cachedBtCharacteristic: any = null;

function formatReceiptDate(isoStr: string) {
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatReceiptTime(isoStr: string) {
  const d = new Date(isoStr);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes}${ampm}`;
}

function getOrderTypeDisplay(type: string) {
  if (type === 'dine_out') return 'Takeaway';
  if (type === 'delivery') return 'Delivery';
  return 'Dine In';
}

function getPaymentMethodDisplay(method: string) {
  if (method === 'direct_qr') return 'UPI / QR';
  return 'Cash';
}

export function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const dateStr = formatReceiptDate(data.createdAt);
  const timeStr = formatReceiptTime(data.createdAt);
  const orderTypeStr = getOrderTypeDisplay(data.orderType);
  const paymentMethodStr = getPaymentMethodDisplay(data.paymentMethod);

  // High-accuracy 58mm PDF generator preserving exact alignment
  const generatePdf = async () => {
    if (!receiptRef.current) return null;
    const element = receiptRef.current;

    // Use html2canvas with exact fixed width cloning for pixel-perfect column alignment
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const target = clonedDoc.querySelector('.receipt-container') as HTMLElement;
        if (target) {
          target.style.width = '220px';
          target.style.maxWidth = '220px';
          target.style.boxShadow = 'none';
          target.style.margin = '0 auto';
          target.style.padding = '15px';
        }
      },
    });

    const pdfWidthMm = 58;
    const pdfHeightMm = (canvas.height * pdfWidthMm) / canvas.width;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');
    return pdf;
  };

  // Generate raw ESC/POS bytes for thermal printers
  const generateEscPosData = () => {
    const encoder = new TextEncoder();
    const bytes: number[] = [];

    const append = (str: string) => {
      const encoded = encoder.encode(str);
      for (let i = 0; i < encoded.length; i++) bytes.push(encoded[i]);
    };

    // ESC @ - Init
    bytes.push(0x1b, 0x40);

    // ESC a 1 - Center align
    bytes.push(0x1b, 0x61, 0x01);
    // Double height/width for title
    bytes.push(0x1d, 0x21, 0x11);
    append('RR CAFE\n');
    bytes.push(0x1d, 0x21, 0x00);
    append('Victoria Rd, Kulasekharapatnam - 628206\n');
    append('Phone no: 9003244241\n');
    append('--------------------------------\n');

    // ESC a 0 - Left align
    bytes.push(0x1b, 0x61, 0x00);
    append(`Order: ${data.orderId}\n`);
    append(`Date: ${dateStr}  ${timeStr}\n`);
    append(`Type: ${orderTypeStr} | ${paymentMethodStr}\n`);
    append('--------------------------------\n');
    append('ITEM              QTY        AMT\n');
    append('--------------------------------\n');

    data.items.forEach(item => {
      const name = item.name.length > 14 ? item.name.substring(0, 14) : item.name.padEnd(14);
      const qty = `${item.quantity}x`.padStart(5);
      const amt = `Rs.${(item.price * item.quantity).toFixed(2)}`.padStart(11);
      append(`${name}${qty}${amt}\n`);
    });

    append('--------------------------------\n');
    append(`Items: ${data.totalItems}`.padEnd(16) + `Subtotal: Rs.${data.total.toFixed(2)}`.padStart(16) + '\n');
    if (data.packagingFee > 0) {
      append(`Packaging Fee`.padEnd(16) + `Rs.${data.packagingFee.toFixed(2)}`.padStart(16) + '\n');
    }
    append('================================\n');

    // ESC a 1 - Center
    bytes.push(0x1b, 0x61, 0x01);
    bytes.push(0x1d, 0x21, 0x01);
    append(`TOTAL: Rs.${data.grandTotal.toFixed(2)}\n`);
    bytes.push(0x1d, 0x21, 0x00);
    append('================================\n');
    append('Thank You! Visit us again :)\n\n\n\n');

    // GS V 66 0 - Paper cut
    bytes.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  };

  // Direct Bluetooth Printer sender
  const printViaBluetooth = async (): Promise<boolean> => {
    const nav = navigator as any;
    if (!nav.bluetooth) return false;

    let device = cachedBtDevice;
    let writeChar = cachedBtCharacteristic;

    // Check if cached device is still connected
    if (device && device.gatt && !device.gatt.connected) {
      try {
        setPrintStatus('Reconnecting to printer...');
        const server = await device.gatt.connect();
        writeChar = await findWritableCharacteristic(server);
        cachedBtCharacteristic = writeChar;
      } catch {
        device = null;
        writeChar = null;
        cachedBtDevice = null;
        cachedBtCharacteristic = null;
      }
    }

    // If no active cached device, request one
    if (!device || !writeChar) {
      setPrintStatus('Selecting Bluetooth printer...');
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '0000ff00-0000-1000-8000-00805f9b34fb',
        ],
      });

      setPrintStatus('Connecting to printer...');
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');

      writeChar = await findWritableCharacteristic(server);
      if (!writeChar) throw new Error('No writable characteristic found');

      // Cache device and characteristic for subsequent one-click prints
      cachedBtDevice = device;
      cachedBtCharacteristic = writeChar;
      try {
        localStorage.setItem('rr_last_printer_name', device.name || 'Thermal Printer');
      } catch {
        // ignore
      }
    }

    setPrintStatus('Sending receipt to printer...');
    const escPosBytes = generateEscPosData();
    const chunkSize = 100;
    for (let i = 0; i < escPosBytes.length; i += chunkSize) {
      const chunk = escPosBytes.slice(i, i + chunkSize);
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
    }

    setPrintStatus('Printed successfully!');
    setTimeout(() => setPrintStatus(null), 2500);
    return true;
  };

  const findWritableCharacteristic = async (server: any) => {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            return c;
          }
        }
      } catch {
        // continue
      }
    }
    return null;
  };

  // Unified Print Action
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus('Preparing print...');

    try {
      // 1. If Web Bluetooth is available, try Bluetooth direct print first
      if ((navigator as any).bluetooth) {
        try {
          const success = await printViaBluetooth();
          if (success) {
            setIsPrinting(false);
            return;
          }
        } catch (btErr: any) {
          console.warn('Bluetooth print skipped or cancelled:', btErr);
          // If user cancelled device picker, don't force fallback immediately unless requested
          if (btErr.name === 'NotFoundError') {
            setIsPrinting(false);
            setPrintStatus(null);
            return;
          }
        }
      }

      // 2. If inside Android Capacitor APK, use native Android PrintManager bridge
      const androidPrinter = (window as any).AndroidPrinter;
      if (androidPrinter && typeof androidPrinter.printReceiptHtml === 'function') {
        setPrintStatus('Opening Android print spooler...');
        androidPrinter.printReceiptHtml(getPrintHtml());
        setIsPrinting(false);
        setPrintStatus(null);
        return;
      }

      // 3. Fallback: browser isolated print iframe with exact dimensions
      setPrintStatus('Opening print dialogue...');
      printViaIframe();
    } catch (err: any) {
      console.error('Print error:', err);
      setPrintStatus('Print error: ' + (err.message || 'Unknown error'));
      setTimeout(() => setPrintStatus(null), 3000);
    } finally {
      setIsPrinting(false);
    }
  };

  const printViaIframe = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(getPrintHtml());
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print iframe error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 300);
    };
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = await generatePdf();
      if (pdf) {
        pdf.save(`Receipt-${data.orderId.replace('#', '')}.pdf`);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Exact HTML and CSS from user's receipt.html
  const getPrintHtml = () => {
    const itemsHtml = data.items
      .map(
        item => `
      <tr>
        <td class="col-item">${item.name}</td>
        <td class="col-qty">${item.quantity}x ₹${item.price}</td>
        <td class="col-amt">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RR Cafe Receipt</title>
<style>
body{margin:0;padding:20px;display:flex;justify-content:center;background-color:#e0e0e0}
.receipt-container{width:58mm;max-width:58mm;background:#fff;padding:4mm;box-sizing:border-box;font-family:'Courier New',Courier,monospace;font-size:10px;color:#000;line-height:1.2}
.header{display:flex;align-items:center;gap:1px;margin-bottom:4px}
.header img{height:32px; width:30px; object-fit:contain}
.title-box{height:29.5px;min-width:0;flex:1;display:flex;flex-direction:column;justify-content:space-between}
.header-text{display:flex;justify-content:space-between;align-items:center}
.cafe-name{font-size:12px;font-weight:bold;margin:0}
.order-id{font-size:7px;font-weight:bold;margin:0}
.address-box{font-size:6.5px;margin:0;word-wrap:break-word;text-align:left}
.divider{border-top:1px dashed #000;margin:4px 0}
.divider-solid{border-top:2px solid #000;margin:4px 0}
.meta-details,.summary-row,.total-row{display:flex;justify-content:space-between}
.meta-details{font-size:8px;margin:2px 0}
.summary-row{margin-bottom:2px}
.item-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:4px 0}
.item-table th,.item-table td{padding:4px 3px;vertical-align:top}
.item-table th{border-bottom:1px dashed #000;padding-bottom:4px;text-align:left}
.col-item{width:45%;word-wrap:break-word}
.col-qty{width:30%;text-align:left}
.col-amt{width:25%;text-align:right}
.total-row{font-size:14px;font-weight:bold;margin:4px 0}
.footer{text-align:center;font-size:11px;margin-top:6px}

@page {
  size: 58mm auto;
  margin: 0;
}
@media print {
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    display: block !important;
  }
  .receipt-container {
    width: 58mm !important;
    max-width: 58mm !important;
    padding: 4mm !important;
    margin: 0 auto !important;
    box-shadow: none !important;
  }
}
</style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <img src="${rrcafeLogo}" alt="RR Cafe Logo">
            <div class="title-box">
                <div class="header-text">
                    <p class="cafe-name">RR Cafe</p>
                    <p class="order-id">${data.orderId}</p>
                </div>
                <p class="address-box">Victoria Rd, Kulasekharapatnam - 628206<br>Phone no: 9003244241</p>
            </div>
        </div>

        <div class="divider"></div>
        <div class="meta-details">
            <span>${dateStr}</span>
            <span>${timeStr}</span>
            <span>${orderTypeStr}</span>
            <span>${paymentMethodStr}</span>
        </div>

        <div class="divider"></div>
        <table class="item-table">
            <thead>
                <tr>
                    <th class="col-item">ITEM</th>
                    <th style="text-align:center;" class="col-qty">QTY</th>
                    <th style="text-align:right;" class="col-amt">AMT</th>
                </tr>
            </thead>

            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="divider"></div>
        <div class="summary-row">
            <span>Items: ${data.totalItems}</span>
            <span>Subtotal: ₹${data.total.toFixed(2)}</span>
        </div>
        ${
          data.packagingFee > 0
            ? `
        <div class="summary-row">
            <span>Packaging Fee</span>
            <span>₹${data.packagingFee.toFixed(2)}</span>
        </div>`
            : ''
        }

        <div class="divider-solid"></div>
        <div class="total-row">
            <span>TOTAL</span>
            <span>₹${data.grandTotal.toFixed(2)}</span>
        </div>

        <div class="divider-solid"></div>
        <div class="footer">
            Thank You! Visit us again :)
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[80] overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col my-auto max-h-[95vh] overflow-hidden border border-gray-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base leading-tight">Order Confirmed</h3>
              <p className="text-xs text-gray-500 font-semibold">{data.orderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message (e.g. connecting/printing feedback) */}
        {printStatus && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 text-xs font-semibold text-center border-b border-blue-100 animate-pulse">
            {printStatus}
          </div>
        )}

        {/* Receipt Preview Area - Exact receipt.html styling */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#e0e0e0] flex justify-center items-start">
          <div
            ref={receiptRef}
            className="receipt-container"
            style={{
              width: '58mm',
              maxWidth: '58mm',
              backgroundColor: '#fff',
              padding: '4mm',
              boxSizing: 'border-box',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '10px',
              color: '#000',
              lineHeight: 1.2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1px', marginBottom: '4px' }}>
              <img
                src={rrcafeLogo}
                alt="RR Cafe Logo"
                style={{ height: '32px', width: '30px', objectFit: 'contain' }}
              />
              <div
                style={{
                  height: '29.5px',
                  minWidth: 0,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>RR Cafe</p>
                  <p style={{ fontSize: '7px', fontWeight: 'bold', margin: 0 }}>{data.orderId}</p>
                </div>
                <p style={{ fontSize: '6.5px', margin: 0, wordWrap: 'break-word', textAlign: 'left' }}>
                  Victoria Rd, Kulasekharapatnam - 628206<br />Phone no: 9003244241
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

            {/* Meta Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', margin: '2px 0' }}>
              <span>{dateStr}</span>
              <span>{timeStr}</span>
              <span>{orderTypeStr}</span>
              <span>{paymentMethodStr}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

            {/* Item Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', margin: '4px 0' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: '45%',
                      wordWrap: 'break-word',
                      borderBottom: '1px dashed #000',
                      padding: '4px 3px',
                      paddingBottom: '4px',
                      textAlign: 'left',
                    }}
                  >
                    ITEM
                  </th>
                  <th
                    style={{
                      width: '30%',
                      borderBottom: '1px dashed #000',
                      padding: '4px 3px',
                      paddingBottom: '4px',
                      textAlign: 'center',
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      width: '25%',
                      borderBottom: '1px dashed #000',
                      padding: '4px 3px',
                      paddingBottom: '4px',
                      textAlign: 'right',
                    }}
                  >
                    AMT
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(item => (
                  <tr key={item.id}>
                    <td style={{ width: '45%', wordWrap: 'break-word', padding: '4px 3px', verticalAlign: 'top' }}>
                      {item.name}
                    </td>
                    <td style={{ width: '30%', textAlign: 'left', padding: '4px 3px', verticalAlign: 'top' }}>
                      {item.quantity}x ₹{item.price}
                    </td>
                    <td style={{ width: '25%', textAlign: 'right', padding: '4px 3px', verticalAlign: 'top' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Items: {data.totalItems}</span>
              <span>Subtotal: ₹{data.total.toFixed(2)}</span>
            </div>
            {data.packagingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Packaging Fee</span>
                <span>₹{data.packagingFee.toFixed(2)}</span>
              </div>
            )}

            <div style={{ borderTop: '2px solid #000', margin: '4px 0' }}></div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', margin: '4px 0' }}>
              <span>TOTAL</span>
              <span>₹{data.grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '4px 0' }}></div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px' }}>
              Thank You! Visit us again :)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-2.5 shrink-0">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-75"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 active:scale-[0.98] transition-all disabled:opacity-75"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
