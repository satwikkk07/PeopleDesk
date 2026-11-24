import {Router} from 'express';
import {listEmployees,getEmployee,createEmployee,updateEmployee,deleteEmployee} from '../controllers/employeeController.js';
const router=Router();
router.route('/').get(listEmployees).post(createEmployee);
router.route('/:id').get(getEmployee).put(updateEmployee).delete(deleteEmployee);
export default router;
