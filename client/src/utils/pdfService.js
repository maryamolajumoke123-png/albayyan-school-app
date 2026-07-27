import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * PDF EXPORT SERVICE
 * Generates PDF reports and invoices for students and directors
 */

/**
 * Generate and download invoice PDF
 * @param {object} invoice - Invoice details
 * @param {object} student - Student information
 * @param {object} feeStructure - Fee structure details
 */
export const generateInvoicePDF = (invoice, student, feeStructure) => {
  const doc = new jsPDF()
  
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('ALBAYYAN INTERNATIONAL SCHOOL', 105, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('School Office | Abuja, Nigeria', 105, 23, { align: 'center' })
  doc.line(20, 28, 190, 28)
  
  // Invoice title and number
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('INVOICE', 20, 40)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Invoice #: ${invoice.id || 'N/A'}`, 20, 50)
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 56)
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 62)
  doc.text(`Status: ${invoice.status?.toUpperCase() || 'UNPAID'}`, 20, 68)
  
  // Student information
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('STUDENT INFORMATION', 20, 80)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Name: ${student.firstName} ${student.lastName}`, 20, 87)
  doc.text(`Admission #: ${student.admissionNumber}`, 20, 93)
  doc.text(`Class: ${student.level || 'N/A'}`, 20, 99)
  doc.text(`Parent Phone: ${student.parentPhoneNumber || 'N/A'}`, 20, 105)
  
  // Fee details table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('FEE DETAILS', 20, 120)
  
  const tableData = [
    ['Description', 'Amount (₦)'],
    [`${feeStructure?.description || 'School Fees'} - ${feeStructure?.termName || invoice.term}`, 
     `₦${invoice.amount?.toLocaleString() || 0}`]
  ]
  
  doc.autoTable({
    startY: 125,
    head: [tableData[0]],
    body: [tableData[1]],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    columnStyles: {
      1: { halign: 'right' }
    }
  })
  
  // Total
  const totalY = doc.lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOTAL AMOUNT DUE: ₦${invoice.amount?.toLocaleString() || 0}`, 20, totalY)
  
  // Amount paid (if any)
  if (invoice.status === 'paid' || invoice.status === 'partial') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const amountPaid = invoice.amountPaid || 0
    doc.text(`Amount Paid: ₦${amountPaid.toLocaleString()}`, 20, totalY + 7)
    
    if (invoice.status === 'partial') {
      doc.text(`Outstanding: ₦${(invoice.amount - amountPaid).toLocaleString()}`, 20, totalY + 13)
    }
  }
  
  // Payment instructions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PAYMENT INSTRUCTIONS:', 20, totalY + 25)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Please make payment through:', 20, totalY + 32)
  doc.text('1. Bank Transfer to Albayyan School Account', 20, totalY + 38)
  doc.text('2. Online Portal Payment', 20, totalY + 44)
  doc.text('3. School Office Direct Payment', 20, totalY + 50)
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.line(20, 260, 190, 260)
  doc.text('This is an official document from Albayyan International School', 105, 265, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 270, { align: 'center' })
  
  // Download
  doc.save(`Invoice-${student.firstName}_${student.lastName}_${invoice.id}.pdf`)
}

/**
 * Generate and download payment receipt PDF
 * @param {object} payment - Payment details
 * @param {object} student - Student information
 * @param {object} invoice - Invoice details
 */
export const generatePaymentReceiptPDF = (payment, student, invoice) => {
  const doc = new jsPDF()
  const safeStudent = student || {}
  const safeInvoice = invoice || {}
  const safePayment = payment || {}
  const studentName = `${safeStudent.firstName || ''} ${safeStudent.lastName || ''}`.trim() || 'Student'
  const studentAdmission = safeStudent.admissionNumber || 'N/A'
  const studentClass = safeStudent.classLevel || safeStudent.level || 'N/A'
  const invoiceId = safeInvoice.id || safePayment.invoiceId || 'N/A'
  const paymentDate = safePayment.paymentDate || safePayment.createdAt || new Date().toISOString()
  const paymentAmount = Number(safePayment.amountPaid ?? safePayment.amount ?? 0)
  const paymentMethod = safePayment.paymentMethod || 'N/A'
  const bankName = safePayment.bankName || 'N/A'
  const transactionRef = safePayment.transactionReference || safePayment.transactionRef || 'N/A'
  const invoiceTerm = safeInvoice.term?.name || safeInvoice.term || 'School Fees'
  
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('ALBAYYAN INTERNATIONAL SCHOOL', 105, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('School Office | Abuja, Nigeria', 105, 23, { align: 'center' })
  doc.line(20, 28, 190, 28)
  
  // Receipt title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PAYMENT RECEIPT', 20, 40)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Receipt #: ${safePayment.receiptNumber || safePayment.id || 'N/A'}`, 20, 50)
  doc.text(`Date: ${new Date(paymentDate).toLocaleDateString()}`, 20, 56)
  doc.text(`Invoice #: ${invoiceId}`, 20, 62)
  
  // Student information
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('STUDENT INFORMATION', 20, 75)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Name: ${studentName}`, 20, 82)
  doc.text(`Admission #: ${studentAdmission}`, 20, 88)
  doc.text(`Class: ${studentClass}`, 20, 94)
  
  // Payment details table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PAYMENT DETAILS', 20, 110)
  
  const tableData = [
    ['Description', 'Amount (₦)'],
    [`${invoiceTerm} - Payment`, `₦${paymentAmount.toLocaleString()}`]
  ]
  
  doc.autoTable({
    startY: 115,
    head: [tableData[0]],
    body: [tableData[1]],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    columnStyles: {
      1: { halign: 'right' }
    }
  })
  
  // Total paid
  const totalY = doc.lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`AMOUNT PAID: ₦${paymentAmount.toLocaleString()}`, 20, totalY)
  
  // Payment method
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Payment Method: ${paymentMethod}`, 20, totalY + 8)
  doc.text(`Bank: ${bankName}`, 20, totalY + 14)
  doc.text(`Transaction Ref: ${transactionRef}`, 20, totalY + 20)
  
  // Receipt confirmation
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PAYMENT CONFIRMATION', 20, totalY + 35)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('This receipt confirms that the above payment has been received and recorded.', 20, totalY + 42)
  doc.text('Thank you for your prompt payment.', 20, totalY + 48)
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.line(20, 260, 190, 260)
  doc.text('This is an official receipt from Albayyan International School', 105, 265, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 270, { align: 'center' })
  
  // Download
  doc.save(`Receipt-${studentName.replace(/\s+/g, '_')}_${invoiceId}.pdf`)
}

/**
 * Generate and download debtors report PDF
 * @param {array} debtors - List of students with outstanding payments
 * @param {string} generatedBy - Name of person generating report
 */
export const generateDebtorsReportPDF = (debtors, generatedBy = 'System') => {
  const doc = new jsPDF('l', 'mm', 'a4') // Landscape orientation
  
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('ALBAYYAN INTERNATIONAL SCHOOL', 148, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('DEBTORS REPORT - OUTSTANDING FEES', 148, 23, { align: 'center' })
  doc.line(15, 27, 280, 27)
  
  // Report info
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 35)
  doc.text(`By: ${generatedBy}`, 15, 41)
  doc.text(`Total Debtors: ${debtors.length}`, 15, 47)
  
  // Calculate total outstanding
  const totalOutstanding = debtors.reduce((sum, debtor) => sum + (debtor.outstandingAmount || 0), 0)
  doc.text(`Total Outstanding: ₦${totalOutstanding.toLocaleString()}`, 15, 53)
  
  // Debtors table
  const tableData = debtors.map(debtor => [
    debtor.firstName + ' ' + debtor.lastName,
    debtor.admissionNumber,
    debtor.level || 'N/A',
    debtor.termName || 'N/A',
    `₦${(debtor.outstandingAmount || 0).toLocaleString()}`,
    debtor.daysOverdue ? `${debtor.daysOverdue} days` : 'Not yet due'
  ])
  
  doc.autoTable({
    startY: 60,
    head: [['Student Name', 'Admission #', 'Class', 'Term', 'Outstanding (₦)', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      4: { halign: 'right' }
    }
  })
  
  // Summary section
  const summaryY = doc.lastAutoTable.finalY + 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SUMMARY', 15, summaryY)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Total Students Owing: ${debtors.length}`, 15, summaryY + 7)
  doc.text(`Total Amount Outstanding: ₦${totalOutstanding.toLocaleString()}`, 15, summaryY + 13)
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.line(15, 195, 280, 195)
  doc.text('This is a confidential report - Albayyan International School', 148, 200, { align: 'center' })
  doc.text(`Page 1 of 1`, 148, 204, { align: 'center' })
  
  // Download
  doc.save(`Debtors-Report-${new Date().getTime()}.pdf`)
}

