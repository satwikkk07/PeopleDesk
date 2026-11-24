export const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'On Leave'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const TASK_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
export const PRIORITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };
export const ACTIVE_STATUSES = ['Todo', 'In Progress'];
export const isOverdue = task => new Date(new Date().toISOString().slice(0,10)) > new Date(new Date(task.dueDate).toISOString().slice(0,10)) && !['Completed','Cancelled'].includes(task.status);
