-- ==============================================================================
-- SISTEM ABSENSI BIOMETRIK & GEOFENCING (POSTGRESQL DDL)
-- Kepatuhan UU PDP No. 27/2022 & Zero-Trust Security Standard
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'HR_ADMIN', 'EMPLOYEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_type AS ENUM ('CHECK_IN', 'CHECK_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'OVERTIME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_type AS ENUM ('SICK', 'PERMIT', 'ANNUAL_LEAVE', 'OUTSTATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ENROLL_FACE', 'DEVICE_BIND', 'RESET_FACE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. TABEL CABANG / LOKASI KANTOR
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 150 CHECK (radius_meters >= 10 AND radius_meters <= 2000),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL SHIFT & JAM KERJA
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
    early_departure_tolerance_minutes INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL USERS / KARYAWAN
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nik VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(25),
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    device_id VARCHAR(255),
    device_name VARCHAR(150),
    device_bound_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    pdp_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    pdp_consent_at TIMESTAMP WITH TIME ZONE,
    refresh_token_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL FACE TEMPLATES TERENKRIPSI
CREATE TABLE IF NOT EXISTS face_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_embedding TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 3,
    model_version VARCHAR(50) NOT NULL DEFAULT 'face-api-ssd-mobilenet',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 5. TABEL ATTENDANCES
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    type attendance_type NOT NULL,
    status attendance_status NOT NULL,
    timestamp_server TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NOT NULL,
    distance_to_office_meters DECIMAL(8, 2) NOT NULL,
    is_within_geofence BOOLEAN NOT NULL,
    is_mock_location_detected BOOLEAN NOT NULL DEFAULT FALSE,
    face_match_score DECIMAL(5, 4) NOT NULL,
    liveness_verified BOOLEAN NOT NULL DEFAULT TRUE,
    device_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    snapshot_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABEL LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status approval_status NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action_type NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, timestamp_server);
CREATE INDEX IF NOT EXISTS idx_attendances_branch_date ON attendances(branch_id, timestamp_server);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
