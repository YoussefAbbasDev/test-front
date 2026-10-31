import {
  LayoutDashboard, Users, Network, Fingerprint, CalendarClock, Plane, Wallet, ReceiptText, BadgePercent, HandCoins, Settings, CheckSquare, BarChart3,
} from 'lucide-react';

// Sidebar sections (spec order). `perm` hides items the user cannot use; the API enforces the same codes.
export const NAV = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard, perm: 'dashboard.view', end: true },
  { key: 'approvals', to: '/approvals', icon: CheckSquare, badge: 'approvals' },
  {
    key: 'employees', to: '/employees', icon: Users, perm: 'employees.view',
  },
  {
    key: 'organization', icon: Network, perm: 'organization.view', children: [
      { key: 'chart', to: '/organization' , end: true },
      { key: 'branches', to: '/organization/branches', perm: 'organization.create' },
      { key: 'departments', to: '/organization/departments' },
      { key: 'teams', to: '/organization/teams' },
      { key: 'positions', to: '/organization/positions' },
      { key: 'grades', to: '/organization/grades', perm: 'organization.create' },
    ],
  },
  {
    key: 'attendance', icon: Fingerprint, perm: 'attendance.view', children: [
      { key: 'myAttendance', to: '/attendance/me', perm: 'attendance.create' },
      { key: 'overview', to: '/attendance', end: true, perm: 'attendance.export' },
      { key: 'records', to: '/attendance/records', perm: 'attendance.export' },
      { key: 'corrections', to: '/attendance/corrections' },
      { key: 'reports', to: '/attendance/reports', perm: 'attendance.export' },
      { key: 'qr', to: '/attendance/qr', perm: ['attendance.settings', 'attendance.manual'] },
      { key: 'policies', to: '/attendance/policies', perm: 'attendance.settings' },
      { key: 'locations', to: '/attendance/locations', perm: 'attendance.settings' },
      { key: 'devices', to: '/attendance/devices', perm: 'attendance.settings' },
    ],
  },
  {
    key: 'shifts', icon: CalendarClock, perm: 'shifts.view', children: [
      { key: 'myShifts', to: '/shifts/my' },
      { key: 'scheduler', to: '/shifts', end: true, perm: 'shifts.create' },
      { key: 'exchanges', to: '/shifts/exchanges' },
      { key: 'definitions', to: '/shifts/definitions', perm: 'shifts.settings' },
      { key: 'rotations', to: '/shifts/rotations', perm: 'shifts.settings' },
      { key: 'coverage', to: '/shifts/coverage', perm: 'shifts.create' },
      { key: 'reports', to: '/shifts/reports', perm: 'shifts.export' },
    ],
  },
  {
    key: 'leaves', icon: Plane, perm: 'leaves.view', children: [
      { key: 'myLeaves', to: '/leaves/my' },
      { key: 'requests', to: '/leaves', end: true, perm: 'leaves.approve' },
      { key: 'calendar', to: '/leaves/calendar' },
      { key: 'balances', to: '/leaves/balances', perm: 'leaves.export' },
      { key: 'types', to: '/leaves/types', perm: 'leaves.settings' },
      { key: 'policies', to: '/leaves/policies', perm: 'leaves.settings' },
      { key: 'holidays', to: '/leaves/holidays', perm: 'leaves.settings' },
      { key: 'reports', to: '/leaves/reports', perm: 'leaves.export' },
    ],
  },
  {
    key: 'payroll', icon: Wallet, perm: 'payroll.view', children: [
      { key: 'overview', to: '/payroll', end: true },
      { key: 'runs', to: '/payroll/runs' },
      { key: 'adjustments', to: '/payroll/adjustments' },
      { key: 'components', to: '/payroll/components' },
      { key: 'structures', to: '/payroll/structures' },
      { key: 'payrollSettings', to: '/payroll/settings' },
      { key: 'reports', to: '/payroll/reports', perm: 'payroll.export' },
    ],
  },
  { key: 'payslips', to: '/payslips', icon: ReceiptText, perm: 'payslips.view' },
  {
    key: 'commissions', icon: BadgePercent, perm: 'commissions.view', children: [
      { key: 'myCommissions', to: '/commissions/my' },
      { key: 'overview', to: '/commissions', end: true, perm: 'commissions.export' },
      { key: 'ledger', to: '/commissions/ledger', perm: 'commissions.export' },
      { key: 'sources', to: '/commissions/sources', perm: 'commissions.create' },
      { key: 'rules', to: '/commissions/rules', perm: 'commissions.settings' },
    ],
  },
  {
    key: 'advances', icon: HandCoins, perm: ['advances.view', 'loans.view'], children: [
      { key: 'myRequests', to: '/finance/my' },
      { key: 'requests', to: '/finance', end: true, perm: ['advances.approve', 'loans.approve', 'advances.export'] },
      { key: 'settlements', to: '/finance/settlements', perm: 'loans.edit' },
    ],
  },
  { key: 'reports', to: '/reports', icon: BarChart3, perm: ['attendance.export', 'leaves.export', 'payroll.export', 'shifts.export'] },
  {
    key: 'settings', icon: Settings, perm: ['settings.view', 'users.view', 'audit.view'], children: [
      { key: 'company', to: '/settings', end: true, perm: 'settings.view' },
      { key: 'users', to: '/settings/users', perm: 'users.view' },
      { key: 'roles', to: '/settings/roles', perm: 'users.view' },
      { key: 'workflows', to: '/settings/workflows', perm: 'settings.view' },
      { key: 'systemSettings', to: '/settings/system', perm: 'settings.view' },
      { key: 'audit', to: '/settings/audit', perm: 'audit.view' },
    ],
  },
];
