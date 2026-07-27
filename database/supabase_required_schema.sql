-- Supabase schema required by the Albayyan backend
-- Apply this SQL in your Supabase project's SQL editor.

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  school VARCHAR(100) NOT NULL,
  class_level VARCHAR(100) NOT NULL,
  parent_phone_number VARCHAR(50) NOT NULL,
  boarding_status BOOLEAN NOT NULL DEFAULT false,
  takes_school_bus BOOLEAN NOT NULL DEFAULT false,
  is_new_student BOOLEAN NOT NULL DEFAULT true,
  joined_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);
CREATE INDEX IF NOT EXISTS idx_students_class_level ON students(class_level);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Terms table
CREATE TABLE IF NOT EXISTS terms (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_terms_session_id ON terms(session_id);
CREATE INDEX IF NOT EXISTS idx_terms_is_active ON terms(is_active);

-- Fee structures table
CREATE TABLE IF NOT EXISTS fee_structures (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  term_id BIGINT REFERENCES terms(id) ON DELETE CASCADE,
  class_level VARCHAR(100) NOT NULL,
  new_student_base_tuition DECIMAL(15, 2) NOT NULL DEFAULT 0,
  new_student_boarding_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  new_student_school_bus_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  new_student_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  returning_student_base_tuition DECIMAL(15, 2) NOT NULL DEFAULT 0,
  returning_student_boarding_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  returning_student_school_bus_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  returning_student_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_term_id ON fee_structures(term_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_level ON fee_structures(class_level);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
  fee_structure_id BIGINT REFERENCES fee_structures(id) ON DELETE SET NULL,
  term_id BIGINT REFERENCES terms(id) ON DELETE SET NULL,
  is_new_student BOOLEAN NOT NULL DEFAULT false,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(15, 2) NOT NULL DEFAULT 0,
  carried_forward_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_term_id ON invoices(term_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Carry forwards table
CREATE TABLE IF NOT EXISTS carry_forwards (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
  from_term_id BIGINT REFERENCES terms(id) ON DELETE SET NULL,
  to_term_id BIGINT REFERENCES terms(id) ON DELETE SET NULL,
  balance_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  applied_to_invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carry_forwards_student_id ON carry_forwards(student_id);
CREATE INDEX IF NOT EXISTS idx_carry_forwards_from_term_id ON carry_forwards(from_term_id);
CREATE INDEX IF NOT EXISTS idx_carry_forwards_to_term_id ON carry_forwards(to_term_id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
  bank_name VARCHAR(100),
  receipt_number VARCHAR(100) UNIQUE,
  paid_by_name VARCHAR(150),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_reference VARCHAR(100),
  recorded_by VARCHAR(100) DEFAULT 'System',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
