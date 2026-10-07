const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const ApiError = require("../utils/apiError");
const { PAYMENT_STATUS } = require("../config/constants");

/**
 * ============================================================================
 * INVOICE SERVICE (Automated PDF Generation & Binary Streaming Engine)
 * ============================================================================
 *
 * Yeh service Hotel reservations ke liye professional, printable PDF invoices
 * on-the-fly (real-time) generate karti hai.
 *
 * Key Architectural Highlights:
 * 1. Zero-Disk Footprint (Stream Architecture):
 *    PDF ko server ki hard disk par save karne ke bajaye direct HTTP response
 *    stream (`res`) me pipe kiya jata hai (`doc.pipe(outputStream)`).
 * 2. High Performance:
 *    Lightweight `PDFKit` vector drawing engine use karta hai jo memory efficient hai.
 * 3. Authoritative Data Integrity:
 *    Database se verified booking rates, nights, aur payments ko fetch karke
 *    exact financial calculations display karta hai.
 */
class InvoiceService {
  /**
   * Generates a PDF invoice for a booking and pipes it directly into the provided writable stream.
   *
   * @param {string} bookingId - Booking MongoDB ObjectId
   * @param {NodeJS.WritableStream} outputStream - Express response (`res`) ya koi bhi writable stream
   * @returns {Promise<void>} Resolves jab PDF document stream mukammal ho jaye
   */
  static async generateInvoice(bookingId, outputStream) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    // 1. Database se booking aur uske saare relations fetch karein
    const booking = await Booking.findById(bookingId)
      .populate("userId", "name email phone")
      .populate("rooms.roomId", "roomNumber type pricePerNight capacity");

    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // 2. Payments collection se payments fetch karein
    const payments = await Payment.find({ bookingId: booking._id });
    const completedPayments = payments.filter((p) => p.status === PAYMENT_STATUS.COMPLETED);
    const refundPayments = payments.filter((p) => p.status === PAYMENT_STATUS.REFUNDED);

    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = refundPayments.reduce((sum, p) => sum + p.amount, 0);

