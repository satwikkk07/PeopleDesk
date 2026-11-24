import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import { ACTIVE_STATUSES, PRIORITY_ORDER, isOverdue } from '../utils/constants.js';
import { validateAssignment } from '../utils/taskRules.js';

function filters(q) {
  const f = {};
  if (q.department) f.department=q.department;
  if (q.priority) f.priority=q.priority;
  if (q.status) f.status=q.status;
  if (q.dueFrom || q.dueTo) f.dueDate={};
  if (q.dueFrom) f.dueDate.$gte=new Date(q.dueFrom);
  if (q.dueTo) f.dueDate.$lte=new Date(q.dueTo);
  return f;
}
async function matchingQuery(q) {
  const f=filters(q);
  if (q.search) {
    const employees=await Employee.find({fullName:new RegExp(q.search,'i')}).select('_id');
    f.$or=[{title:new RegExp(q.search,'i')},{'employeeSnapshot.name':new RegExp(q.search,'i')},{assignedEmployee:{$in:employees.map(e=>e._id)}}];
  }
  return f;
}
export async function listTasks(req,res) {
  const f=await matchingQuery(req.query);
  const p=Math.max(1,Number(req.query.page||1)), l=Math.min(100,Math.max(1,Number(req.query.limit||10)));
  const sortKey=req.query.sort||'createdAt';
  const sort=sortKey==='priority' ? {priority:-1,createdAt:-1} : {[sortKey]:sortKey==='title'?1: -1};
  const [items,total]=await Promise.all([Task.find(f).populate('assignedEmployee','fullName employeeId').sort(sort).skip((p-1)*l).limit(l),Task.countDocuments(f)]);
  res.json({items:items.map(t=>({...t.toObject(),overdue:isOverdue(t)})),total,page:p,pages:Math.ceil(total/l)});
}
export async function getTask(req,res) {
  const task=await Task.findById(req.params.id).populate('assignedEmployee','fullName employeeId');
  if(!task)return res.status(404).json({message:'Task not found.'});
  res.json({...task.toObject(),overdue:isOverdue(task)});
}
export async function createTask(req,res) {
  const {title,description,assignedEmployee,department,priority,startDate,dueDate}=req.body;
  if(new Date(dueDate)<new Date(startDate)) return res.status(400).json({message:'Due date cannot be earlier than start date.'});
  const check=await validateAssignment(assignedEmployee,startDate);
  if(check.error)return res.status(400).json({message:check.error});
  const task=await Task.create({title,description,assignedEmployee,employeeSnapshot:{name:check.employee.fullName,employeeId:check.employee.employeeId,department:check.employee.department},department,priority,startDate,dueDate,status:'Todo'});
  res.status(201).json(task);
}
export async function updateTask(req,res) {
  const task=await Task.findById(req.params.id);
  if(!task)return res.status(404).json({message:'Task not found.'});
  if(['Completed','Cancelled'].includes(task.status))return res.status(400).json({message:'Completed or cancelled tasks cannot be edited.'});
  if('status' in req.body || 'completedDate' in req.body)return res.status(400).json({message:'Use the status endpoint to change task status.'});
  const data={...req.body};
  if(data.dueDate && data.startDate && new Date(data.dueDate)<new Date(data.startDate))return res.status(400).json({message:'Due date cannot be earlier than start date.'});
  if(data.assignedEmployee && String(data.assignedEmployee)!==String(task.assignedEmployee)) {
    const check=await validateAssignment(data.assignedEmployee,data.startDate||task.startDate,task._id);
    if(check.error)return res.status(400).json({message:check.error});
    data.employeeSnapshot={name:check.employee.fullName,employeeId:check.employee.employeeId,department:check.employee.department};
  }
  Object.assign(task,data); await task.save(); res.json(task);
}
export async function changeTaskStatus(req,res) {
  const task=await Task.findById(req.params.id);
  if(!task)return res.status(404).json({message:'Task not found.'});
  const allowed={Todo:['In Progress','Cancelled'],'In Progress':['Completed','Cancelled']};
  if(!(allowed[task.status]||[]).includes(req.body.status))return res.status(400).json({message:`Cannot change status from ${task.status} to ${req.body.status}.`});
  task.status=req.body.status;
  if(task.status==='Completed')task.completedDate=new Date();
  await task.save(); res.json(task);
}
export async function deleteTask(req,res) {
  const task=await Task.findByIdAndDelete(req.params.id);
  if(!task)return res.status(404).json({message:'Task not found.'});
  res.json({message:'Task deleted.'});
}
export async function exportTasks(req,res) {
  const f=await matchingQuery(req.query);
  const tasks=await Task.find(f).sort({createdAt:-1});
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const rows=[['Task ID','Title','Employee','Department','Priority','Status','Start Date','Due Date','Overdue'],...tasks.map(t=>[t.taskCode,t.title,t.employeeSnapshot?.name,t.department,t.priority,t.status,new Date(t.startDate).toISOString().slice(0,10),new Date(t.dueDate).toISOString().slice(0,10),isOverdue(t)?'Yes':'No'])];
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="tasks.csv"');
  res.send(rows.map(r=>r.map(esc).join(',')).join('\n'));
}
