import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { ACTIVE_STATUSES } from './constants.js';

export async function validateAssignment(employeeId, startDate, ignoreTaskId = null) {
  const employee = await Employee.findById(employeeId);
  if (!employee) return { error: 'Please select a valid employee.' };
  if (employee.status === 'Inactive') return { error: 'Inactive employees cannot be assigned tasks.' };
  const start = new Date(new Date(startDate).toISOString().slice(0,10));
  if (employee.status === 'On Leave' && employee.leaveStart && employee.leaveEnd) {
    const from = new Date(new Date(employee.leaveStart).toISOString().slice(0,10));
    const to = new Date(new Date(employee.leaveEnd).toISOString().slice(0,10));
    if (start >= from && start <= to) return { error: 'This employee is on leave during the task start date.' };
  }
  const query = { assignedEmployee: employee._id, status: { $in: ACTIVE_STATUSES } };
  if (ignoreTaskId) query._id = { $ne: ignoreTaskId };
  const count = await Task.countDocuments(query);
  if (count >= 3) return { error: 'This employee already has 3 active tasks.' };
  return { employee };
}
