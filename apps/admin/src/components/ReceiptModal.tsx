import { useState, useRef } from 'react';
import { X, Printer, Download, CheckCircle2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toCanvas } from 'html-to-image';
import receiptLogo from '../assets/receipt_logo.png';

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

// Global Bluetooth printer device cache for Web Bluetooth (Laptop Chrome)
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

function getPaymentMethodDisplay(method: string, orderType?: string) {
  const m = (method || '').toLowerCase();
  if (
    m === 'razorpay' ||
    m === 'online' ||
    m === 'upi' ||
    m === 'direct_qr' ||
    orderType === 'delivery'
  ) {
    return 'UPI';
  }
  return 'Cash';
}

export function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dateStr = formatReceiptDate(data.createdAt);
  const timeStr = formatReceiptTime(data.createdAt);
  const orderTypeStr = getOrderTypeDisplay(data.orderType);
  const paymentMethodStr = getPaymentMethodDisplay(data.paymentMethod, data.orderType);
  const formattedOrderId = data.orderId.startsWith('#') ? data.orderId : `#${data.orderId}`;

  // Exact HTML and CSS matching receipt.html with zero styling alterations
  const getPrintHtml = () => {
    const itemsHtml = data.items
      .map(
        item => `
                <tr>
                    <td class="col-item">${item.name}</td>
                    <td class="col-qty">${item.quantity}x ₹${item.price}</td>
                    <td class="col-amt">₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RR Cafe Receipt</title>
<style>
@font-face {
  font-family: 'Courier New';
  src: url('/admin/fonts/cour.ttf') format('truetype'), url('./fonts/cour.ttf') format('truetype'), url('/fonts/cour.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'Courier New';
  src: url('/admin/fonts/courbd.ttf') format('truetype'), url('./fonts/courbd.ttf') format('truetype'), url('/fonts/courbd.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}
* {
  box-sizing: border-box;
}
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  background-color: #e0e0e0;
}
body {
  padding: 20px 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  overflow-y: auto;
}
.receipt-container {
  width: 58mm;
  max-width: 58mm;
  background: #fff;
  padding: 4mm;
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  color: #000;
  line-height: 1.2;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
}
.header {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-bottom: 4px;
}
.header img {
  height: 32px;
  width: 30px;
  object-fit: contain;
}
.title-box {
  height: 29.5px;
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.header-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cafe-name {
  font-size: 12px;
  font-weight: bold;
  margin: 0;
}
.order-id {
  font-size: 7px;
  font-weight: bold;
  margin: 0;
}
.address-box {
  font-size: 5.8px;
  margin: 0;
  word-wrap: break-word;
  text-align: left;
  white-space: nowrap;
  letter-spacing: -0.2px;
}
.divider {
  border-top: 1px dashed #000;
  margin: 4px 0;
  height: 0;
  min-height: 0;
  line-height: 0;
  font-size: 0;
  overflow: hidden;
}
.divider-solid {
  border-top: 2px solid #000;
  margin: 4px 0;
  height: 0;
  min-height: 0;
  line-height: 0;
  font-size: 0;
  overflow: hidden;
}
.meta-details, .summary-row, .total-row {
  display: flex;
  justify-content: space-between;
}
.meta-details {
  font-size: 7.5px;
  margin: 2px 0;
  line-height: 1.3;
}
.meta-details span {
  white-space: nowrap;
}
.summary-row {
  margin-bottom: 2px;
  line-height: 1.3;
}
.item-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  margin: 4px 0;
}
.item-table th, .item-table td {
  padding: 4px 3px;
  vertical-align: top;
  line-height: 1.25;
}
.item-table th {
  border-bottom: 1px dashed #000;
  padding-bottom: 4px;
  text-align: left;
}
.col-item {
  width: 45%;
  word-wrap: break-word;
}
.col-qty {
  width: 30%;
  text-align: left;
}
.col-amt {
  width: 25%;
  text-align: right;
}
.total-row {
  font-size: 14px;
  font-weight: bold;
  margin: 4px 0;
  line-height: 1.3;
}
.footer {
  text-align: center;
  font-size: 11px;
  margin-top: 6px;
}

@page {
  size: 58mm auto;
  margin: 0;
}
@media print {
  html, body {
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
            <img src="${receiptLogo}" alt="RR Cafe Logo">
            <div class="title-box">
                <div class="header-text">
                    <p class="cafe-name">RR Cafe</p>
                    <p class="order-id">${formattedOrderId}</p>
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

  const receiptHtml = getPrintHtml();

  // Capture isolated receipt container from the iframe directly to high-res canvas
  const captureReceiptCanvas = async (): Promise<HTMLCanvasElement> => {
    const iframe = iframeRef.current;
    if (!iframe) throw new Error('Receipt preview frame not ready');

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Receipt document not ready');

    if (doc.fonts) {
      try {
        await doc.fonts.ready;
      } catch {
        // ignore
      }
    }

    const receiptEl = doc.querySelector('.receipt-container') as HTMLElement;
    if (!receiptEl) throw new Error('Receipt container element not found');

    const img = receiptEl.querySelector('img');
    if (img) {
      if (!img.complete) {
        await new Promise(res => {
          img.onload = res;
          img.onerror = res;
        });
      }
      // Inline the logo as a base64 data URI to prevent any CORS/tainting during SVG rasterization
      if (img.naturalWidth && !img.src.startsWith('data:')) {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            img.src = c.toDataURL('image/png');
          }
        } catch (e) {
          console.warn('Could not inline logo to data URL:', e);
        }
      }
    }

    // Reset scroll to top before capture to avoid clipping
    const prevDocScroll = doc.documentElement.scrollTop;
    const prevBodyScroll = doc.body.scrollTop;
    doc.documentElement.scrollTop = 0;
    doc.body.scrollTop = 0;

    try {
      // Primary: Native browser engine rasterization via html-to-image (SVG foreignObject)
      // This produces 100% pixel-perfect layout and exact font metrics matching the screen preview
      try {
        const canvas = await toCanvas(receiptEl, {
          pixelRatio: 3, // Razor-sharp 300+ DPI
          backgroundColor: '#ffffff',
          style: {
            boxShadow: 'none',
            margin: '0',
          },
          skipFonts: true, // Use system Courier New font directly
        });
        return canvas;
      } catch (engineErr) {
        console.warn('Native engine capture failed, falling back to html2canvas:', engineErr);
        const canvas = await html2canvas(receiptEl, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedContainer = clonedDoc.querySelector('.receipt-container') as HTMLElement;
            if (clonedContainer) {
              clonedContainer.style.boxShadow = 'none';
            }
          },
        });
        return canvas;
      }
    } finally {
      doc.documentElement.scrollTop = prevDocScroll;
      doc.body.scrollTop = prevBodyScroll;
    }
  };

  // Convert canvas to standard ESC/POS raster bitmap for 58mm thermal printers (384 dots width)
  const canvasToEscPosRaster = (sourceCanvas: HTMLCanvasElement): Uint8Array => {
    const targetWidth = 384; // Standard 58mm thermal printer dot width (48 bytes per line)
    const scale = targetWidth / sourceCanvas.width;
    const targetHeight = Math.round(sourceCanvas.height * scale);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return new Uint8Array();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imgData.data;

    // Grayscale
    const gray = new Float32Array(targetWidth * targetHeight);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      const a = pixels[idx + 3] / 255;
      const r = pixels[idx] * a + 255 * (1 - a);
      const g = pixels[idx + 1] * a + 255 * (1 - a);
      const b = pixels[idx + 2] * a + 255 * (1 - a);
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // High-contrast binary thresholding: threshold = 210 ensures that fine text strokes and anti-aliased font edges
    // are converted to solid, dark, bold black thermal dots rather than being lost/thinned out, giving high-contrast print quality
    const binary = new Uint8Array(targetWidth * targetHeight);
    const threshold = 210;
    for (let i = 0; i < targetWidth * targetHeight; i++) {
      binary[i] = gray[i] < threshold ? 1 : 0; // 1 = black thermal dot, 0 = white paper
    }

    // Slice in 128-row bands to avoid printer buffer overflow
    const sliceHeight = 128;
    const bytes: number[] = [];

    // ESC @ - Initialize printer
    bytes.push(0x1B, 0x40);
    // ESC 3 0 - Zero line spacing
    bytes.push(0x1B, 0x33, 0x00);

    for (let yStart = 0; yStart < targetHeight; yStart += sliceHeight) {
      const linesInSlice = Math.min(sliceHeight, targetHeight - yStart);

      // GS v 0 0 xL xH yL yH
      const xL = 48; // 384 / 8 = 48 bytes
      const xH = 0;
      const yL = linesInSlice & 0xFF;
      const yH = (linesInSlice >> 8) & 0xFF;

      bytes.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

      for (let y = 0; y < linesInSlice; y++) {
        const row = yStart + y;
        for (let x = 0; x < 384; x += 8) {
          let byte = 0;
          for (let b = 0; b < 8; b++) {
            const pixelIdx = row * 384 + (x + b);
            if (binary[pixelIdx] === 1) {
              byte |= (0x80 >> b);
            }
          }
          bytes.push(byte);
        }
      }
    }

    // ESC 2 - Reset line spacing to default
    bytes.push(0x1B, 0x32);
    // Feed 4 lines so receipt passes tear bar
    bytes.push(0x1B, 0x64, 0x04);
    // Partial/full cut command
    bytes.push(0x1D, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  };

  // Direct Web Bluetooth for Laptop
  const printViaBluetoothWithBytes = async (escPosBytes: Uint8Array): Promise<boolean> => {
    const nav = navigator as any;
    if (!nav.bluetooth) return false;

    let device = cachedBtDevice;
    let writeChar = cachedBtCharacteristic;

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

      cachedBtDevice = device;
      cachedBtCharacteristic = writeChar;
      try {
        localStorage.setItem('rr_last_printer_name', device.name || 'Thermal Printer');
      } catch {
        // ignore
      }
    }

    setPrintStatus('Sending receipt to printer...');
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
    setPrintStatus('Rendering receipt...');

    try {
      const canvas = await captureReceiptCanvas();
      const escPosBytes = canvasToEscPosRaster(canvas);

      // 1. Android APK native Bluetooth SPP direct printing
      const androidPrinter = (window as any).AndroidPrinter;
      if (androidPrinter && typeof androidPrinter.printBluetoothThermal === 'function') {
        setPrintStatus('Printing via Bluetooth...');
        let binary = '';
        for (let i = 0; i < escPosBytes.length; i++) {
          binary += String.fromCharCode(escPosBytes[i]);
        }
        const base64EscPos = btoa(binary);
        androidPrinter.printBluetoothThermal(base64EscPos);
        setIsPrinting(false);
        setPrintStatus(null);
        return;
      }

      // 2. Web Bluetooth on Laptop Chrome
      if ((navigator as any).bluetooth) {
        try {
          const success = await printViaBluetoothWithBytes(escPosBytes);
          if (success) {
            setIsPrinting(false);
            return;
          }
        } catch (btErr: any) {
          console.warn('Bluetooth print skipped or cancelled:', btErr);
          if (btErr.name === 'NotFoundError') {
            setIsPrinting(false);
            setPrintStatus(null);
            return;
          }
        }
      }

      // 3. Fallback: Browser print dialogue
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
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Direct iframe print failed, falling back to temp frame:', err);
      }
    }

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

  // Download PDF with 100% exact dimensions and razor-sharp fidelity
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const canvas = await captureReceiptCanvas();
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

      const fileName = `Receipt-${data.orderId.replace('#', '')}.pdf`;

      // If running inside Android APK, save to Android Downloads directory
      const androidPrinter = (window as any).AndroidPrinter;
      if (androidPrinter && typeof androidPrinter.savePdfToDownloads === 'function') {
        const base64Pdf = pdf.output('datauristring').split(',')[1];
        androidPrinter.savePdfToDownloads(base64Pdf, fileName);
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[80] overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md flex flex-col my-auto max-h-[95vh] overflow-hidden border border-gray-100">
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
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {printStatus && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 text-xs font-semibold text-center border-b border-blue-100 animate-pulse">
            {printStatus}
          </div>
        )}

        {/* Receipt Preview Area - Isolated iframe rendering exact receipt.html with zero outer pollution */}
        <div className="flex-1 overflow-hidden bg-[#e0e0e0] flex justify-center items-stretch min-h-[440px] relative">
          <iframe
            ref={iframeRef}
            srcDoc={receiptHtml}
            title="Receipt Preview"
            className="w-full h-full border-none block"
            style={{ width: '100%', height: '100%', minHeight: '440px', border: 'none' }}
          />
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
