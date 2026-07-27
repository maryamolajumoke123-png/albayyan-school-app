import React, { useState } from 'react';
import axios from 'axios';
import SchoolHeader from './SchoolHeader';
import './ParentDashboard.css';
import { getApiUrl } from './utils/supabaseClient';

const API_URL = getApiUrl();

export default function ParentDashboard() {
  const [admissionNum, setAdmissionNum] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/students/${admissionNum}/invoices`);
      setStudentData(response.data);
    } catch (err) {
      setError('Student not found. Please check the admission number.');
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parent-dashboard-container">
      <SchoolHeader />

      <div className="parent-search-section">
        <form onSubmit={fetchInvoices} className="parent-search-form">
          <div className="parent-search-wrapper">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Enter Student Admission Number"
              value={admissionNum}
              onChange={(e) => setAdmissionNum(e.target.value)}
              className="parent-search-input"
              required
            />
          </div>
          <button type="submit" className="parent-search-button" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>Checking...
              </>
            ) : (
              <>
                <i className="fas fa-magnifying-glass"></i>Check Fees
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="parent-error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {studentData && (
        <div className="parent-student-info">
          <div className="parent-info-header">
            <div className="parent-info-header-content">
              <i className="fas fa-user-circle"></i>
              <div>
                <h2>{studentData.studentName}</h2>
                <p><i className="fas fa-graduation-cap"></i> Class: {studentData.class}</p>
              </div>
            </div>
          </div>

          <div className="parent-section-title">
            <i className="fas fa-file-invoice"></i>
            <h3>Outstanding Invoices</h3>
          </div>

          {studentData.outstandingInvoices.length === 0 ? (
            <div className="parent-no-fees">
              <i className="fas fa-check-circle"></i>
              <p>No outstanding fees. Thank you!</p>
            </div>
          ) : (
            <div className="parent-invoices-list">
              {studentData.outstandingInvoices.map((invoice) => (
                <div key={invoice.id} className="parent-invoice-card">
                  <div className="parent-invoice-header">
                    <div className="parent-invoice-term">
                      <i className="fas fa-calendar-alt"></i>
                      {invoice.feeStructure.academicTerm}
                    </div>
                    <span className={`parent-status-badge status-${invoice.status.toLowerCase()}`}>
                      <i className={`fas fa-${invoice.status === 'Paid' ? 'check' : 'clock'}`}></i>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="parent-invoice-details">
                    <div className="detail-item">
                      <i className="fas fa-calendar-check"></i>
                      <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="parent-invoice-amount">
                    <div className="amount-box">
                      <span className="amount-label">📊 Expected Amount:</span>
                      <p className="amount-value">₦{invoice.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="amount-box">
                      <span className="amount-label">💵 Amount Paid:</span>
                      <p className="amount-value paid">₦{invoice.amountPaid.toLocaleString()}</p>
                    </div>
                    <div className="amount-box highlight">
                      <span className="amount-label">🔴 Balance Due:</span>
                      <p className="amount-value balance">₦{invoice.balanceDue.toLocaleString()}</p>
                    </div>
                  </div>

                  <button className="parent-pay-button">
                    <i className="fas fa-credit-card"></i>Pay Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
