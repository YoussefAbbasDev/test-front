import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Auth/Login';
import { LoadingState, EmptyState } from './components/common/Feedback';
import { ShieldOff } from 'lucide-react';

const L = (fn, name) => lazy(() => fn().then((m) => ({ default: name ? m[name] : m.default })));

const Dashboard = L(() => import('./pages/Dashboard/Dashboard'));
const EmployeesList = L(() => import('./pages/Employees/EmployeesList'));
const EmployeeForm = L(() => import('./pages/Employees/EmployeeForm'));
const EmployeeProfile = L(() => import('./pages/Employees/EmployeeProfile'));
const OrgChart = L(() => import('./pages/Organization/OrgChart'));
const org = () => import('./pages/Organization/OrgResources');
const Branches = L(org, 'Branches');
const Departments = L(org, 'Departments');
const Teams = L(org, 'Teams');
const Positions = L(org, 'Positions');
const Grades = L(org, 'Grades');
const AttendanceDashboard = L(() => import('./pages/Attendance/AttendanceDashboard'));
const Records = L(() => import('./pages/Attendance/Records'));
const MyAttendance = L(() => import('./pages/Attendance/MyAttendance'));
const Corrections = L(() => import('./pages/Attendance/Corrections'));
const QrDisplay = L(() => import('./pages/Attendance/QrDisplay'));
const Kiosk = L(() => import('./pages/Attendance/Kiosk'));
const att = () => import('./pages/Attendance/AttendanceSettings');
const Policies = L(att, 'Policies');
const Locations = L(att, 'Locations');
const Devices = L(att, 'Devices');
const Scheduler = L(() => import('./pages/Shifts/Scheduler'));
const MyShifts = L(() => import('./pages/Shifts/MyShifts'));
const Exchanges = L(() => import('./pages/Shifts/Exchanges'));
const sh = () => import('./pages/Shifts/ShiftResources');
const ShiftDefinitions = L(sh, 'ShiftDefinitions');
const Rotations = L(sh, 'Rotations');
const Coverage = L(sh, 'Coverage');
const MyLeaves = L(() => import('./pages/Leaves/MyLeaves'));
const LeaveRequests = L(() => import('./pages/Leaves/LeaveRequests'));
const LeaveCalendar = L(() => import('./pages/Leaves/LeaveCalendar'));
const Balances = L(() => import('./pages/Leaves/Balances'));
const lv = () => import('./pages/Leaves/LeaveResources');
const LeaveTypes = L(lv, 'LeaveTypes');
const LeavePolicies = L(lv, 'LeavePolicies');
const Holidays = L(lv, 'Holidays');
const PayrollDashboard = L(() => import('./pages/Payroll/PayrollDashboard'));
const Runs = L(() => import('./pages/Payroll/Runs'));
const RunDetail = L(() => import('./pages/Payroll/RunDetail'));
const pr = () => import('./pages/Payroll/PayrollResources');
const Components = L(pr, 'Components');
const Structures = L(pr, 'Structures');
const Adjustments = L(pr, 'Adjustments');
const PayrollSettings = L(() => import('./pages/Payroll/PayrollSettings'));
const PayslipsList = L(() => import('./pages/Payslips/PayslipsList'));
const PayslipView = L(() => import('./pages/Payslips/PayslipView'));
const CommissionsDashboard = L(() => import('./pages/Commissions/CommissionsDashboard'));
const Ledger = L(() => import('./pages/Commissions/Ledger'));
const Rules = L(() => import('./pages/Commissions/Rules'));
const Sources = L(() => import('./pages/Commissions/Sources'));
const FinanceList = L(() => import('./pages/Finance/FinanceList'));
const FinanceDetail = L(() => import('./pages/Finance/FinanceDetail'));
const Settlements = L(() => import('./pages/Finance/Settlements'));
const Approvals = L(() => import('./pages/Approvals/Approvals'));
const Notifications = L(() => import('./pages/Notifications/Notifications'));
const st = () => import('./pages/Settings/Settings');
const CompanySettings = L(st, 'CompanySettings');
const Users = L(st, 'Users');
const Roles = L(st, 'Roles');
const Workflows = L(st, 'Workflows');
const SystemLimits = L(st, 'SystemLimits');
const AuditLog = L(st, 'AuditLog');
const Account = L(st, 'Account');
const Reports = L(() => import('./pages/Reports/Reports'));

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingState className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// Route guard mirrors backend permissions (the API is still the enforcement point)
function Guard({ perm, children }) {
  const { can } = useAuth();
  const { t } = useTranslation();
  if (perm && !can(perm)) return <EmptyState icon={ShieldOff} title={t('errors.forbidden')} hint=" " />;
  return children;
}

function Home() {
  const { can } = useAuth();
  return can('dashboard.view') ? <Dashboard /> : <Navigate to="/attendance/me" replace />;
}

const g = (perm, el) => <Guard perm={perm}>{el}</Guard>;

