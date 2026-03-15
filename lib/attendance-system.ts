import { prisma } from '@/lib/db';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type StudentChannelType = 'CENTER' | 'ONLINE';

export async function ensureAttendanceTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS student_channels (
      user_id TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
      channel_type TEXT NOT NULL DEFAULT 'ONLINE' CHECK (channel_type IN ('CENTER', 'ONLINE')),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
      source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'QR')),
      notes TEXT,
      checkin_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, attendance_date)
    );
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(user_id);`
  );
}

export function normalizeAttendanceStatus(value: string | null | undefined): AttendanceStatus {
  if (value === 'absent' || value === 'late' || value === 'excused') return value;
  return 'present';
}

export function normalizeChannelType(value: string | null | undefined): StudentChannelType {
  return value === 'CENTER' ? 'CENTER' : 'ONLINE';
}
