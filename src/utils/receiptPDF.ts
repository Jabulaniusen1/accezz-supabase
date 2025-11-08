import jsPDF from 'jspdf';

interface ReceiptData {
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  ticketType: string;
  price: number;
  currency: string;
  qrCodeUrl?: string;
  fullName: string;
  orderId: string;
  ticketCode?: string;
  ticketId?: string;
  isVirtual?: boolean;
  virtualAccessLink?: string;
  virtualPlatform?: string;
  virtualMeetingId?: string;
}

/**
 * Download an image from a URL and convert to base64 data URL
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    // Convert to base64 data URL for jsPDF
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    // Determine content type from response or default to PNG
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    // Return empty string if image fetch fails - PDF will generate without QR code
    return '';
  }
}

/**
 * Generate a receipt PDF from ticket data
 * This is a server-side function that can be used in API routes
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // Top border accent (matching site design)
  doc.setFillColor(245, 69, 2);
  doc.rect(0, 0, 210, 4, 'F');

  const pageWidth = 210;
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let currentY = 25;

  // Event Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(29, 29, 29);
  const title = data.eventTitle || 'Event';
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, leftMargin, currentY);
  currentY += titleLines.length * 8 + 20;

  // Event Details Section
  const sectionSpacing = 12;
  let yPos = currentY;

  // Date section
  if (data.eventDate) {
    const iconSize = 6;
    const iconBgY = yPos - 2;

    doc.setFillColor(255, 235, 230);
    doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('Date', leftMargin + iconSize + 4, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(29, 29, 29);
    // eventDate might already be formatted as a string from the API, or could be an ISO date
    let dateText = 'TBD';
    if (data.eventDate) {
      try {
        // Try to parse if it's an ISO date string
        const date = new Date(data.eventDate);
        if (!isNaN(date.getTime())) {
          dateText = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } else {
          // If parsing fails, assume it's already formatted
          dateText = data.eventDate;
        }
      } catch {
        // If anything fails, use the value as-is
        dateText = data.eventDate;
      }
    }
    const dateLines = doc.splitTextToSize(dateText, contentWidth - iconSize - 4);
    doc.text(dateLines, leftMargin + iconSize + 4, yPos + 6);
    yPos += Math.max(dateLines.length * 6, 12) + sectionSpacing;
  }

  // Time section
  if (data.eventTime) {
    const iconSize = 6;
    const iconBgY = yPos - 2;

    doc.setFillColor(255, 235, 230);
    doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('Time', leftMargin + iconSize + 4, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(29, 29, 29);
    const timeLines = doc.splitTextToSize(data.eventTime, contentWidth - iconSize - 4);
    doc.text(timeLines, leftMargin + iconSize + 4, yPos + 6);
    yPos += Math.max(timeLines.length * 6, 12) + sectionSpacing;
  }

  // Venue section
  if (data.venue) {
    const iconSize = 6;
    const iconBgY = yPos - 2;

    doc.setFillColor(255, 235, 230);
    doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('Venue', leftMargin + iconSize + 4, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(29, 29, 29);
    const venueLines = doc.splitTextToSize(data.venue, contentWidth - iconSize - 4);
    doc.text(venueLines, leftMargin + iconSize + 4, yPos + 6);
    yPos += Math.max(venueLines.length * 6, 12) + sectionSpacing;
  }

  // Ticket Type section
  const ticketBoxY = yPos;
  const ticketBoxHeight = 20;
  const ticketBoxPadding = 5;

  doc.setFillColor(255, 235, 230);
  doc.roundedRect(leftMargin, ticketBoxY, contentWidth, ticketBoxHeight, 2, 2, 'F');

  doc.setDrawColor(245, 200, 190);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftMargin, ticketBoxY, contentWidth, ticketBoxHeight, 2, 2, 'S');

  doc.setFillColor(255, 220, 210);
  doc.roundedRect(
    leftMargin + ticketBoxPadding,
    ticketBoxY + ticketBoxPadding,
    5,
    5,
    1,
    1,
    'F'
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Ticket Type', leftMargin + ticketBoxPadding + 7, ticketBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(245, 69, 2);
  const ticketTypeLines = doc.splitTextToSize(data.ticketType, contentWidth - 70);
  doc.text(ticketTypeLines, leftMargin + ticketBoxPadding + 7, ticketBoxY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Price', leftMargin + contentWidth - 50, ticketBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(245, 69, 2);
  doc.text(`${data.currency} ${data.price}`, leftMargin + contentWidth - 50, ticketBoxY + 14);

  yPos += ticketBoxHeight + 25;

  const isVirtualEvent = Boolean(data.isVirtual);

  if (isVirtualEvent) {
    const formatPlatform = (value?: string) => {
      if (!value) return 'Online Session';
      return value
        .split(/[-_]/g)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(245, 69, 2);
    doc.text('Virtual Access Details', leftMargin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('Platform', leftMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(29, 29, 29);
    doc.text(formatPlatform(data.virtualPlatform), leftMargin, yPos + 6);
    yPos += 14;

    if (data.virtualMeetingId) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(128, 128, 128);
      doc.text('Meeting ID', leftMargin, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(29, 29, 29);
      doc.text(data.virtualMeetingId, leftMargin, yPos + 6);
      yPos += 14;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('Access Link', leftMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    const accessText = data.virtualAccessLink || "We've emailed your access link. Check your inbox for instructions.";
    const accessLines = doc.splitTextToSize(accessText, contentWidth);
    doc.setTextColor(59, 130, 246);
    doc.text(accessLines, leftMargin, yPos + 6);
    doc.setTextColor(29, 29, 29);
    yPos += Math.max(accessLines.length * 6, 12) + 20;
  } else {
    let qrCodeBase64: string | null = null;
  
    if (data.qrCodeUrl) {
      try {
        qrCodeBase64 = await fetchImageAsBase64(data.qrCodeUrl);
      } catch (error) {
        console.error('Error fetching QR code from URL:', error);
      }
    }
  
    if (!qrCodeBase64 && (data.ticketCode || data.ticketId)) {
      try {
        const qrcode = await import('qrcode');
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const ticketId = data.ticketId || data.orderId;
        const ticketCode = data.ticketCode || data.orderId;
        const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticketId}&signature=${ticketCode}`;
        qrCodeBase64 = await qrcode.default.toDataURL(validateUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  
    if (qrCodeBase64) {
      const qrSize = 70;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = yPos;
  
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 2, 2, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 2, 2, 'S');
  
      doc.addImage(qrCodeBase64, 'PNG', qrX, qrY, qrSize, qrSize);
  
      yPos += qrSize + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      const qrLabel = 'Present this QR code at the event entrance for verification';
      const qrLabelLines = doc.splitTextToSize(qrLabel, contentWidth);
      doc.text(qrLabelLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += qrLabelLines.length * 5 + 15;
    }
  }

  // Order Information
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`Order ID: ${data.orderId}`, leftMargin, yPos);
  yPos += 6;
  doc.text(`Purchased by: ${data.fullName}`, leftMargin, yPos);
  yPos += 15;

  // Powered by Accezz section
  const poweredByY = Math.min(280, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Powered by', pageWidth / 2, poweredByY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 69, 2);
  doc.text('Accezz', pageWidth / 2, poweredByY + 6, { align: 'center' });

  // Generate PDF as buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

