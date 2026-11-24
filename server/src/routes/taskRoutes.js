import {Router} from 'express';
import {listTasks,getTask,createTask,updateTask,changeTaskStatus,deleteTask,exportTasks} from '../controllers/taskController.js';
const router=Router();
router.get('/export/csv',exportTasks);
router.route('/').get(listTasks).post(createTask);
router.put('/:id/status',changeTaskStatus);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
export default router;