    // Stay duration (Raaton ki tadaad)
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const diffDays = Math.max(
      1,
      Math.ceil(Math.abs(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 3. Naya PDFKit Document banayein (A4 size with standard 50pt margins)
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Output stream me pipe karein (Express response me direct stream)
    doc.pipe(outputStream);

    // ------------------------------------------------------------------------
    // SECTION 1: HEADER & HOTEL BRANDING
    // ------------------------------------------------------------------------
    doc
      .fillColor("#1A365D") // Deep Navy Blue
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("GRAND HORIZON LUXURY HOTEL & SUITES", 50, 50);

    doc
      .fillColor("#718096") // Slate Gray
      .fontSize(9)
      .font("Helvetica")
      .text("104 Boulevard Avenue, Luxury District, Suite 500", 50, 75)
      .text("Phone: +92 51 111-468-357 | Email: reservations@grandhorizon.com", 50, 88)
      .text("Tax / NTN Registration: 9284715-4 | Web: www.grandhorizon.com", 50, 101);

    // Decorative horizontal dividing line
    doc
      .strokeColor("#E2E8F0")
      .lineWidth(1)
      .moveTo(50, 118)
      .lineTo(545, 118)
      .stroke();

    // ------------------------------------------------------------------------
    // SECTION 2: INVOICE META & GUEST INFORMATION (Two Column Layout)
    // ------------------------------------------------------------------------
    const metaTop = 130;

    // Left Column: Guest / Customer Details
    doc
      .fillColor("#2D3748")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BILLED TO (GUEST):", 50, metaTop);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#4A5568")
      .text(`Name: ${booking.userId?.name || "Valued Guest"}`, 50, metaTop + 15)
      .text(`Email: ${booking.userId?.email || "N/A"}`, 50, metaTop + 28)
      .text(`Phone: ${booking.userId?.phone || "N/A"}`, 50, metaTop + 41);

    // Right Column: Invoice Reference & Dates
    doc
      .fillColor("#2D3748")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("INVOICE DETAILS:", 340, metaTop);

    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#4A5568")
      .text(`Invoice No: INV-${booking.bookingReference}`, 340, metaTop + 15)
      .text(`Booking Ref: ${booking.bookingReference}`, 340, metaTop + 28)
      .text(`Issued Date: ${formattedDate}`, 340, metaTop + 41)
      .text(
        `Booking Status: ${booking.status.toUpperCase()}`,
        340,
        metaTop + 54
      )
      .text(
        `Payment Status: ${booking.paymentStatus.toUpperCase()}`,
        340,
        metaTop + 67
      );

    // ------------------------------------------------------------------------
    // SECTION 3: STAY RESERVATION DETAILS BANNER
    // ------------------------------------------------------------------------
    const stayBannerTop = 225;

    // Background highlight container
    doc
      .rect(50, stayBannerTop, 495, 30)
      .fill("#EDF2F7");

    doc
      .fillColor("#2B6CB0")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        `CHECK-IN: ${checkIn.toISOString().split("T")[0]}`,
        65,
        stayBannerTop + 10
      )
      .text(
        `CHECK-OUT: ${checkOut.toISOString().split("T")[0]}`,
        210,
        stayBannerTop + 10
      )
      .text(`DURATION: ${diffDays} Night(s)`, 355, stayBannerTop + 10)
      .text(`GUESTS: ${booking.numberOfGuests}`, 470, stayBannerTop + 10);

    // ------------------------------------------------------------------------
    // SECTION 4: ITEMIZED BILLING TABLE (Kamron Ki List)
    // ------------------------------------------------------------------------
    const tableTop = 275;

    // Table Header Row
    doc
      .rect(50, tableTop, 495, 20)
      .fill("#2D3748");

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Item / Room Description", 60, tableTop + 6)
      .text("Rate / Night", 290, tableTop + 6)
      .text("Nights", 390, tableTop + 6)
      .text("Total (USD)", 465, tableTop + 6);

    let yPosition = tableTop + 25;

    // Table Data Rows
    booking.rooms.forEach((roomItem, index) => {
      const roomNum = roomItem.roomId?.roomNumber
        ? `Room #${roomItem.roomId.roomNumber}`
        : `Room Slot #${index + 1} (Pending Allotment)`;
      const roomType = roomItem.roomId?.type || roomItem.roomType || "Standard";
      const rate = roomItem.pricePerNight;
      const lineTotal = rate * diffDays;

      // Zebra striping for table rows
      if (index % 2 === 1) {
        doc.rect(50, yPosition - 3, 495, 20).fill("#F7FAFC");
      }

      doc
        .fillColor("#2D3748")
        .font("Helvetica")
        .fontSize(9)
        .text(`${roomNum} - ${roomType.toUpperCase()}`, 60, yPosition + 2)
        .text(`$${rate.toFixed(2)}`, 290, yPosition + 2)
        .text(`${diffDays}`, 400, yPosition + 2)
        .text(`$${lineTotal.toFixed(2)}`, 475, yPosition + 2);

      yPosition += 22;
    });

    // Divider under table
    doc
      .strokeColor("#CBD5E0")
      .lineWidth(0.5)
      .moveTo(50, yPosition + 5)
      .lineTo(545, yPosition + 5)
      .stroke();

    // ------------------------------------------------------------------------
    // SECTION 5: FINANCIAL SUMMARY & PAYMENT HISTORY LEDGER
    // ------------------------------------------------------------------------
    const summaryTop = yPosition + 15;

    // Left Column: Payment History Log
    doc
      .fillColor("#2D3748")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("PAYMENTS & TRANSACTIONS LOG:", 50, summaryTop);

    let payY = summaryTop + 14;
    if (completedPayments.length === 0) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#A0AEC0")
        .text("No payments recorded yet. Payment required at check-in.", 50, payY);
    } else {
      completedPayments.slice(0, 4).forEach((pmt) => {
        const pmtDate = new Date(pmt.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const methodLabel = pmt.paymentMethod === "cash" ? "Cash" : "POS / Card";
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#4A5568")
          .text(`• ${pmtDate} - ${methodLabel}: $${pmt.amount.toFixed(2)}`, 50, payY);
        payY += 12;
      });
    }

    // Right Column: Financial Totals box
    const sumLabelX = 320;
    const sumValueX = 475;
    let sumY = summaryTop;

    doc.font("Helvetica").fontSize(9).fillColor("#4A5568");

    // Subtotal
    doc.text("Subtotal:", sumLabelX, sumY);
    doc.text(`$${booking.totalPrice.toFixed(2)}`, sumValueX, sumY);
    sumY += 15;

    // Discount if applied
    if (booking.discountAmount > 0) {
      doc.text("Promotional Discount:", sumLabelX, sumY);
      doc.text(`-$${booking.discountAmount.toFixed(2)}`, sumValueX, sumY);
      sumY += 15;
    }

    // Total Reservation Price
    doc
      .font("Helvetica-Bold")
      .fillColor("#1A202C")
      .text("Total Accommodation:", sumLabelX, sumY);
    doc.text(`$${booking.totalPrice.toFixed(2)}`, sumValueX, sumY);
    sumY += 16;

    // Advance Payment Received
    doc
      .font("Helvetica")
      .fillColor("#2B6CB0")
      .text("Total Paid to Date:", sumLabelX, sumY);
    doc.text(`$${totalPaid.toFixed(2)}`, sumValueX, sumY);
    sumY += 16;

    // If booking was cancelled and refunded
    if (totalRefunded > 0 || booking.cancellation?.refundAmount > 0) {
      const refundAmt = totalRefunded || booking.cancellation?.refundAmount || 0;
      doc
        .font("Helvetica-Bold")
        .fillColor("#C53030") // Red for refund
        .text(`Refund Processed (${booking.cancellation?.appliedTier || "Tier"}):`, sumLabelX, sumY);
      doc.text(`-$${refundAmt.toFixed(2)}`, sumValueX, sumY);
      sumY += 16;
    }

    // Balance Due Calculation & High-Contrast Settlement Pill
    const balanceDue = Math.max(0, booking.totalPrice - totalPaid);
    const pillHeight = 24;
    const pillWidth = 240;
    doc
      .rect(sumLabelX - 10, sumY - 2, pillWidth, pillHeight)
      .fill(balanceDue === 0 ? "#C6F6D5" : "#FEEBC8");

    doc
      .fillColor(balanceDue === 0 ? "#22543D" : "#7B341E")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        balanceDue === 0
          ? "PAID IN FULL ($0.00 DUE)"
          : `OUTSTANDING DUE: $${balanceDue.toFixed(2)}`,
        sumLabelX - 5,
        sumY + 5
      );

