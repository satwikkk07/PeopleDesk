import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { ACTIVE_STATUSES } from '../utils/constants.js';

export async function listEmployees(req, res) {
  const { page=1, limit=10, search='', department='', status='', sort='fullName' } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) filter.$or = [{ fullName: new RegExp(search, 'i') }, { employeeId: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const p = Math.max(1, Number(page)), l = Math.min(100, Math.max(1, Number(limit)));
  const [items,total] = await Promise.all([Employee.find(filter).sort({[sort]:1}).skip((p-1)*l).limit(l), Employee.countDocuments(filter)]);
  res.json({ items, total, page:p, pages:Math.ceil(total/l) });
}
export async function getEmployee(req,res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({message:'Employee not found.'});
  res.json(employee);
}
export async function createEmployee(req,res) {
  const data = {...req.body, email:String(req.body.email || '').trim().toLowerCase()};
  const employee = await Employee.create(data);
  res.status(201).json(employee);
}
export async function updateEmployee(req,res) {
  const data = {...req.body, email:String(req.body.email || '').trim().toLowerCase()};
  delete data.employeeId; // Employee ID is immutable after creation.
  const employee = await Employee.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true});
  if (!employee) return res.status(404).json({message:'Employee not found.'});
  res.json(employee);
}
export async function deleteEmployee(req,res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({message:'Employee not found.'});
  const active = await Task.exists({assignedEmployee:employee._id,status:{$in:ACTIVE_STATUSES}});
  if (active) return res.status(400).json({message:'This employee still has active tasks. Complete or cancel them before deleting.'});
  await Task.updateMany({assignedEmployee:employee._id},{$set:{assignedEmployee:null}});
  await Employee.deleteOne({_id:employee._id});
  res.json({message:'Employee deleted. Historical task details have been preserved.'});
}
