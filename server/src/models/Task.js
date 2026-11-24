import mongoose from 'mongoose';
import { DEPARTMENTS, PRIORITIES, TASK_STATUSES } from '../utils/constants.js';
const taskSchema = new mongoose.Schema({
  taskCode: { type: String, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, default: '' },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  employeeSnapshot: { name: String, employeeId: String, department: String },
  department: { type: String, required: true, enum: DEPARTMENTS },
  priority: { type: String, required: true, enum: PRIORITIES, default: 'Medium' },
  status: { type: String, enum: TASK_STATUSES, default: 'Todo' },
  startDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  completedDate: Date
}, { timestamps: true });
taskSchema.pre('validate', function(next) {
  if (this.startDate && this.dueDate && new Date(this.dueDate) < new Date(this.startDate)) this.invalidate('dueDate', 'Due date cannot be earlier than start date.');
  next();
});
taskSchema.pre('save', async function() {
  if (!this.taskCode && this.isNew) this.taskCode = `TSK-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*90+10)}`;
});
export default mongoose.model('Task', taskSchema);