    // ------------------------------------------------------------------------
    // SECTION 6: GUEST & STAFF SIGNATURE VERIFICATION
    // ------------------------------------------------------------------------
    const sigTop = Math.max(sumY + 45, payY + 35, 620);

    doc
      .strokeColor("#CBD5E0")
      .lineWidth(0.5)
      .moveTo(50, sigTop)
      .lineTo(230, sigTop)
      .moveTo(340, sigTop)
      .lineTo(520, sigTop)
      .stroke();

    doc
      .fontSize(8)
      .fillColor("#4A5568")
      .font("Helvetica")
      .text("Guest Signature & Date", 50, sigTop + 4)
      .text("Front Desk Officer / Official Stamp", 340, sigTop + 4);

    // ------------------------------------------------------------------------
    // SECTION 7: TERMS & FOOTER
    // ------------------------------------------------------------------------
    const footerTop = 710;

    doc
      .strokeColor("#E2E8F0")
      .lineWidth(0.5)
      .moveTo(50, footerTop)
      .lineTo(545, footerTop)
      .stroke();

    doc
      .fillColor("#718096")
      .font("Helvetica")
      .fontSize(8)
      .text(
        "Terms & Conditions: Standard check-in time is 2:00 PM; check-out is 11:00 AM. Outstanding balance must be settled before checkout key return.",
        50,
        footerTop + 10,
        { align: "center", width: 495 }
      )
      .text(
        "Official Grand Horizon Hotel Registration Folio & Tax Invoice. Thank you for your stay!",
        50,
        footerTop + 24,
        { align: "center", width: 495 }
      );

    // Document mukammal karein aur stream ko close karein
    doc.end();
  }
}

module.exports = InvoiceService;