export default function App() {
  const { user, ready } = useAuth();
  return (
    <Suspense fallback={<LoadingState className="min-h-screen" />}>
      <Routes>
        <Route path="/login" element={ready && user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route element={<Protected><AppLayout /></Protected>}>
          <Route index element={<Home />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="account" element={<Account />} />
          <Route path="employees" element={g('employees.view', <EmployeesList />)} />
          <Route path="employees/new" element={g('employees.create', <EmployeeForm />)} />
          <Route path="employees/:id" element={g('employees.view', <EmployeeProfile />)} />
          <Route path="employees/:id/edit" element={g('employees.edit', <EmployeeForm />)} />
          <Route path="organization" element={g('organization.view', <OrgChart />)} />
          <Route path="organization/branches" element={g('organization.view', <Branches />)} />
          <Route path="organization/departments" element={g('organization.view', <Departments />)} />
          <Route path="organization/teams" element={g('organization.view', <Teams />)} />
          <Route path="organization/positions" element={g('organization.view', <Positions />)} />
          <Route path="organization/grades" element={g('organization.view', <Grades />)} />
          <Route path="attendance" element={g('attendance.view', <AttendanceDashboard />)} />
          <Route path="attendance/me" element={g('attendance.view', <MyAttendance />)} />
          <Route path="attendance/records" element={g('attendance.view', <Records />)} />
          <Route path="attendance/corrections" element={g('attendance.view', <Corrections />)} />
          <Route path="attendance/reports" element={g('attendance.view', <Reports module="attendance" />)} />
          <Route path="attendance/qr" element={g(['attendance.settings', 'attendance.manual'], <QrDisplay />)} />
          <Route path="attendance/policies" element={g('attendance.settings', <Policies />)} />
          <Route path="attendance/locations" element={g('attendance.settings', <Locations />)} />
          <Route path="attendance/devices" element={g('attendance.settings', <Devices />)} />
          <Route path="shifts" element={g('shifts.view', <Scheduler />)} />
          <Route path="shifts/my" element={g('shifts.view', <MyShifts />)} />
          <Route path="shifts/exchanges" element={g('shifts.view', <Exchanges />)} />
          <Route path="shifts/definitions" element={g('shifts.view', <ShiftDefinitions />)} />
          <Route path="shifts/rotations" element={g('shifts.view', <Rotations />)} />
          <Route path="shifts/coverage" element={g('shifts.view', <Coverage />)} />
          <Route path="shifts/reports" element={g('shifts.view', <Reports module="shifts" />)} />
          <Route path="leaves" element={g('leaves.view', <LeaveRequests />)} />
          <Route path="leaves/my" element={g('leaves.view', <MyLeaves />)} />
          <Route path="leaves/calendar" element={g('leaves.view', <LeaveCalendar />)} />
          <Route path="leaves/balances" element={g('leaves.view', <Balances />)} />
          <Route path="leaves/types" element={g('leaves.view', <LeaveTypes />)} />
          <Route path="leaves/policies" element={g('leaves.view', <LeavePolicies />)} />
          <Route path="leaves/holidays" element={g('leaves.view', <Holidays />)} />
          <Route path="leaves/reports" element={g('leaves.view', <Reports module="leaves" />)} />
          <Route path="payroll" element={g('payroll.view', <PayrollDashboard />)} />
          <Route path="payroll/runs" element={g('payroll.view', <Runs />)} />
          <Route path="payroll/runs/:id" element={g('payroll.view', <RunDetail />)} />
          <Route path="payroll/components" element={g('payroll.view', <Components />)} />
          <Route path="payroll/structures" element={g('payroll.view', <Structures />)} />
          <Route path="payroll/adjustments" element={g('payroll.view', <Adjustments />)} />
          <Route path="payroll/settings" element={g('payroll.view', <PayrollSettings />)} />
          <Route path="payroll/reports" element={g('payroll.view', <Reports module="payroll" />)} />
          <Route path="payslips" element={g('payslips.view', <PayslipsList />)} />
          <Route path="payslips/:id" element={g('payslips.view', <PayslipView />)} />
          <Route path="commissions" element={g('commissions.view', <CommissionsDashboard />)} />
          <Route path="commissions/my" element={g('commissions.view', <Ledger mine />)} />
          <Route path="commissions/ledger" element={g('commissions.view', <Ledger />)} />
          <Route path="commissions/rules" element={g('commissions.view', <Rules />)} />
          <Route path="commissions/sources" element={g('commissions.view', <Sources />)} />
          <Route path="finance" element={g(['advances.view', 'loans.view'], <FinanceList />)} />
          <Route path="finance/my" element={g(['advances.view', 'loans.view'], <FinanceList mine />)} />
          <Route path="finance/settlements" element={g(['loans.view', 'payroll.view'], <Settlements />)} />
          <Route path="finance/:kind/:id" element={<FinanceDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={g('settings.view', <CompanySettings />)} />
          <Route path="settings/users" element={g('users.view', <Users />)} />
          <Route path="settings/roles" element={g('users.view', <Roles />)} />
          <Route path="settings/workflows" element={g('settings.view', <Workflows />)} />
          <Route path="settings/system" element={g('settings.view', <SystemLimits />)} />
          <Route path="settings/audit" element={g('audit.view', <AuditLog />)} />
          <Route path="*" element={<EmptyState title="404" hint=" " />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
