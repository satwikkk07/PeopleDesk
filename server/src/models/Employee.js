import mongoose from 'mongoose';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../utils/constants.js';
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  department: { type: String, required: true, enum: DEPARTMENTS },
  role: { type: String, required: true, trim: true },
  joiningDate: { type: Date, required: true },
  status: { type: String, enum: EMPLOYEE_STATUSES, default: 'Active' },
  skills: [{ type: String, trim: true }],
  leaveStart: Date,
  leaveEnd: Date
}, { timestamps: true });
employeeSchema.pre('validate', function(next) {
  if (this.status === 'On Leave') {
    if (!this.leaveStart || !this.leaveEnd || this.leaveEnd < this.leaveStart) this.invalidate('leaveStart', 'Valid leave start and end dates are required.');
  } else { this.leaveStart = undefined; this.leaveEnd = undefined; }
  next();
});
export default mongoose.model('Employee', employeeSchema);
