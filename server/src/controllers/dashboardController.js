import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { isOverdue, ACTIVE_STATUSES } from '../utils/constants.js';
export async function dashboard(_req,res) {
 const [totalEmployees,active,inactive,onLeave,totalTasks,statusCounts,workload,tasks]=await Promise.all([
  Employee.countDocuments(),Employee.countDocuments({status:'Active'}),Employee.countDocuments({status:'Inactive'}),Employee.countDocuments({status:'On Leave'}),Task.countDocuments(),
  Promise.all(['Todo','In Progress','Completed','Cancelled'].map(async status=>({status,count:await Task.countDocuments({status})}))),
  Task.aggregate([{$match:{status:{$in:ACTIVE_STATUSES},assignedEmployee:{$ne:null}}},{$group:{_id:'$assignedEmployee',count:{$sum:1}}},{$sort:{count:-1}}]),
  Task.find().select('dueDate status')
 ]);
 const ids=workload.map(x=>x._id);
 const people=await Employee.find({_id:{$in:ids}}).select('fullName');
 const names=new Map(people.map(p=>[String(p._id),p.fullName]));
 res.json({employees:{total:totalEmployees,active,inactive,onLeave},tasks:{total:totalTasks,...Object.fromEntries(statusCounts.map(x=>[x.status.toLowerCase().replace(' ','_'),x.count])),overdue:tasks.filter(isOverdue).length},workload:workload.map(x=>({employee:names.get(String(x._id))||'Former employee',activeTasks:x.count}))});
}
