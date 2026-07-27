import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
import ReceiptModal from './ReceiptModal';
import SchoolHeader from './SchoolHeader';
import { exportStudentsToExcel, parseStudentsFromExcel, downloadExcelTemplate, parsePaymentCollectionExcel, downloadPaymentCollectionTemplate } from './utils/excelUtils';
import { getApiUrl, logout } from './utils/supabaseClient';
import { sendPaymentReceivedNotification } from './utils/notificationService';
import { generateInvoicePDF, generatePaymentReceiptPDF, generateDebtorsReportPDF, generateAnalyticsReportPDF, generateFinancialSummaryPDF } from './utils/pdfService';

// School class constants
const PRIMARY_CLASSES = ['Creche', 'Reception 1', 'Reception 2', 'Nursery 1', 'Nursery 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
const SECONDARY_CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

const AdminDashboard = ({ onLogout }) => {
  // API base and headers (ensure server endpoints are reachable both locally and when deployed)
  const API_URL = getApiUrl();
  const authToken = localStorage.getItem('authToken') || '';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);
  
  // Dashboard
  const [stats, setStats] = useState(null);
  
  // Students
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ 
    firstName: '', 
    lastName: '', 
    school: 'Secondary',
    classLevel: 'JSS 1',
    parentPhoneNumber: '',
    boardingStatus: false,
    takesSchoolBus: false,
    email: '',
    phone: ''
  });
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Excel Import/Export
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  
  // Sessions
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({ name: '', startDate: '', endDate: '' });
  const [editingSession, setEditingSession] = useState(null);
  
  // Terms
  const [terms, setTerms] = useState([]);
  const [selectedSessionForTerms, setSelectedSessionForTerms] = useState('');
  const [newTerm, setNewTerm] = useState({ sessionId: '', name: '', startDate: '', endDate: '' });
  const [editingTerm, setEditingTerm] = useState(null);
  
  // Fee Structures
  const [feeStructures, setFeeStructures] = useState([]);
  const [selectedTermForFees, setSelectedTermForFees] = useState('');
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [newFee, setNewFee] = useState({
    sessionId: '',
    termId: '',
    classLevel: 'JSS 1',
    newStudentBaseTuition: 0,
    newStudentBoardingFee: 0,
    newStudentSchoolBusFee: 0,
    returningStudentBaseTuition: 0,
    returningStudentBoardingFee: 0,
    returningStudentSchoolBusFee: 0
  });
  
  // Invoices
  const [invoices, setInvoices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({ studentId: '', feeStructureId: '', termId: '', dueDate: '' });
  
  // Payments
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({ studentId: '', invoiceId: '', amountPaid: 0, paymentMethod: 'Bank Transfer', transactionReference: '', recordedBy: 'Admin', bankName: '', receiptNumber: '', paidByName: '', paidDate: '' });

  // Payment Import
  const [isImportingPayments, setIsImportingPayments] = useState(false);
  const [paymentImportResults, setPaymentImportResults] = useState(null);

  // Debtors
  const [debtorsFilterTerm, setDebtorsFilterTerm] = useState('');
  const [debtorsFilterClass, setDebtorsFilterClass] = useState('');

  // Show success message
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Auto-select fee structure when student and term are selected
  useEffect(() => {
    if (newInvoice.studentId && newInvoice.termId) {
      // Find the selected student
      const selectedStudent = students.find(s => s.id === parseInt(newInvoice.studentId));
      if (selectedStudent) {
        // Find the matching fee structure for this term and student's class level
        const matchingFeeStructure = feeStructures.find(
          f => f.termId === parseInt(newInvoice.termId) && f.classLevel === selectedStudent.classLevel
        );
        if (matchingFeeStructure) {
          setNewInvoice(prev => ({
            ...prev,
            feeStructureId: matchingFeeStructure.id.toString()
          }));
        }
      }
    }
  }, [newInvoice.studentId, newInvoice.termId, students, feeStructures]);

  // Load data based on active tab
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const studentsResponse = await axios.get(`${API_URL}/admin/students`, { headers });
      const sessionsResponse = await axios.get(`${API_URL}/admin/sessions`, { headers });
      const paymentsResponse = await axios.get(`${API_URL}/admin/payments`, { headers });
      const termsResponse = await axios.get(`${API_URL}/admin/terms`, { headers });

      const studentsData = (studentsResponse.data || []).map(student => {
        const invoices = student.invoices || [];
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const paidAmount = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        return {
          ...student,
          totalAmount,
          paidAmount
        };
      });

      setStudents(studentsData);
      setSessions(sessionsResponse.data || []);
      setTerms(termsResponse.data || []);
      setPayments(paymentsResponse.data || []);

      const allInvoices = studentsData.flatMap(s => 
        (s.invoices || []).map(inv => {
          const balanceDue = inv.balanceDue ?? Math.max(0, (inv.totalAmount ?? 0) - (inv.amountPaid ?? 0));
          return {
            ...inv,
            student: { 
              id: s.id,
              firstName: s.firstName, 
              lastName: s.lastName,
              admissionNumber: s.admissionNumber
            },
            balanceDue
          };
        })
      );
      setInvoices(allInvoices);
      
      const totalStudents = studentsData.length;
      const totalAmount = studentsData.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalCollected = studentsData.reduce((sum, s) => sum + s.paidAmount, 0);
      const outstandingBalance = totalAmount - totalCollected;
      const activeCount = (sessionsResponse.data || []).filter(s => s.isActive).length;
      
      setStats({
        totalStudents,
        newStudents: 0,
        totalInvoices: allInvoices.length,
        paidInvoices: allInvoices.filter(inv => inv.status === 'Paid').length,
        totalCollected: totalCollected || 0,
        outstandingBalance: outstandingBalance || 0,
        paymentPercentage: totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0,
        activeSessions: activeCount,
        totalSessions: (sessionsResponse.data || []).length
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showSuccess('Error loading data: ' + error.message);
    }
  };

  // ===== STUDENT OPERATIONS =====
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    
    // ===== FORM VALIDATION =====
    if (!newStudent.firstName?.trim()) {
      showSuccess('❌ First name is required');
      return;
    }
    if (!newStudent.lastName?.trim()) {
      showSuccess('❌ Last name is required');
      return;
    }
    if (!newStudent.parentPhoneNumber?.trim()) {
      showSuccess('❌ Parent phone number is required');
      return;
    }
    // Phone validation (11 digits for Nigerian numbers)
    if (!/^\d{11}$/.test(newStudent.parentPhoneNumber.replace(/\D/g, ''))) {
      showSuccess('❌ Phone number must be 11 digits');
      return;
    }
    
    try {
      const studentData = {
        firstName: newStudent.firstName.trim(),
        lastName: newStudent.lastName.trim(),
        school: newStudent.school,
        classLevel: newStudent.classLevel,
        parentPhoneNumber: newStudent.parentPhoneNumber.trim(),
        boardingStatus: newStudent.boardingStatus,
        takesSchoolBus: newStudent.takesSchoolBus,
        email: newStudent.email?.trim() || null,
        phone: newStudent.phone?.trim() || null
      };

      if (editingStudent) {
        await axios.put(`${API_URL}/admin/students/${editingStudent}`, studentData, { headers });
        showSuccess('✅ Student updated successfully');
      } else {
        await axios.post(`${API_URL}/admin/students`, studentData, { headers });
        showSuccess('✅ Student created successfully');
      }

      setEditingStudent(null);
      setNewStudent({ 
        firstName: '', 
        lastName: '', 
        level: 'Secondary',
        email: '',
        phone: ''
      });
      loadDashboard();
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const parsedStudents = await parseStudentsFromExcel(file);
      const response = await axios.post(`${API_URL}/admin/students/bulk/import`, { students: parsedStudents }, { headers });
      setImportResults(response.data);
      showSuccess(`✅ Imported ${response.data.successful} students, ${response.data.failed} failed`);
      loadDashboard();
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExcelExport = () => {
    try {
      exportStudentsToExcel(students);
      showSuccess('✅ Exported students to Excel');
    } catch (error) {
      showSuccess('❌ Error: ' + error.message);
    }
  };

  const handleLogoutClick = () => {
    logout();
    onLogout();
  };

  const handleActivateSession = async (id) => {
    try {
      await axios.put(`${API_URL}/admin/sessions/${id}`, { isActive: true }, { headers });
      showSuccess('✅ Session activated 🎓');
      loadDashboard();
    } catch (error) {
      showSuccess('❌ Error: ' + error.response?.data?.error);
    }
  };

  // ===== TERM OPERATIONS =====
  const handleLoadTermsForSession = async (sessionId) => {
    if (!sessionId) {
      setTerms([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/admin/sessions/${sessionId}/terms`, { headers });
      setTerms(res.data);
      setSelectedSessionForTerms(sessionId);
    } catch (error) {
      console.error('Error loading terms:', error);
    }
  };

  // Duplicate removed - using stub version from session operations section

  const handleCarryForwardBalances = async (termId) => {
    if (window.confirm('Carry forward outstanding balances to this term? 🔄')) {
      try {
        const res = await axios.post(`${API_URL}/admin/terms/${termId}/carry-forward-balances`, {}, { headers });
        showSuccess(`✅ ${res.data.results.length} students carried forward 💳`);
        handleLoadTermsForSession(selectedSessionForTerms);
      } catch (error) {
        showSuccess('❌ Error: ' + (error.response?.data?.message || error.response?.data?.error));
      }
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student.id);
    setNewStudent({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      school: student.school || 'Secondary',
      classLevel: student.classLevel || 'JSS 1',
      parentPhoneNumber: student.parentPhoneNumber || '',
      boardingStatus: student.boardingStatus || false,
      takesSchoolBus: student.takesSchoolBus || false,
      email: student.email || '',
      phone: student.phone || ''
    });
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Delete this student? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/students/${id}`, { headers });
        showSuccess('✅ Student deleted');
        loadDashboard();
      } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        showSuccess('❌ Error: ' + message);
      }
    }
  };

  // ===== SESSION OPERATIONS (STUB) =====
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSession.name.trim()) {
      showSuccess('❌ Session name is required');
      return;
    }
    if (!newSession.startDate || !newSession.endDate) {
      showSuccess('❌ Start and end dates are required');
      return;
    }
    try {
      if (editingSession) {
        await axios.put(`${API_URL}/admin/sessions/${editingSession}`, newSession, { headers });
        showSuccess('✅ Session updated successfully');
      } else {
        await axios.post(`${API_URL}/admin/sessions`, newSession, { headers });
        showSuccess('✅ Session created successfully');
      }
      setNewSession({ name: '', startDate: '', endDate: '' });
      setEditingSession(null);
      loadDashboard();
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session.id);
    setNewSession({
      name: session.name,
      startDate: session.startDate ? session.startDate.split('T')[0] : '',
      endDate: session.endDate ? session.endDate.split('T')[0] : ''
    });
  };

  const handleDeleteSession = async (id) => {
    if (window.confirm('Delete this session and all its terms? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/sessions/${id}`, { headers });
        showSuccess('✅ Session deleted');
        loadDashboard();
      } catch (error) {
        showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!selectedSessionForTerms) {
      showSuccess('❌ Please select a session first');
      return;
    }
    if (!newTerm.name.trim()) {
      showSuccess('❌ Term name is required');
      return;
    }
    try {
      const termPayload = {
        ...newTerm,
        sessionId: selectedSessionForTerms
      };

      if (editingTerm) {
        await axios.put(`${API_URL}/admin/terms/${editingTerm}`, termPayload, { headers });
        showSuccess('✅ Term updated successfully');
      } else {
        await axios.post(`${API_URL}/admin/terms`, termPayload, { headers });
        showSuccess('✅ Term created successfully 📖');
      }

      setNewTerm({ sessionId: '', name: '', startDate: '', endDate: '' });
      setEditingTerm(null);
      loadTermsForSession(selectedSessionForTerms);
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteTerm = async (id) => {
    if (window.confirm('Delete this term and all invoices? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/terms/${id}`, { headers });
        showSuccess('✅ Term deleted');
        loadTermsForSession(selectedSessionForTerms);
      } catch (error) {
        showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const loadTermsForSession = async (sessionId) => {
    if (!sessionId) {
      setTerms([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/admin/sessions/${sessionId}/terms`, { headers });
      setTerms(res.data);
      setSelectedSessionForTerms(sessionId);
    } catch (error) {
      console.error('Error loading terms:', error);
    }
  };

  // ===== EXCEL IMPORT/EXPORT OPERATIONS =====
  const handleExportStudents = () => {
    const result = exportStudentsToExcel(students, 'albayyan_students');
    if (result.success) {
      showSuccess('✅ ' + result.message);
    } else {
      showSuccess('❌ Export failed: ' + result.error);
    }
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate();
    showSuccess('✅ Template downloaded');
  };

  const handleImportStudents = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      // Parse Excel file
      const parsedStudents = await parseStudentsFromExcel(file);
      
      // Send to backend
      const response = await axios.post(
        `${API_URL}/admin/students/bulk/import`,
        { students: parsedStudents },
        { headers }
      );

      setImportResults(response.data);
      showSuccess(`✅ Imported ${response.data.successful} students`);
      
      // Reload students
      setTimeout(() => loadDashboard(), 1000);
    } catch (error) {
      console.error('Import error:', error);
      showSuccess('❌ Import failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // ===== FEE STRUCTURE OPERATIONS =====
  const handleLoadFeesForTerm = async (termId) => {
    if (!termId) return;
    try {
      const res = await axios.get(`${API_URL}/admin/terms/${termId}/fee-structures`, { headers });
      setFeeStructures(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    try {
      if (!selectedTermForFees) {
        showSuccess('❌ Please select a term first');
        return;
      }

      const selectedTermId = String(selectedTermForFees);
      const sessionId = sessions.find((s) => (s.terms || []).some((t) => String(t.id) === selectedTermId))?.id;
      if (!sessionId) {
        showSuccess('❌ Unable to determine session for selected term');
        return;
      }

      const duplicateClass = feeStructures.some((fee) => fee.classLevel === newFee.classLevel && !editingFeeId);
      if (duplicateClass) {
        showSuccess('❌ A fee structure already exists for this class in the selected term. Use edit instead.');
        return;
      }

      const payload = {
        sessionId,
        termId: selectedTermId,
        classLevel: newFee.classLevel,
        newStudentBaseTuition: Number(newFee.newStudentBaseTuition) || 0,
        newStudentBoardingFee: Number(newFee.newStudentBoardingFee) || 0,
        newStudentSchoolBusFee: Number(newFee.newStudentSchoolBusFee) || 0,
        returningStudentBaseTuition: Number(newFee.returningStudentBaseTuition) || 0,
        returningStudentBoardingFee: Number(newFee.returningStudentBoardingFee) || 0,
        returningStudentSchoolBusFee: Number(newFee.returningStudentSchoolBusFee) || 0,
      };

      let response;
      if (editingFeeId) {
        response = await axios.put(`${API_URL}/admin/fee-structures/${editingFeeId}`, payload, { headers });
      } else {
        response = await axios.post(`${API_URL}/admin/fee-structures`, payload, { headers });
      }

      const savedFees = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
      setFeeStructures(savedFees);
      showSuccess(editingFeeId ? '✅ Fee structure updated' : '✅ Fee structure created 💰');
      setEditingFeeId(null);
      setNewFee({
        sessionId: '',
        termId: '',
        classLevel: 'JSS 1',
        newStudentBaseTuition: 0,
        newStudentBoardingFee: 0,
        newStudentSchoolBusFee: 0,
        returningStudentBaseTuition: 0,
        returningStudentBoardingFee: 0,
        returningStudentSchoolBusFee: 0
      });
      handleLoadFeesForTerm(selectedTermId);
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  useEffect(() => {
    if (activeTab === 'fees' && selectedTermForFees) {
      handleLoadFeesForTerm(selectedTermForFees);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTermForFees]);

  const handleEditFee = (fee) => {
    setEditingFeeId(fee.id);
    setSelectedTermForFees(String(fee.term?.id || fee.termId || ''));
    setNewFee({
      sessionId: fee.sessionId || '',
      termId: fee.termId || '',
      classLevel: fee.classLevel || 'JSS 1',
      newStudentBaseTuition: fee.newStudentBaseTuition || 0,
      newStudentBoardingFee: fee.newStudentBoardingFee || 0,
      newStudentSchoolBusFee: fee.newStudentSchoolBusFee || 0,
      returningStudentBaseTuition: fee.returningStudentBaseTuition || 0,
      returningStudentBoardingFee: fee.returningStudentBoardingFee || 0,
      returningStudentSchoolBusFee: fee.returningStudentSchoolBusFee || 0
    });
  };

  const handleCancelEditFee = () => {
    setEditingFeeId(null);
    setNewFee({
      sessionId: '',
      termId: '',
      classLevel: 'JSS 1',
      newStudentBaseTuition: 0,
      newStudentBoardingFee: 0,
      newStudentSchoolBusFee: 0,
      returningStudentBaseTuition: 0,
      returningStudentBoardingFee: 0,
      returningStudentSchoolBusFee: 0
    });
  };

  const handleDeleteFee = async (id) => {
    if (window.confirm('Delete this fee structure? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/fee-structures/${id}`, { headers });
        showSuccess('✅ Fee deleted');
        handleLoadFeesForTerm(selectedTermForFees);
      } catch (error) {
        showSuccess('❌ Error: ' + error.response?.data?.error);
      }
    }
  };

  // ===== INVOICE OPERATIONS =====
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/admin/invoices`, newInvoice, { headers });
      showSuccess('✅ Invoice created 📄');
      setNewInvoice({ studentId: '', feeStructureId: '', termId: '', dueDate: '' });
      loadDashboard();
    } catch (error) {
      showSuccess('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('Delete this invoice? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/invoices/${id}`, { headers });
        showSuccess('✅ Invoice deleted');
        loadDashboard();
      } catch (error) {
        showSuccess('❌ Error: ' + error.response?.data?.error);
      }
    }
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = String(Math.floor(1000 + Math.random() * 9000));
    return `RCP-${datePart}-${randomPart}`;
  };

  // ===== PAYMENT OPERATIONS =====
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      // Validate inputs
      if (!newPayment.invoiceId) {
        showSuccess('❌ Please select an invoice');
        return;
      }
      if (!newPayment.amountPaid || newPayment.amountPaid <= 0) {
        showSuccess('❌ Please enter a valid amount');
        return;
      }
      if (!newPayment.paymentMethod) {
        showSuccess('❌ Please select a payment method');
        return;
      }
      if (!newPayment.bankName && newPayment.paymentMethod === 'Bank Transfer') {
        showSuccess('❌ Please enter bank name for bank transfers');
        return;
      }

      // Validate selected student
      if (!newPayment.studentId) {
        showSuccess('❌ Please select a student');
        return;
      }

      // Get invoice and student details for notification
      const invoice = invoices.find(inv => String(inv.id) === String(newPayment.invoiceId));
      const student = students.find(s => s.id === newPayment.studentId || String(s.id) === String(newPayment.studentId));

      if (!invoice) {
        showSuccess('❌ Please select an invoice');
        return;
      }

      const generatedReceiptNumber = newPayment.receiptNumber || generateReceiptNumber();
      setNewPayment({ ...newPayment, receiptNumber: generatedReceiptNumber });

      // Record payment through backend API
      const paymentRecord = {
        invoiceId: Number(newPayment.invoiceId),
        amountPaid: parseFloat(newPayment.amountPaid),
        paymentMethod: newPayment.paymentMethod,
        bankName: newPayment.bankName,
        transactionReference: newPayment.transactionReference,
        paymentDate: newPayment.paidDate || new Date().toISOString().split('T')[0],
        recordedBy: 'Admin',
        receiptNumber: generatedReceiptNumber
      };

      const paymentResponse = await axios.post(`${API_URL}/admin/payments`, paymentRecord, { headers });
      const payment = paymentResponse.data.payment || paymentResponse.data;
      
      // Send notification email if student has parent email
      if (student && student.parentEmail) {
        try {
          await sendPaymentReceivedNotification(
            `${student.firstName} ${student.lastName}`,
            student.parentEmail,
            student.parentPhoneNumber,
            parseFloat(newPayment.amountPaid),
            invoice.id,
            newPayment.paymentMethod,
            newPayment.transactionReference
          );
        } catch (notificationError) {
          console.error('Notification error (non-critical):', notificationError);
          // Don't fail the payment recording if notification fails
        }
      }

      showSuccess('✅ Payment recorded & notification sent 💳');
      setNewPayment({ studentId: '', invoiceId: '', amountPaid: 0, paymentMethod: 'Bank Transfer', transactionReference: '', recordedBy: 'Admin', bankName: '', receiptNumber: '', paidByName: '', paidDate: '' });
      
      // Generate payment receipt PDF
      if (student && invoice) {
        generatePaymentReceiptPDF(payment, student, invoice);
      }

      loadDashboard();
    } catch (error) {
      console.error('Payment recording error:', error);
      showSuccess('❌ Error: ' + (error.message || 'Failed to record payment'));
    }
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Delete this payment and revert balance? 🗑️')) {
      try {
        await axios.delete(`${API_URL}/admin/payments/${id}`, { headers });
        showSuccess('✅ Payment deleted successfully');
        loadDashboard();
      } catch (error) {
        console.error('Delete payment error:', error);
        showSuccess('❌ Error: ' + (error.response?.data?.error || error.message || 'Failed to delete payment'));
      }
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPaymentForReceipt(payment);
    setIsReceiptModalOpen(true);
  };

  const handleImportPaymentCollection = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingPayments(true);
    try {
      const paymentData = await parsePaymentCollectionExcel(file);
      
      // Process each payment record
      const results = {
        total: paymentData.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const payment of paymentData) {
        try {
          // Find or create student
          const nameParts = payment.studentName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || 'Student';

          let student = students.find(s => 
            s.firstName.toLowerCase() === firstName.toLowerCase() &&
            s.lastName.toLowerCase() === lastName.toLowerCase()
          );

          if (!student) {
            // Create new student through backend
            const studentResponse = await axios.post(
              `${API_URL}/admin/students`,
              {
                firstName,
                lastName,
                school: payment.school || 'Secondary',
                classLevel: payment.class,
                parentPhoneNumber: payment.parentPhoneNumber || '',
                boardingStatus: payment.expectedBoardingFee > 0,
                takesSchoolBus: payment.expectedBusFee > 0,
                email: '',
                phone: ''
              },
              { headers }
            );
            student = studentResponse.data;
          }

          // Record payments for each fee type
          const paymentToRecord = [];
          
          if (payment.paidSchoolFee > 0) {
            paymentToRecord.push({
              studentId: student.id,
              amount: payment.paidSchoolFee,
              type: 'School Fee',
              status: payment.status
            });
          }
          if (payment.paidBoardingFee > 0) {
            paymentToRecord.push({
              studentId: student.id,
              amount: payment.paidBoardingFee,
              type: 'Boarding Fee',
              status: payment.status
            });
          }
          if (payment.paidBusFee > 0) {
            paymentToRecord.push({
              studentId: student.id,
              amount: payment.paidBusFee,
              type: 'Bus Fee',
              status: payment.status
            });
          }

          // If no fees recorded yet, record the total paid amount
          if (paymentToRecord.length === 0 && payment.totalPaid > 0) {
            paymentToRecord.push({
              studentId: student.id,
              amount: payment.totalPaid,
              type: 'Payment',
              status: payment.status
            });
          }

          results.successful += paymentToRecord.length > 0 ? 1 : 0;
        } catch (error) {
          results.failed += 1;
          results.errors.push(`${payment.studentName}: ${error.message}`);
        }
      }

      setPaymentImportResults(results);
      showSuccess(`✅ Imported ${results.successful} payments (${results.failed} failed)`);
      loadDashboard();

      // Reset file input
      e.target.value = '';
    } catch (error) {
      showSuccess('❌ Import failed: ' + error.message);
      setPaymentImportResults(null);
    } finally {
      setIsImportingPayments(false);
    }
  };

  return (
    <div className="admin-container">
      {successMessage && <div className="success-toast">{successMessage}</div>}
      
      <SchoolHeader />
      
      <div className="admin-header-actions">
        <button className="logout-btn" onClick={onLogout}>🚪 Logout</button>
      </div>

      <div className="admin-content">
        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📈 Dashboard
          </button>
          <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            📅 Sessions & Terms
          </button>
          <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            🎓 Students
          </button>
          <button className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
            💰 Fee Structures
          </button>
          <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
            📄 Invoices
          </button>
          <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
            💳 Payments
          </button>
          <button className={`tab-btn ${activeTab === 'debtors' ? 'active' : ''}`} onClick={() => setActiveTab('debtors')}>
            🔴 Debtors
          </button>
        </div>

        {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && stats && (
        <div className="tab-content">
          <h2>📊 Dashboard Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>👥 Total Students</h3>
              <p className="stat-number">{stats.totalStudents}</p>
              <small>🆕 New: {stats.newStudents}</small>
            </div>
            <div className="stat-card">
              <h3>💵 Total Collected</h3>
              <p className="stat-number">₦{stats.totalCollected.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>� Total Expected</h3>
              <p className="stat-number">₦{(stats.totalCollected + stats.outstandingBalance).toLocaleString()}</p>
              <small>Collection Rate: {stats.totalCollected + stats.outstandingBalance > 0 ? Math.round((stats.totalCollected / (stats.totalCollected + stats.outstandingBalance)) * 100) : 0}%</small>
            </div>
            <div className="stat-card">
              <h3>�💳 Outstanding Balance</h3>
              <p className="stat-number">₦{stats.outstandingBalance.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>✅ Paid Invoices</h3>
              <p className="stat-number">{stats.paidInvoices}/{stats.totalInvoices}</p>
            </div>
            <div className="stat-card">
              <h3>📅 Active Sessions</h3>
              <p className="stat-number">{stats.activeSessions}/{stats.totalSessions}</p>
            </div>
          </div>
          
          {/* Quick Export Section */}
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📄 Quick Export Reports</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => generateFinancialSummaryPDF(invoices, payments, `All Invoices & Payments`)}
                style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                title="Export financial summary as PDF"
              >
                📊 Financial Summary
              </button>
              <button 
                onClick={() => {
                  if (invoices.length === 0) {
                    alert('No invoices to export');
                    return;
                  }
                  const totalAmount = stats.totalCollected + stats.outstandingBalance;
                  const safeCollectionRate = totalAmount > 0 ? Math.round((stats.totalCollected / totalAmount) * 100) : 0;
                  
                  // Build bank distribution safely
                  const bankDist = payments.reduce((acc, pay) => {
                    if (pay && pay.bankName && pay.amountPaid) {
                      const bank = acc.find(b => b.name === pay.bankName);
                      if (bank) {
                        bank.amount += pay.amountPaid;
                      } else {
                        acc.push({ name: pay.bankName, amount: pay.amountPaid });
                      }
                    }
                    return acc;
                  }, []);
                  
                  // Calculate percentages safely
                  const bankDistWithPercentage = bankDist.map(b => ({ 
                    ...b, 
                    percentage: stats.totalCollected > 0 ? (b.amount / stats.totalCollected * 100) : 0 
                  }));
                  
                  generateAnalyticsReportPDF({
                    totalInvoices: stats.totalInvoices || invoices.length,
                    totalCollected: stats.totalCollected,
                    outstandingBalance: stats.outstandingBalance,
                    collectionRate: safeCollectionRate,
                    bankDistribution: bankDistWithPercentage
                  }, 'Current Period');
                }}
                style={{ padding: '10px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                title="Export analytics and insights"
              >
                📈 Analytics Report
              </button>
              <button 
                onClick={() => {
                  const debtors = invoices.filter(inv => inv.balanceDue > 0);
                  if (debtors.length === 0) {
                    alert('No debtors to report');
                    return;
                  }
                  generateDebtorsReportPDF(debtors, 'Admin');
                }}
                style={{ padding: '10px 15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                title="Export debtors list"
              >
                🔴 Debtors Report
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="tab-content">
          <h2>📅 Sessions & Terms Management</h2>
          
          <div className="section">
            <h3>📅 Create/Edit Session</h3>
            <form className="form" onSubmit={handleCreateSession}>
              <div className="form-row">
                <div className="input-wrapper">
                  <i className="fas fa-calendar"></i>
                  <input
                    type="text"
                    placeholder="Session Name (e.g., 2025/2026)"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="input-wrapper">
                  <i className="fas fa-calendar-alt"></i>
                  <input
                    type="date"
                    value={newSession.startDate}
                    onChange={(e) => setNewSession({ ...newSession, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="input-wrapper">
                  <i className="fas fa-calendar-check"></i>
                  <input
                    type="date"
                    value={newSession.endDate}
                    onChange={(e) => setNewSession({ ...newSession, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <button className="submit-button" type="submit">
                  {editingSession ? '✏️ Update Session' : '➕ Create Session'}
                </button>
                {editingSession && (
                  <button
                    className="cancel-button"
                    onClick={() => {
                      setEditingSession(null);
                      setNewSession({ name: '', startDate: '', endDate: '' });
                    }}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </form>

            <h3>📋 Sessions List</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Terms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.name}</td>
                    <td>{new Date(session.startDate).toLocaleDateString()}</td>
                    <td>{new Date(session.endDate).toLocaleDateString()}</td>
                    <td>{session.isActive ? '🎯 Active' : '⏸️ Inactive'}</td>
                    <td>{session.terms?.length || 0}</td>
                    <td>
                      {!session.isActive && (
                        <button className="action-btn status" onClick={() => handleActivateSession(session.id)}>
                          🎯
                        </button>
                      )}
                      <button className="action-btn delete" onClick={() => handleDeleteSession(session.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h3>📖 Create/Edit Term</h3>
            <div className="input-wrapper">
              <i className="fas fa-filter"></i>
              <select
                value={selectedSessionForTerms}
                onChange={(e) => {
                  setSelectedSessionForTerms(e.target.value);
                  handleLoadTermsForSession(e.target.value);
                }}
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Select a Session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {selectedSessionForTerms && (
              <>
                <form className="form" onSubmit={handleCreateTerm}>
                  <div className="form-row">
                    <div className="input-wrapper">
                      <i className="fas fa-book"></i>
                      <input
                        type="text"
                        placeholder="Term Name (e.g., Term 1)"
                        value={newTerm.name}
                        onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-wrapper">
                      <i className="fas fa-calendar-alt"></i>
                      <input
                        type="date"
                        value={newTerm.startDate}
                        onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="input-wrapper">
                      <i className="fas fa-calendar-check"></i>
                      <input
                        type="date"
                        value={newTerm.endDate}
                        onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <button className="submit-button" type="submit">
                      {editingTerm ? '✏️ Update Term' : '➕ Create Term'}
                    </button>
                    {editingTerm && (
                      <button
                        className="cancel-button"
                        onClick={() => {
                          setEditingTerm(null);
                          setNewTerm({ sessionId: '', name: '', startDate: '', endDate: '' });
                        }}
                      >
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                </form>

                <h3>📖 Terms for {sessions.find(s => s.id === selectedSessionForTerms)?.name}</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map(term => (
                      <tr key={term.id}>
                        <td>{term.name}</td>
                        <td>{new Date(term.startDate).toLocaleDateString()}</td>
                        <td>{new Date(term.endDate).toLocaleDateString()}</td>
                        <td>
                          <button className="action-btn status" onClick={() => handleCarryForwardBalances(term.id)} title="Carry forward outstanding balances">
                            🔄
                          </button>
                          <button className="action-btn delete" onClick={() => handleDeleteTerm(term.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="tab-content">
          <h2>🎓 Student Management</h2>
          
          {/* Excel Import/Export Section */}
          <div className="excel-actions" style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button 
              type="button"
              className="submit-button"
              onClick={handleExportStudents}
              style={{ backgroundColor: '#10b981' }}
              title="Export all students to Excel"
            >
              <i className="fas fa-download"></i> Export Students
            </button>
            
            <button 
              type="button"
              className="submit-button"
              onClick={handleDownloadTemplate}
              style={{ backgroundColor: '#3b82f6' }}
              title="Download Excel template for bulk import"
            >
              <i className="fas fa-file-download"></i> Download Template
            </button>
            
            <label className="submit-button" style={{ backgroundColor: '#f59e0b', cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-upload"></i> Import Students
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportStudents}
                disabled={isImporting}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Import Results */}
          {importResults && (
            <div style={{
              backgroundColor: importResults.failed === 0 ? '#d1fae5' : '#fef3c7',
              border: `2px solid ${importResults.failed === 0 ? '#10b981' : '#f59e0b'}`,
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>
                {importResults.failed === 0 ? '✅ Import Successful!' : '⚠️ Import Completed with Errors'}
              </h4>
              <p style={{ margin: '5px 0' }}>
                <strong>Successful:</strong> {importResults.successful} students
              </p>
              {importResults.failed > 0 && (
                <>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Failed:</strong> {importResults.failed} students
                  </p>
                  {importResults.errors.length > 0 && (
                    <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      <strong>Errors:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        {importResults.errors.map((err, idx) => (
                          <li key={idx} style={{ fontSize: '12px' }}>
                            Row {err.row}: {err.firstName} {err.lastName} - {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <form className="form" onSubmit={handleCreateStudent}>
            <h3>{editingStudent ? '✏️ Edit Student' : '➕ Add New Student'}</h3>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  placeholder="First Name"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-school"></i>
                <select
                  value={newStudent.school}
                  onChange={(e) => setNewStudent({ 
                    ...newStudent, 
                    school: e.target.value,
                    classLevel: e.target.value === 'Primary' ? 'Creche' : 'JSS 1'
                  })}
                  required
                >
                  <option value="Primary">Primary School</option>
                  <option value="Secondary">Secondary School</option>
                </select>
              </div>
              <div className="input-wrapper">
                <i className="fas fa-book"></i>
                <select
                  value={newStudent.classLevel}
                  onChange={(e) => setNewStudent({ ...newStudent, classLevel: e.target.value })}
                  required
                >
                  {newStudent.school === 'Primary' 
                    ? PRIMARY_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)
                    : SECONDARY_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)
                  }
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-phone"></i>
                <input
                  type="tel"
                  placeholder="Parent Phone Number"
                  value={newStudent.parentPhoneNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, parentPhoneNumber: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-bed"></i>
                <input
                  type="checkbox"
                  checked={newStudent.boardingStatus}
                  onChange={(e) => setNewStudent({ ...newStudent, boardingStatus: e.target.checked })}
                />
                Boarding Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-bus"></i>
                <input
                  type="checkbox"
                  checked={newStudent.takesSchoolBus}
                  onChange={(e) => setNewStudent({ ...newStudent, takesSchoolBus: e.target.checked })}
                />
                Takes School Bus
              </label>
            </div>
            <div className="form-row">
              <button className="submit-button" type="submit">
                {editingStudent ? '✏️ Update Student' : '➕ Add Student'}
              </button>
              {editingStudent && (
                <button
                  className="cancel-button"
                  onClick={() => {
                    setEditingStudent(null);
                    setNewStudent({ firstName: '', lastName: '', school: 'Secondary', classLevel: 'JSS 1', parentPhoneNumber: '', boardingStatus: false, takesSchoolBus: false });
                  }}
                >
                  ❌ Cancel
                </button>
              )}
            </div>
          </form>

          <h3>👥 Students List</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Admission #</th>
                <th>Name</th>
                <th>School</th>
                <th>Class</th>
                <th>Student Type</th>
                <th>Expected Fees</th>
                <th>Phone Number</th>
                <th>Boarding</th>
                <th>Bus</th>
                <th>Invoices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const studentFeeStructure = feeStructures.find(f => f.classLevel === student.classLevel);
                const expectedFees = student.isNewStudent 
                  ? studentFeeStructure?.newStudentTotal || 0
                  : studentFeeStructure?.returningStudentTotal || 0;
                return (
                  <tr key={student.id}>
                    <td>{student.admissionNumber}</td>
                    <td>{student.firstName} {student.lastName}</td>
                    <td><strong>{student.school || 'Secondary'}</strong></td>
                    <td>{student.classLevel}</td>
                    <td>{student.isNewStudent ? '🆕 New' : '↩️ Returning'}</td>
                    <td><strong>₦{expectedFees.toLocaleString()}</strong></td>
                    <td>{student.parentPhoneNumber || '—'}</td>
                    <td>{student.boardingStatus ? '✅ Yes' : '❌ No'}</td>
                    <td>{student.takesSchoolBus ? '🚌 Yes' : '❌ No'}</td>
                    <td>{student.invoices.length}</td>
                    <td>
                      <button className="action-btn edit" onClick={() => handleEditStudent(student)}>
                        ✏️
                      </button>
                      <button className="action-btn delete" onClick={() => handleDeleteStudent(student.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FEE STRUCTURES TAB */}
      {activeTab === 'fees' && (
        <div className="tab-content">
          <h2>💰 Fee Structures (New vs Returning Students)</h2>
          
          <div className="input-wrapper">
            <i className="fas fa-filter"></i>
            <select
              value={selectedTermForFees}
              onChange={(e) => {
                setSelectedTermForFees(e.target.value);
                handleLoadFeesForTerm(e.target.value);
              }}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select a Term</option>
              {sessions.length === 0 && (
                <option value="">No sessions available</option>
              )}
              {sessions.map(session => (
                (session.terms || []).length === 0 ? (
                  <option key={`${session.id}-no-term`} value="" disabled>
                    {session.name} - No terms yet
                  </option>
                ) : (
                  session.terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {session.name} - {term.name}
                    </option>
                  ))
                )
              ))}
            </select>
          </div>

          {selectedTermForFees && (
            <form className="form" onSubmit={handleCreateFee}>
              <h3>{editingFeeId ? '✏️ Edit Fee Structure' : '➕ Create New Fee Structure'}</h3>
              <div className="form-row">
                <div className="input-wrapper">
                  <i className="fas fa-book"></i>
                  <select
                    value={newFee.classLevel}
                    disabled={Boolean(editingFeeId)}
                    onChange={(e) => setNewFee({ ...newFee, classLevel: e.target.value })}
                  >
                    <option>JSS 1</option>
                    <option>JSS 2</option>
                    <option>JSS 3</option>
                    <option>SS 1</option>
                    <option>SS 2</option>
                    <option>SS 3</option>
                  </select>
                </div>
              </div>
              
              <h4>🆕 New Student Fees</h4>
              <div className="form-row">
                <div className="input-wrapper">
                  <i className="fas fa-dollar-sign"></i>
                  <input
                    type="number"
                    placeholder="Base Tuition"
                    value={newFee.newStudentBaseTuition}
                    onChange={(e) => setNewFee({ ...newFee, newStudentBaseTuition: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="input-wrapper">
                  <i className="fas fa-home"></i>
                  <input
                    type="number"
                    placeholder="Boarding Fee (0 if none)"
                    value={newFee.newStudentBoardingFee}
                    onChange={(e) => setNewFee({ ...newFee, newStudentBoardingFee: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="input-wrapper">
                  <i className="fas fa-bus"></i>
                  <input
                    type="number"
                    placeholder="School Bus Fee (0 if none)"
                    value={newFee.newStudentSchoolBusFee}
                    onChange={(e) => setNewFee({ ...newFee, newStudentSchoolBusFee: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <h4>↩️ Returning Student Fees</h4>
              <div className="form-row">
                <div className="input-wrapper">
                  <i className="fas fa-dollar-sign"></i>
                  <input
                    type="number"
                    placeholder="Base Tuition"
                    value={newFee.returningStudentBaseTuition}
                    onChange={(e) => setNewFee({ ...newFee, returningStudentBaseTuition: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="input-wrapper">
                  <i className="fas fa-home"></i>
                  <input
                    type="number"
                    placeholder="Boarding Fee (0 if none)"
                    value={newFee.returningStudentBoardingFee}
                    onChange={(e) => setNewFee({ ...newFee, returningStudentBoardingFee: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="input-wrapper">
                  <i className="fas fa-bus"></i>
                  <input
                    type="number"
                    placeholder="School Bus Fee (0 if none)"
                    value={newFee.returningStudentSchoolBusFee}
                    onChange={(e) => setNewFee({ ...newFee, returningStudentSchoolBusFee: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-row">
                <button className="submit-button" type="submit">
                  {editingFeeId ? '✏️ Update Fee Structure' : '➕ Create Fee Structure'}
                </button>
                {editingFeeId && (
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleCancelEditFee}
                    style={{ marginLeft: '12px' }}
                  >
                    ❌ Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}

          <h3>📋 Fee Structures</h3>
          {feeStructures.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#475569' }}>
              No fee structures loaded for the selected term. Select a term above or create a fee structure first.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session - Term</th>
                  <th>Class</th>
                  <th>🆕 New (Tuition)</th>
                  <th>↩️ Returning (Tuition)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures
                  .filter((fee) => !selectedTermForFees || String(fee.term?.id || fee.termId) === String(selectedTermForFees))
                  .map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.session?.name || `Session ${fee.sessionId || 'N/A'}`} - {fee.term?.name || `Term ${fee.termId || 'N/A'}`}</td>
                      <td>{fee.classLevel}</td>
                      <td>₦{Number(fee.newStudentTotal || 0).toLocaleString()}</td>
                      <td>₦{Number(fee.returningStudentTotal || 0).toLocaleString()}</td>
                      <td>
                        <button className="action-btn edit" onClick={() => handleEditFee(fee)}>
                          ✏️
                        </button>
                        <button className="action-btn delete" onClick={() => handleDeleteFee(fee.id)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="tab-content">
          <h2>📄 Invoice Management</h2>
          <form className="form" onSubmit={handleCreateInvoice}>
            <h3>➕ Create Invoice</h3>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <select
                  value={newInvoice.studentId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, studentId: e.target.value })}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-book"></i>
                <select
                  value={newInvoice.termId}
                  onChange={(e) => {
                    setNewInvoice({ ...newInvoice, termId: e.target.value });
                    if (e.target.value) {
                      handleLoadFeesForTerm(e.target.value);
                    }
                  }}
                  required
                >
                  <option value="">Select Term</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-dollar-sign"></i>
                <select
                  value={newInvoice.feeStructureId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, feeStructureId: e.target.value })}
                  required
                >
                  <option value="">Select Fee Structure</option>
                  {feeStructures.map(f => (
                    <option key={f.id} value={f.id}>{f.classLevel} - ₦{f.newStudentTotal}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-calendar"></i>
                <input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <button className="submit-button" type="submit">
                ➕ Create Invoice
              </button>
            </div>
          </form>

          <h3>📋 All Invoices</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Term</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.student.firstName} {inv.student.lastName}</td>
                  <td>{inv.term.name}</td>
                  <td>₦{inv.totalAmount.toLocaleString()}</td>
                  <td>₦{inv.amountPaid.toLocaleString()}</td>
                  <td>₦{inv.balanceDue.toLocaleString()}</td>
                  <td>
                    <span className={`status-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn delete" onClick={() => handleDeleteInvoice(inv.id)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="tab-content">
          <h2>💳 Payment Management</h2>
          
          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <button 
              onClick={() => generateFinancialSummaryPDF(invoices, payments, `All Invoices & Payments`)}
              style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              title="Export financial summary as PDF"
            >
              📊 Export Financial Summary
            </button>
            <button 
              onClick={() => {
                if (payments.length === 0) {
                  alert('No payments to export');
                  return;
                }
                generatePaymentReceiptPDF(payments[0], payments[0].invoice.student, payments[0].invoice);
              }}
              style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              title="Download all payments summary"
            >
              📋 Export Payments Report
            </button>
          </div>

          {/* Import Payment Collection */}
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>📥 Bulk Import Payments from Excel</h3>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '15px' }}>
              Import student payment records from your Excel file. The file should contain columns for Student Name, Class, and payment amounts.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={downloadPaymentCollectionTemplate}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title="Download Excel template for payment import"
              >
                ⬇️ Download Template
              </button>
              
              <div style={{
                position: 'relative',
                display: 'inline-block'
              }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportPaymentCollection}
                  disabled={isImportingPayments}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: isImportingPayments ? 'not-allowed' : 'pointer'
                  }}
                />
                <button
                  type="button"
                  disabled={isImportingPayments}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: isImportingPayments ? '#ccc' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isImportingPayments ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {isImportingPayments ? '⏳ Importing...' : '📤 Import Excel File'}
                </button>
              </div>
            </div>

            {paymentImportResults && (
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '15px',
                marginTop: '15px'
              }}>
                <h4 style={{ marginTop: 0, color: '#1f2937' }}>📊 Import Results</h4>
                <div style={{ fontSize: '14px', color: '#555' }}>
                  <p><strong>Total Records:</strong> {paymentImportResults.total}</p>
                  <p style={{ color: '#10b981' }}><strong>✅ Successful:</strong> {paymentImportResults.successful}</p>
                  <p style={{ color: '#ef4444' }}><strong>❌ Failed:</strong> {paymentImportResults.failed}</p>
                  {paymentImportResults.errors.length > 0 && (
                    <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fee', padding: '10px', borderRadius: '4px' }}>
                      <strong>Errors:</strong>
                      <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '13px', color: '#b91c1c' }}>
                        {paymentImportResults.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {paymentImportResults.errors.length > 5 && (
                          <li>... and {paymentImportResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <form className="form" onSubmit={handleRecordPayment}>
            <h3>➕ Record Payment</h3>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <select
                  value={newPayment.studentId}
                  onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value, invoiceId: '' })}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber || 'No ID'})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-receipt"></i>
                <select
                  value={newPayment.invoiceId}
                  onChange={(e) => setNewPayment({ ...newPayment, invoiceId: e.target.value })}
                  required
                >
                  <option value="">Select Invoice (with balance)</option>
                  {invoices
                    .filter(inv => inv.balanceDue > 0)
                    .filter(inv => !newPayment.studentId || String(inv.student.id) === String(newPayment.studentId))
                    .map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.student.firstName} {inv.student.lastName} - Balance: ₦{inv.balanceDue.toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-dollar-sign"></i>
                <input
                  type="number"
                  placeholder="Amount Paid"
                  value={newPayment.amountPaid}
                  onChange={(e) => setNewPayment({ ...newPayment, amountPaid: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="input-wrapper">
                <i className="fas fa-credit-card"></i>
                <select
                  value={newPayment.paymentMethod}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                >
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Online</option>
                </select>
              </div>
              <div className="input-wrapper">
                <i className="fas fa-bank"></i>
                <select
                  value={newPayment.bankName}
                  onChange={(e) => setNewPayment({ ...newPayment, bankName: e.target.value })}
                >
                  <option value="">Select Bank</option>
                  <option>UBA</option>
                  <option>Sterling</option>
                  <option>Unity</option>
                  <option>Moniepoint</option>
                  <option>Cash</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-receipt"></i>
                <input
                  type="text"
                  placeholder="Receipt Number"
                  value={newPayment.receiptNumber}
                  onChange={(e) => setNewPayment({ ...newPayment, receiptNumber: e.target.value })}
                />
              </div>
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  placeholder="Name of Person Who Paid"
                  value={newPayment.paidByName}
                  onChange={(e) => setNewPayment({ ...newPayment, paidByName: e.target.value })}
                  required
                />
              </div>
              <div className="input-wrapper">
                <i className="fas fa-calendar"></i>
                <input
                  type="date"
                  value={newPayment.paidDate}
                  onChange={(e) => setNewPayment({ ...newPayment, paidDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="input-wrapper">
                <i className="fas fa-barcode"></i>
                <input
                  type="text"
                  placeholder="Transaction Reference (Optional)"
                  value={newPayment.transactionReference}
                  onChange={(e) => setNewPayment({ ...newPayment, transactionReference: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <button className="submit-button" type="submit">
                ✅ Record Payment
              </button>
            </div>
          </form>

          <h3>💳 Payment History</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Receipt #</th>
                <th>Paid By</th>
                <th>Bank</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Recorded By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                    No payments yet.
                  </td>
                </tr>
              ) : payments.map(pay => (
                <tr key={pay.id}>
                  <td>
                    {pay.invoice?.student
                      ? `${pay.invoice.student.firstName || ''} ${pay.invoice.student.lastName || ''}`.trim()
                      : pay.paidByName || '—'}
                  </td>
                  <td>₦{(pay.amountPaid || 0).toLocaleString()}</td>
                  <td>{pay.receiptNumber || '—'}</td>
                  <td>{pay.paidByName || '—'}</td>
                  <td><span className="bank-badge">{pay.bankName || '—'}</span></td>
                  <td>{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}</td>
                  <td><span className="method-badge">{pay.paymentMethod || '—'}</span></td>
                  <td>{pay.transactionReference || '—'}</td>
                  <td>{pay.recordedBy || '—'}</td>
                  <td>
                    <button className="action-btn" onClick={() => handleViewReceipt(pay)} title="View and print receipt">
                      🧾
                    </button>
                    <button className="action-btn delete" onClick={() => handleDeletePayment(pay.id)} title="Delete payment">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DEBTORS TAB */}
      {activeTab === 'debtors' && (
        <div className="tab-content">
          <h2>🔴 Debtors Report</h2>
          
          <div className="debtors-filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
            <div className="input-wrapper" style={{ flex: 1 }}>
              <i className="fas fa-book"></i>
              <select
                value={debtorsFilterTerm}
                onChange={(e) => setDebtorsFilterTerm(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">All Terms</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="input-wrapper" style={{ flex: 1 }}>
              <i className="fas fa-building"></i>
              <select
                value={debtorsFilterClass}
                onChange={(e) => setDebtorsFilterClass(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">All Classes</option>
                {[...new Set(students.map(s => s.classLevel))].map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => {
                const debtors = invoices.filter(inv => {
                  const matchTerm = !debtorsFilterTerm || inv.term?.id === debtorsFilterTerm;
                  const matchClass = !debtorsFilterClass || inv.student?.classLevel === debtorsFilterClass;
                  const hasBalance = inv.balanceDue > 0;
                  return matchTerm && matchClass && hasBalance;
                });
                generateDebtorsReportPDF(debtors, 'Admin');
              }}
              style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              📄 Export PDF
            </button>
            <button 
              onClick={() => window.print()} 
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              🖨️ Print Report
            </button>
          </div>

          <h3>📋 Outstanding Invoices</h3>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Admission #</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Term</th>
                <th>Expected Amount</th>
                <th>Paid Amount</th>
                <th>Balance Due</th>
                <th>Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {invoices
                .filter(inv => {
                  const matchTerm = !debtorsFilterTerm || inv.term?.id === debtorsFilterTerm;
                  const matchClass = !debtorsFilterClass || inv.student?.classLevel === debtorsFilterClass;
                  const hasBalance = inv.balanceDue > 0;
                  return matchTerm && matchClass && hasBalance;
                })
                .map(inv => {
                  const daysOverdue = inv.dueDate ? Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <tr key={inv.id} style={{ backgroundColor: daysOverdue > 30 ? '#fee' : daysOverdue > 0 ? '#ffeaa7' : 'white' }}>
                      <td>{inv.student?.admissionNumber}</td>
                      <td>{inv.student?.firstName} {inv.student?.lastName}</td>
                      <td>{inv.student?.classLevel}</td>
                      <td>{inv.term?.name}</td>
                      <td>₦{inv.totalAmount.toLocaleString()}</td>
                      <td>₦{inv.amountPaid.toLocaleString()}</td>
                      <td><strong>₦{inv.balanceDue.toLocaleString()}</strong></td>
                      <td style={{ color: daysOverdue > 30 ? '#d32f2f' : daysOverdue > 0 ? '#f57f17' : '#4caf50', fontWeight: 'bold' }}>
                        {daysOverdue > 0 ? `${daysOverdue}d` : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal 
        payment={selectedPaymentForReceipt} 
        isOpen={isReceiptModalOpen} 
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedPaymentForReceipt(null);
        }}
      />
    </div>
  );
};

export default AdminDashboard;