/**
 * Generate and download payment analysis report PDF
 * @param {object} analyticsData - Analytics data with charts
 * @param {string} period - Report period (daily, weekly, monthly)
 */
export const generateAnalyticsReportPDF = (analyticsData, period = 'monthly') => {
  const doc = new jsPDF()
  
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('ALBAYYAN INTERNATIONAL SCHOOL', 105, 15, { align: 'center' })
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${period.charAt(0).toUpperCase() + period.slice(1)} Payment Analytics Report`, 105, 23, { align: 'center' })
  doc.line(20, 27, 190, 27)
  
  // Report info
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35)
  
  // Key metrics table
  const metricsData = [
    ['Metric', 'Value'],
    ['Total Students', analyticsData.totalStudents || 0],
    ['Total Invoices', analyticsData.totalInvoices || 0],
    ['Total Amount Billed', `₦${(analyticsData.totalAmount || 0).toLocaleString()}`],
    ['Total Paid', `₦${(analyticsData.totalPaid || 0).toLocaleString()}`],
    ['Outstanding', `₦${(analyticsData.totalOutstanding || 0).toLocaleString()}`],
    ['Payment Rate', `${((analyticsData.totalPaid / analyticsData.totalAmount) * 100 || 0).toFixed(1)}%`]
  ]
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('KEY METRICS', 20, 45)
  
  doc.autoTable({
    startY: 50,
    head: [metricsData[0]],
    body: metricsData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    columnStyles: {
      1: { halign: 'right' }
    }
  })
  
  // Bank distribution
  if (analyticsData.bankDistribution && analyticsData.bankDistribution.length > 0) {
    const bankY = doc.lastAutoTable.finalY + 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('PAYMENT BY BANK', 20, bankY)
    
    const bankData = analyticsData.bankDistribution.map(bank => [
      bank.name,
      `₦${bank.amount?.toLocaleString() || 0}`,
      `${(bank.percentage || 0).toFixed(1)}%`
    ])
    
    doc.autoTable({
      startY: bankY + 5,
      head: [['Bank Name', 'Amount (₦)', 'Percentage']],
      body: bankData,
      theme: 'grid',
      headStyles: {
        fillColor: [124, 58, 237],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [31, 41, 55]
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    })
  }
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.line(20, 260, 190, 260)
  doc.text('Confidential - Albayyan International School', 105, 265, { align: 'center' })
  
  // Download
  doc.save(`Analytics-Report-${period}-${new Date().getTime()}.pdf`)
}

/**
 * Generate financial summary report PDF
 * @param {array} invoices - All invoices
 * @param {array} payments - All payments
 * @param {string} reportPeriod - Report period description
 */
export const generateFinancialSummaryPDF = (invoices = [], payments = [], reportPeriod = 'Current') => {
  const doc = new jsPDF('l', 'mm', 'a4') // Landscape
  
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('ALBAYYAN INTERNATIONAL SCHOOL', 148, 15, { align: 'center' })
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('FINANCIAL SUMMARY REPORT', 148, 23, { align: 'center' })
  doc.line(15, 27, 280, 27)
  
  // Report info
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Period: ${reportPeriod}`, 15, 35)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 41)
  
  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0)
  const totalPaid = payments.reduce((sum, pay) => sum + (parseFloat(pay.amount_paid) || 0), 0)
  const outstanding = totalInvoiced - totalPaid
  const collectionRate = totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(2) : 0
  
  // Summary metrics
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Invoices', invoices.length.toString()],
    ['Total Students', new Set(invoices.map(inv => inv.student_id)).size.toString()],
    ['Total Amount Invoiced', `₦${totalInvoiced.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`],
    ['Total Amount Paid', `₦${totalPaid.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`],
    ['Outstanding Balance', `₦${outstanding.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`],
    ['Collection Rate', `${collectionRate}%`]
  ]
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('FINANCIAL SUMMARY', 15, 50)
  
  doc.autoTable({
    startY: 55,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    columnStyles: {
      1: { halign: 'right' }
    }
  })
  
  // Payment status breakdown
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length
  const partialInvoices = invoices.filter(inv => inv.status === 'Partial').length
  const unpaidInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Unpaid').length
  
  const statusTableY = doc.lastAutoTable.finalY + 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PAYMENT STATUS BREAKDOWN', 15, statusTableY)
  
  const statusData = [
    ['Status', 'Count', 'Percentage'],
    ['Fully Paid', paidInvoices.toString(), `${((paidInvoices / invoices.length) * 100).toFixed(1)}%`],
    ['Partially Paid', partialInvoices.toString(), `${((partialInvoices / invoices.length) * 100).toFixed(1)}%`],
    ['Unpaid', unpaidInvoices.toString(), `${((unpaidInvoices / invoices.length) * 100).toFixed(1)}%`]
  ]
  
  doc.autoTable({
    startY: statusTableY + 5,
    head: [statusData[0]],
    body: statusData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [31, 41, 55]
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' }
    }
  })
  
  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.line(15, 190, 280, 190)
  doc.text('Confidential - Financial Report for Administrative Use Only', 148, 195, { align: 'center' })
  
  // Download
  doc.save(`FinancialSummary-${new Date().getTime()}.pdf`)
}

export default {
  generateInvoicePDF,
  generatePaymentReceiptPDF,
  generateDebtorsReportPDF,
  generateAnalyticsReportPDF,
  generateFinancialSummaryPDF
}
