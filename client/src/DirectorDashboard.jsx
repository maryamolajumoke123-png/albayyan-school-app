import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import SchoolHeader from './SchoolHeader';
import './DirectorDashboard.css';
import { getApiUrl, logout } from './utils/supabaseClient';
import { generateAnalyticsReportPDF, generateFinancialSummaryPDF, generateDebtorsReportPDF } from './utils/pdfService';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DirectorDashboard = ({ onLogout }) => {
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bankAnalytics, setBankAnalytics] = useState({ bankData: {}, termData: {}, totalExpected: 0, totalCollected: 0, totalInvoices: 0 });
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authToken = localStorage.getItem('authToken') || '';
  const API_URL = getApiUrl();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`
  };

  const toCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;
  const getStudentName = (student) => {
    if (!student) return 'Unknown';
    return `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown';
  };
  const getPaymentDisplay = (payment) => {
    const student = payment?.student || payment?.invoice?.student;
    const invoice = payment?.invoice;
    const amount = payment?.amountPaid ?? payment?.amount ?? 0;
    const studentName = getStudentName(student);
    const termName = invoice?.term?.name || '—';
    const paymentMethod = payment?.paymentMethod || payment?.bankName || '—';
    const reference = payment?.referenceNumber || payment?.receiptNumber || payment?.transactionReference || '—';
    return { studentName, amount, termName, paymentMethod, reference };
  };

  // Load Dashboard Data
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [studentsRes, summaryRes, paymentsRes, invoicesRes, notificationsRes] = await Promise.all([
        axios.get(`${API_URL}/director/students`, { headers }),
        axios.get(`${API_URL}/director/summary`, { headers }),
        axios.get(`${API_URL}/director/payments`, { headers }),
        axios.get(`${API_URL}/director/invoices`, { headers }),
        axios.get(`${API_URL}/director/notifications`, { headers })
      ]);

      const studentsData = studentsRes.data || [];
      const summaryData = summaryRes.data || {};
      const paymentsData = paymentsRes.data || [];
      const invoicesData = invoicesRes.data || [];
      const notificationsData = notificationsRes.data || [];

      setStudents(studentsData);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setNotifications(notificationsData);
      setSummary(summaryData);
      setBankAnalytics(summaryData.bankAnalytics || { bankData: {}, termData: {}, totalExpected: 0, totalCollected: 0, totalInvoices: 0 });
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    onLogout();
  };

  if (loading) {
    return <div className="director-loading">Loading Director Portal...</div>;
  }

  return (
    <div className="director-container">
      <SchoolHeader />
      
      <div className="director-header-section">
        <div></div>
        <button 
          onClick={handleLogoutClick}
          className="director-logout-btn"
        >
          🚪 Logout
        </button>
      </div>

      <div className="director-content-wrapper">
        {error && <div className="error-alert">⚠️ {error}</div>}

        {/* TAB NAVIGATION */}
        <div className="director-tabs">
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'students', label: '👥 Students' },
            { key: 'invoices', label: '📄 Invoices' },
            { key: 'payments', label: '💳 Payments' },
            { key: 'analytics', label: '📈 Analytics' },
            { key: 'notifications', label: '🔔 Notifications' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`director-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && summary && (
          <div className="director-tab-content">
            <h2>📊 Director Dashboard Overview</h2>
            <div className="director-stats-grid">
              {[
                { label: 'Total Students', value: summary.totalStudents, icon: '👥' },
                { label: 'Primary Students', value: summary.primaryStudents || 0, icon: '🏫' },
                { label: 'Secondary Students', value: summary.secondaryStudents || 0, icon: '🎓' },
                { label: 'Total Boarders', value: summary.totalBoarders || 0, icon: '🛏️' },
                { label: 'School Bus Users', value: summary.totalBusUsers || 0, icon: '🚌' },
                { label: 'Total Invoices', value: summary.totalInvoices, icon: '📄' },
                { label: 'Total Payments', value: summary.totalPayments, icon: '💳' },
                { label: 'Recent Payments (24h)', value: summary.recentPayments, icon: '📦' },
                { label: 'Total Expected', value: toCurrency(summary.totalExpected), icon: '💵' },
                { label: 'Total Collected', value: toCurrency(summary.totalCollected), icon: '💰' },
                { label: 'Outstanding Balance', value: toCurrency(summary.totalOutstanding), icon: '🔴' },
                { label: 'Collection Rate', value: `${summary.collectionRate}%`, icon: '📊' }
              ].map((stat, idx) => (
                <div key={idx} className="director-stat-card">
                  <div className="director-stat-icon">{stat.icon}</div>
                  <div className="director-stat-label">{stat.label}</div>
                  <div className="director-stat-number">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Recent Payments */}
            <h3 style={{ marginTop: '30px' }}>🔔 Latest Payments (Last 7 Days)</h3>
            <table className="director-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.length > 0 ? (
                  payments.map((payment, idx) => {
                    const display = getPaymentDisplay(payment);
                    return (
                      <tr key={idx}>
                        <td>{new Date(payment.createdAt || payment.paymentDate).toLocaleDateString()} {new Date(payment.createdAt || payment.paymentDate).toLocaleTimeString()}</td>
                        <td>{display.studentName}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{toCurrency(display.amount)}</td>
                        <td>{display.paymentMethod}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No recent payments</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="director-tab-content">
            <h2>👥 Registered Students</h2>
            <table className="director-data-table">
              <thead>
                <tr>
                  <th>Admission #</th>
                  <th>Name</th>
                  <th>School</th>
                  <th>Class</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Boarding</th>
                  <th>Bus</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>{student.admissionNumber}</td>
                    <td>{student.firstName} {student.lastName}</td>
                    <td><strong>{student.school || 'Secondary'}</strong></td>
                    <td>{student.classLevel}</td>
                    <td>{student.parentPhoneNumber || '—'}</td>
                    <td>{student.isNewStudent ? '🆕 New' : '↩️ Returning'}</td>
                    <td>{student.boardingStatus ? '🛏️ Yes' : '❌ No'}</td>
                    <td>{student.takesSchoolBus ? '🚌 Yes' : '❌ No'}</td>
                    <td>
                      <span style={{
                        backgroundColor: student.invoices.length > 0 ? '#f59e0b' : '#10b981',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}>
                        {student.invoices.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div>
            <h2>📄 All Invoices</h2>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Term</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Expected</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Paid</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Balance</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, idx) => {
                  const totalAmount = Number(invoice?.totalAmount || 0);
                  const amountPaid = Number(invoice?.amountPaid || 0);
                  const balanceDue = Number(invoice?.balanceDue || 0);
                  const paidPercentage = totalAmount > 0 ? (amountPaid / totalAmount * 100) : 0;
                  const statusColor = paidPercentage === 100 ? '#2ecc71' : paidPercentage > 50 ? '#f39c12' : '#e74c3c';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '15px' }}>{getStudentName(invoice?.student)}</td>
                      <td style={{ padding: '15px' }}>{invoice?.term?.name || '—'}</td>
                      <td style={{ padding: '15px' }}>{toCurrency(totalAmount)}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#27ae60' }}>{toCurrency(amountPaid)}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: statusColor }}>{toCurrency(balanceDue)}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          backgroundColor: statusColor,
                          color: 'white',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {paidPercentage === 100 ? '✅ Paid' : `${Math.round(paidPercentage)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <h2>💳 Payment Records</h2>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Term</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Amount</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Method</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => {
                  const display = getPaymentDisplay(payment);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '15px' }}>{new Date(payment.createdAt || payment.paymentDate).toLocaleDateString()}</td>
                      <td style={{ padding: '15px' }}>{display.studentName}</td>
                      <td style={{ padding: '15px' }}>{display.termName}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#27ae60' }}>{toCurrency(display.amount)}</td>
                      <td style={{ padding: '15px' }}>{display.paymentMethod}</td>
                      <td style={{ padding: '15px', fontSize: '12px', color: '#7f8c8d' }}>{display.reference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && bankAnalytics && (
          <div className="director-tab-content">
            <h2>📈 Bank-wise Payment Analytics</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
              {/* PIE CHART - Payment Distribution by Bank */}
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '20px', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>💵 Payment Distribution (%)</h3>
                {Object.keys(bankAnalytics.bankData).some(b => bankAnalytics.bankData[b].amount > 0) ? (
                  <Pie
                    data={{
                      labels: Object.keys(bankAnalytics.bankData),
                      datasets: [{
                        data: Object.values(bankAnalytics.bankData).map(b => parseFloat(b.percentage)),
                        backgroundColor: [
                          '#FF6384',
                          '#36A2EB',
                          '#FFCE56',
                          '#4BC0C0',
                          '#9966FF'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                ) : (
                  <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No payment data available</p>
                )}
              </div>

              {/* BAR CHART - Amount by Bank */}
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '20px', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>💰 Amount Received by Bank (₦)</h3>
                {Object.keys(bankAnalytics.bankData).some(b => bankAnalytics.bankData[b].amount > 0) ? (
                  <Bar
                    data={{
                      labels: Object.keys(bankAnalytics.bankData),
                      datasets: [{
                        label: 'Amount (₦)',
                        data: Object.values(bankAnalytics.bankData).map(b => b.amount),
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      indexAxis: 'y',
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        x: {
                          ticks: {
                            callback: function(value) {
                              return '₦' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No payment data available</p>
                )}
              </div>
            </div>

            {/* BANK SUMMARY TABLE */}
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3>🏦 Bank-wise Summary</h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '15px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1', borderBottom: '2px solid #bdc3c7' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Bank</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Amount (₦)</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(bankAnalytics.bankData).map(([bank, data]) => (
                    <tr key={bank} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{bank}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#27ae60' }}>
                        ₦{data.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#3498db', fontWeight: '600' }}>
                        {data.percentage}%
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold', borderTop: '2px solid #bdc3c7' }}>
                    <td style={{ padding: '12px' }}>TOTAL</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#27ae60' }}>
                      ₦{bankAnalytics.totalExpected.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#3498db' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TERM-WISE BREAKDOWN */}
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3>📚 Invoice Summary by Term</h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '15px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1', borderBottom: '2px solid #bdc3c7' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Term</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Invoices</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Total Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(bankAnalytics.termData).map(([termKey, termInfo]) => (
                    <tr key={termKey} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{termInfo.term || 'Unassigned'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{termInfo.totalInvoices}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#27ae60' }}>
                        ₦{termInfo.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold', borderTop: '2px solid #bdc3c7' }}>
                    <td style={{ padding: '12px' }}>TOTAL</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{bankAnalytics.totalInvoices}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#27ae60' }}>
                      ₦{bankAnalytics.totalExpected.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* EXPORT SECTION */}
            <div style={{ 
              marginTop: '30px',
              padding: '20px', 
              backgroundColor: '#f0f7ff', 
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📄 Export Reports</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    generateAnalyticsReportPDF({
                      totalInvoices: bankAnalytics.totalInvoices,
                      totalCollected: bankAnalytics.totalCollected,
                      outstandingBalance: bankAnalytics.totalExpected - bankAnalytics.totalCollected,
                      collectionRate: Math.round((bankAnalytics.totalCollected / bankAnalytics.totalExpected) * 100),
                      bankDistribution: Object.entries(bankAnalytics.bankData).map(([bank, data]) => ({
                        name: bank,
                        amount: data.amount,
                        percentage: parseFloat(data.percentage)
                      }))
                    }, 'Current Period');
                  }}
                  style={{ padding: '10px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  title="Export analytics and insights"
                >
                  📈 Analytics Report
                </button>
                <button 
                  onClick={() => {
                    generateFinancialSummaryPDF(invoices, payments, `All Invoices & Payments`);
                  }}
                  style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  title="Export financial summary as PDF"
                >
                  📊 Financial Summary
                </button>
                <button 
                  onClick={() => {
                    const debtors = invoices.filter(inv => inv.balanceDue > 0);
                    if (debtors.length === 0) {
                      alert('No debtors to report');
                      return;
                    }
                    generateDebtorsReportPDF(debtors, 'Director');
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

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div>
            <h2>🔔 Payment Notifications</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p>Recent payments recorded in the system (Last 7 days)</p>
              <button
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {payments.length > 0 ? (
                payments.map((payment, idx) => {
                  const display = getPaymentDisplay(payment);
                  return (
                    <div key={idx} style={{
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '10px',
                      borderLeft: '5px solid #27ae60',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
                            ✅ Invoice: {display.studentName}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#7f8c8d' }}>
                            <strong>Amount:</strong> {toCurrency(display.amount)}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#7f8c8d' }}>
                            <strong>Term:</strong> {display.termName}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#7f8c8d' }}>
                            <strong>Method:</strong> {display.paymentMethod}
                          </p>
                          <p style={{ margin: '0', color: '#95a5a6', fontSize: '12px' }}>
                            {new Date(payment.createdAt || payment.paymentDate).toLocaleString()}
                          </p>
                        </div>
                      <span style={{
                        backgroundColor: '#d5f4e6',
                        color: '#27ae60',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        New
                      </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#7f8c8d'
                }}>
                  No payment notifications in the last 7 days
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectorDashboard;
