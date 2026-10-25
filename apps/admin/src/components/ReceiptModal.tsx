import { useState, useRef, useEffect } from 'react';
import { X, Printer, Download, CheckCircle2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import rrcafeLogo from '../assets/rrcafe-logo.png';

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

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [previewLayout, setPreviewLayout] = useState<{
    scale: number;
    width: number;
    height: number;
  }>({ scale: 1.25, width: 274, height: 450 });

  const dateStr = formatReceiptDate(data.createdAt);
  const timeStr = formatReceiptTime(data.createdAt);
  const orderTypeStr = getOrderTypeDisplay(data.orderType);
  const paymentMethodStr = getPaymentMethodDisplay(data.paymentMethod, data.orderType);

  useEffect(() => {
    const updateLayout = () => {
      if (!receiptRef.current || !previewContainerRef.current) return;
      const containerW = previewContainerRef.current.clientWidth || 320;
      const naturalW = receiptRef.current.offsetWidth || 219;
      const naturalH = receiptRef.current.offsetHeight || 400;

      // Fit ~82% of container width, clamped between 1.0 and 1.3
      const targetW = containerW * 0.82;
      const calculatedScale = Math.min(1.3, Math.max(1.0, targetW / naturalW));

      setPreviewLayout({
        scale: calculatedScale,
        width: Math.round(naturalW * calculatedScale),
        height: Math.round(naturalH * calculatedScale),
      });
    };

    updateLayout();
    const timer = setTimeout(updateLayout, 100);
    window.addEventListener('resize', updateLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLayout);
    };
  }, [data]);

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
* { box-sizing: border-box; }
body{margin:0;padding:20px;display:flex;justify-content:center;background-color:#e0e0e0;-webkit-text-size-adjust:100%;text-size-adjust:100%;}
.receipt-container{width:58mm;max-width:58mm;background:#fff;padding:4mm;font-family:'Courier New',Courier,monospace;font-size:10px;color:#000;line-height:1.25}
.header{display:flex;align-items:flex-start;gap:4px;margin-bottom:4px}
.header img{height:32px; width:32px; object-fit:contain; flex-shrink:0;}
.title-box{flex:1;min-width:0;}
.header-text{display:flex;justify-content:space-between;align-items:baseline}
.cafe-name{font-size:13px;font-weight:bold;margin:0;line-height:1.2}
.order-id{font-size:8px;font-weight:bold;margin:0;line-height:1.2}
.address-box{font-size:7.5px;margin:2px 0 0 0;word-break:break-word;text-align:left;line-height:1.25}
.meta-details{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:3px 0;margin:4px 0;display:flex;justify-content:space-between;font-size:8px}
.item-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:4px 0}
.item-table th,.item-table td{padding:3px 2px;vertical-align:top;font-size:9px}
.item-table th{border-bottom:1px dashed #000;text-align:left}
.col-item{width:45%;word-break:break-word}
.col-qty{width:30%;text-align:left}
.col-amt{width:25%;text-align:right}
.summary-section{border-top:1px dashed #000;padding-top:4px;margin-top:4px;font-size:9px}
.summary-row{display:flex;justify-content:space-between;margin-bottom:2px}
.total-row{border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;margin:4px 0;display:flex;justify-content:space-between;font-size:14px;font-weight:bold}
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

        <div class="meta-details">
            <span>${dateStr}</span>
            <span>${timeStr}</span>
            <span>${orderTypeStr}</span>
            <span>${paymentMethodStr}</span>
        </div>

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

        <div class="summary-section">
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
        </div>

        <div class="total-row">
            <span>TOTAL</span>
            <span>₹${data.grandTotal.toFixed(2)}</span>
        </div>

        <div class="footer">
            Thank You! Visit us again :)
        </div>
    </div>
</body>
</html>`;
  };

  // Capture un-transformed receipt element to high-res canvas (scale: 3 for 300+ DPI)
  const captureReceiptCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!receiptRef.current) throw new Error('Receipt preview element not ready');

    const staging = document.createElement('div');
    staging.style.position = 'fixed';
    staging.style.left = '-9999px';
    staging.style.top = '0';
    staging.style.width = '58mm';
    staging.style.backgroundColor = '#ffffff';
    staging.style.zIndex = '-9999';
    staging.style.pointerEvents = 'none';

    const clone = receiptRef.current.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.width = '58mm';
    clone.style.maxWidth = '58mm';
    clone.style.minWidth = '58mm';

    staging.appendChild(clone);
    document.body.appendChild(staging);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      const img = clone.querySelector('img');
      if (img && !img.complete) {
        await new Promise(res => {
          img.onload = res;
          img.onerror = res;
        });
      }

      const canvas = await html2canvas(clone, {
        scale: 3, // Razor-sharp 300+ DPI
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 384,
      });

      return canvas;
    } finally {
      if (document.body.contains(staging)) {
        document.body.removeChild(staging);
      }
    }
  };

  // Convert canvas to standard ESC/POS raster bitmap for 58mm thermal printers (384 dots width)
  const canvasToEscPosRaster = (sourceCanvas: HTMLCanvasElement): Uint8Array => {
    const targetWidth = 384; // Standard 58mm thermal printer dot width (48 bytes per line)
    const widthBytes = targetWidth / 8; // 48 bytes
    const scale = targetWidth / sourceCanvas.width;
    const targetHeight = Math.round(sourceCanvas.height * scale);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return new Uint8Array();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
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

    // Clean binary thresholding for solid, dark, razor-sharp text and lines (no scattered dots)
    const binary = new Uint8Array(targetWidth * targetHeight);
    const threshold = 195; // Anything darker than light gray is solid black
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
      bytes.push(
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
        linesInSlice & 0xFF, (linesInSlice >> 8) & 0xFF
      );

      for (let y = 0; y < linesInSlice; y++) {
        const currentY = yStart + y;
        for (let bx = 0; bx < widthBytes; bx++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = bx * 8 + bit;
            if (binary[currentY * targetWidth + x] === 1) {
              byteVal |= (0x80 >> bit);
            }
          }
          bytes.push(byteVal);
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

      // 3. Fallback: Browser isolated print dialogue
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
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800"
            title="Close"
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

        {/* Receipt Preview Area - Scaled responsively to fit 80% of popup without modifying 58mm base size */}
        <div ref={previewContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#e8e6e1] flex flex-col items-center">
          <div className="w-full flex justify-center py-2">
            <div
              style={{
                width: `${previewLayout.width}px`,
                height: `${previewLayout.height}px`,
                position: 'relative',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                backgroundColor: '#ffffff',
              }}
            >
              <div
                style={{
                  width: '58mm',
                  transform: `scale(${previewLayout.scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  ref={receiptRef}
                  className="receipt-container"
                  style={{
                    width: '58mm',
                    minWidth: '58mm',
                    maxWidth: '58mm',
                    backgroundColor: '#ffffff',
                    padding: '4mm',
                    boxSizing: 'border-box',
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: '10px',
                    color: '#000',
                    lineHeight: 1.25,
                    WebkitTextSizeAdjust: '100%',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '4px' }}>
                    <img
                      src={rrcafeLogo}
                      alt="RR Cafe Logo"
                      style={{ height: '32px', width: '32px', objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>RR Cafe</p>
                        <p style={{ fontSize: '8px', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>{data.orderId}</p>
                      </div>
                      <p style={{ fontSize: '7.5px', margin: '2px 0 0 0', wordBreak: 'break-word', textAlign: 'left', lineHeight: 1.25 }}>
                        Victoria Rd, Kulasekharapatnam - 628206<br />Phone no: 9003244241
                      </p>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0', margin: '4px 0', display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                    <span>{dateStr}</span>
                    <span>{timeStr}</span>
                    <span>{orderTypeStr}</span>
                    <span>{paymentMethodStr}</span>
                  </div>

                  {/* Item Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', margin: '4px 0' }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            width: '45%',
                            wordBreak: 'break-word',
                            borderBottom: '1px dashed #000',
                            padding: '3px 2px',
                            textAlign: 'left',
                            fontSize: '9px',
                          }}
                        >
                          ITEM
                        </th>
                        <th
                          style={{
                            width: '30%',
                            borderBottom: '1px dashed #000',
                            padding: '3px 2px',
                            textAlign: 'center',
                            fontSize: '9px',
                          }}
                        >
                          QTY
                        </th>
                        <th
                          style={{
                            width: '25%',
                            borderBottom: '1px dashed #000',
                            padding: '3px 2px',
                            textAlign: 'right',
                            fontSize: '9px',
                          }}
                        >
                          AMT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map(item => (
                        <tr key={item.id}>
                          <td style={{ width: '45%', wordBreak: 'break-word', padding: '3px 2px', verticalAlign: 'top', fontSize: '9px' }}>
                            {item.name}
                          </td>
                          <td style={{ width: '30%', textAlign: 'left', padding: '3px 2px', verticalAlign: 'top', fontSize: '9px' }}>
                            {item.quantity}x ₹{item.price}
                          </td>
                          <td style={{ width: '25%', textAlign: 'right', padding: '3px 2px', verticalAlign: 'top', fontSize: '9px' }}>
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', marginTop: '4px', fontSize: '9px' }}>
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
                  </div>

                  {/* Total */}
                  <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0', margin: '4px 0', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>TOTAL</span>
                    <span>₹{data.grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Footer */}
                  <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px' }}>
                    Thank You! Visit us again :)
                  </div>
                </div>
              </div>
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
