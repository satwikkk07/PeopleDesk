
import React, { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import api from './api';

const departments = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Todo', 'In Progress', 'Completed', 'Cancelled'];

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'Something went wrong. Please try again.'
  );
}

function Shell({ children }) {
  return (
    <>
      <header>
        <Link to="/" className="brand">PeopleDesk</Link>

        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/employees">Employees</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
        </nav>

        <span className="header-note">TEAM OPERATIONS</span>
      </header>

      <main>{children}</main>

      <footer>
        PeopleDesk <span>Employee & task workspace</span>
      </footer>
    </>
  );
}

function Notice({ message }) {
  return message ? <div className="notice">{message}</div> : null;
}

// ---------------- DASHBOARD ----------------

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/dashboard')
      .then(response => {
        if (active) setData(response.data);
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, []);

  const employees = data?.employees || {};
  const tasks = data?.tasks || {};
  const workload = Array.isArray(data?.workload) ? data.workload : [];

  const stats = [
    ['Employees', employees.total ?? 0],
    ['Active', employees.active ?? 0],
    ['Inactive', employees.inactive ?? 0],
    ['On leave', employees.onLeave ?? 0],
    ['All tasks', tasks.total ?? 0],
    ['To do', tasks.todo ?? 0],
    ['In progress', tasks.in_progress ?? 0],
    ['Completed', tasks.completed ?? 0],
    ['Cancelled', tasks.cancelled ?? 0],
    ['Overdue', tasks.overdue ?? 0]
  ];

  return (
    <Shell>
      <div className="page-head">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="muted">
            A quick look at your people and current workload.
          </p>
        </div>

        <Link className="button" to="/tasks/new">＋ New task</Link>
      </div>

      <Notice message={error} />

      {!data ? (
        <p>Loading dashboard…</p>
      ) : (
        <>
          <section className="stats">
            {stats.map(([label, value]) => (
              <article className="stat" key={label}>
                <span>{label}</span>
                <strong className={label === 'Overdue' ? 'red' : ''}>
                  {value}
                </strong>
              </article>
            ))}
          </section>

          <section className="panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">CAPACITY</p>
                <h2>Employee workload</h2>
              </div>

              <Link to="/employees">View employees →</Link>
            </div>

            {workload.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Active tasks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workload.map((item, index) => (
                      <tr key={item.employee || index}>
                        <td>{item.employee}</td>
                        <td><b>{item.activeTasks} / 3</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No active assignments yet.</p>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}

// ---------------- EMPLOYEE / TASK LIST ----------------

function ListPage({ kind }) {
  const loc = useLocation();
  const nav = useNavigate();

  const isTask = kind === 'tasks';
  const params = new URLSearchParams(loc.search);

  const [data, setData] = useState({
    items: [],
    total: 0,
    pages: 0,
    page: 1
  });

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [updatingId, setUpdatingId] = useState('');

  const [search, setSearch] = useState(params.get('search') || '');

  const [filter, setFilter] = useState({
    department: params.get('department') || '',
    status: params.get('status') || '',
    priority: params.get('priority') || '',
    sort: params.get('sort') || (isTask ? 'createdAt' : 'fullName')
  });

  // Fetch records whenever URL filters or reload changes.
  useEffect(() => {
    let active = true;

    const query = Object.fromEntries(
      new URLSearchParams(loc.search).entries()
    );

    setSearch(query.search || '');

    setFilter({
      department: query.department || '',
      status: query.status || '',
      priority: query.priority || '',
      sort: query.sort || (isTask ? 'createdAt' : 'fullName')
    });

    setBusy(true);
    setError('');

    api.get(`/${kind}`, { params: query })
      .then(response => {
        if (!active) return;

        const result = response.data || {};

        setData({
          items: Array.isArray(result.items) ? result.items : [],
          total: Number(result.total) || 0,
          pages: Number(result.pages) || 0,
          page: Number(result.page) || 1
        });
      })
      .catch(error => {
        if (!active) return;

        setError(getErrorMessage(error));

        setData({
          items: [],
          total: 0,
          pages: 0,
          page: 1
        });
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [loc.search, kind, reload, isTask]);

  // Update URL query parameters.
  function updateQuery(next) {
    const query = new URLSearchParams(loc.search);

    Object.entries(next).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        query.set(key, value);
      } else {
        query.delete(key);
      }
    });

    // Reset pagination only when changing filters/search.
    if (!Object.prototype.hasOwnProperty.call(next, 'page')) {
      query.set('page', '1');
    }

    nav({
      pathname: loc.pathname,
      search: query.toString()
    });
  }

  // Update task status and reload the current list.
  async function changeStatus(id, status) {
    try {
      setUpdatingId(id);
      setError('');

      await api.put(`/tasks/${id}/status`, { status });

      setReload(value => value + 1);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdatingId('');
    }
  }

  function exportCsv() {
    const baseUrl =
      import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    window.location.href =
      `${baseUrl}/tasks/export/csv?${params.toString()}`;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const currentPage = data.page || Number(params.get('page')) || 1;
  const totalPages = Math.max(1, data.pages || 1);

  return (
    <Shell>
      <div className="page-head">
        <div>
          <p className="eyebrow">DIRECTORY</p>
          <h1>{isTask ? 'Tasks' : 'Employees'}</h1>
          <p className="muted">
            {isTask
              ? 'Track assignments, deadlines and progress.'
              : 'Manage your team and employee information.'}
          </p>
        </div>

        <div className="actions">
          <Link className="button" to={`/${kind}/new`}>
            ＋ Add {isTask ? 'task' : 'employee'}
          </Link>

          {isTask && (
            <button className="button secondary" onClick={exportCsv}>
              Export CSV ↓
            </button>
          )}
        </div>
      </div>

      <Notice message={error} />

      <section className="panel">
        <div className="filters">
          <input
            placeholder={
              isTask
                ? 'Search title or employee'
                : 'Search name, ID or email'
            }
            value={search}
            onChange={event => setSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                updateQuery({ search });
              }
            }}
          />

          <button
            className="button small"
            onClick={() => updateQuery({ search })}
          >
            Search
          </button>

          <select
            value={filter.department}
            onChange={event => {
              setFilter(previous => ({
                ...previous,
                department: event.target.value
              }));

              updateQuery({ department: event.target.value });
            }}
          >
            <option value="">All departments</option>
            {departments.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          {isTask && (
            <select
              value={filter.priority}
              onChange={event => {
                setFilter(previous => ({
                  ...previous,
                  priority: event.target.value
                }));

                updateQuery({ priority: event.target.value });
              }}
            >
              <option value="">All priorities</option>
              {priorities.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          )}

          <select
            value={filter.status}
            onChange={event => {
              setFilter(previous => ({
                ...previous,
                status: event.target.value
              }));

              updateQuery({ status: event.target.value });
            }}
          >
            <option value="">All statuses</option>

            {(isTask
              ? statuses
              : ['Active', 'Inactive', 'On Leave']
            ).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={filter.sort}
            onChange={event => {
              setFilter(previous => ({
                ...previous,
                sort: event.target.value
              }));

              updateQuery({ sort: event.target.value });
            }}
          >
            {(isTask
              ? [
                  ['createdAt', 'Newest first'],
                  ['dueDate', 'Due date'],
                  ['priority', 'Priority'],
                  ['title', 'Title']
                ]
              : [['fullName', 'Name']]
            ).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          {busy ? (
            <p className="muted pad">Loading records…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {(isTask
                    ? [
                        'Task',
                        'Employee',
                        'Department',
                        'Priority',
                        'Status',
                        'Due date',
                        'Actions'
                      ]
                    : [
                        'Employee',
                        'Email',
                        'Department',
                        'Role',
                        'Status',
                        'Phone',
                        'Actions'
                      ]
                  ).map(heading => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    {isTask ? (
                      <>
                        <td>
                          <b>{item.taskCode}</b>
                          <br />

                          <Link to={`/tasks/${item._id}`}>
                            {item.title}
                          </Link>

                          {item.overdue && (
                            <span className="overdue">Overdue</span>
                          )}
                        </td>

                        <td>
                          {item.employeeSnapshot?.name || 'Former employee'}
                        </td>

                        <td>{item.department}</td>

                        <td>
                          <span
                            className={`pill ${(item.priority || '').toLowerCase()}`}
                          >
                            {item.priority}
                          </span>
                        </td>

                        <td>
                          {['Todo', 'In Progress'].includes(item.status) ? (
                            <select
                              className="status-select"
                              value={item.status}
                              disabled={updatingId === item._id}
                              onChange={event =>
                                changeStatus(item._id, event.target.value)
                              }
                            >
                              {[
                                item.status,
                                ...(item.status === 'Todo'
                                  ? ['In Progress', 'Cancelled']
                                  : ['Completed', 'Cancelled'])
                              ].filter(
                                (value, index, array) =>
                                  array.indexOf(value) === index
                              ).map(value => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="pill">{item.status}</span>
                          )}
                        </td>

                        <td>
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString()
                            : '—'}
                        </td>

                        <td>
                          <Link to={`/tasks/${item._id}/edit`}>Edit</Link>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <b>{item.fullName}</b>
                          <br />
                          <small>{item.employeeId}</small>
                        </td>

                        <td>{item.email}</td>
                        <td>{item.department}</td>
                        <td>{item.role}</td>

                        <td>
                          <span className="pill">{item.status}</span>
                        </td>

                        <td>{item.phone}</td>

                        <td>
                          <Link to={`/employees/${item._id}`}>View</Link>
                          {' · '}
                          <Link to={`/employees/${item._id}/edit`}>
                            Edit
                          </Link>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!busy && items.length === 0 && (
            <p className="muted pad">
              No records found. Try changing your filters.
            </p>
          )}
        </div>

        <div className="pagination">
          <span>
            Showing {items.length} of {data.total} records
          </span>

          <div>
            <button
              disabled={currentPage <= 1 || busy}
              onClick={() =>
                updateQuery({
                  page: String(Math.max(1, currentPage - 1))
                })
              }
            >
              ←
            </button>

            <b>{currentPage} / {totalPages}</b>

            <button
              disabled={currentPage >= totalPages || busy}
              onClick={() =>
                updateQuery({
                  page: String(currentPage + 1)
                })
              }
            >
              →
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}

// ---------------- EMPLOYEE FORM ----------------

function EmployeeForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    department: 'Development',
    role: '',
    joiningDate: '',
    status: 'Active',
    skills: '',
    leaveStart: '',
    leaveEnd: ''
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!edit) return;

    let active = true;

    api.get(`/employees/${id}`)
      .then(response => {
        if (!active) return;

        const employee = response.data;

        setForm({
          ...employee,
          joiningDate: employee.joiningDate?.slice(0, 10) || '',
          leaveStart: employee.leaveStart?.slice(0, 10) || '',
          leaveEnd: employee.leaveEnd?.slice(0, 10) || '',
          skills: (employee.skills || []).join(', ')
        });
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [id, edit]);

  function set(key, value) {
    setForm(previous => ({
      ...previous,
      [key]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const body = {
        ...form,
        skills: form.skills
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      };

      if (edit) {
        await api.put(`/employees/${id}`, body);
      } else {
        await api.post('/employees', body);
      }

      nav('/employees');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="form-shell">
        <p className="eyebrow">PEOPLE</p>
        <h1>{edit ? 'Edit employee' : 'Add employee'}</h1>
        <p className="muted">Keep employee details up to date.</p>

        <Notice message={error} />

        <form className="panel form-grid" onSubmit={submit}>
          {[
            ['employeeId', 'Employee ID'],
            ['fullName', 'Full name'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['role', 'Role'],
            ['joiningDate', 'Joining date']
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                type={key === 'joiningDate' ? 'date' : 'text'}
                disabled={edit && key === 'employeeId'}
                value={form[key] || ''}
                onChange={event => set(key, event.target.value)}
              />
            </label>
          ))}

          <label>
            Department
            <select
              value={form.department}
              onChange={event => set('department', event.target.value)}
            >
              {departments.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={event => set('status', event.target.value)}
            >
              {['Active', 'Inactive', 'On Leave'].map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          {form.status === 'On Leave' && (
            <>
              <label>
                Leave start
                <input
                  required
                  type="date"
                  value={form.leaveStart}
                  onChange={event => set('leaveStart', event.target.value)}
                />
              </label>

              <label>
                Leave end
                <input
                  required
                  type="date"
                  value={form.leaveEnd}
                  onChange={event => set('leaveEnd', event.target.value)}
                />
              </label>
            </>
          )}

          <label className="wide">
            Skills
            <input
              value={form.skills}
              placeholder="React, Node.js, SQL (comma separated)"
              onChange={event => set('skills', event.target.value)}
            />
          </label>

          <div className="wide form-actions">
            <button className="button" disabled={busy}>
              {busy ? 'Saving…' : 'Save employee'}
            </button>

            <Link className="button secondary" to="/employees">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Shell>
  );
}

// ---------------- TASK FORM ----------------

function TaskForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const nav = useNavigate();

  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedEmployee: '',
    department: 'Development',
    priority: 'Medium',
    startDate: '',
    dueDate: ''
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    api.get('/employees', {
      params: {
        limit: 100,
        status: 'Active'
      }
    })
      .then(response => {
        if (active) {
          setEmployees(
            Array.isArray(response.data?.items)
              ? response.data.items
              : []
          );
        }
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      });

    if (edit) {
      api.get(`/tasks/${id}`)
        .then(response => {
          if (!active) return;

          const task = response.data;

          setForm({
            ...task,
            assignedEmployee:
              task.assignedEmployee?._id ||
              task.assignedEmployee ||
              '',
            startDate: task.startDate?.slice(0, 10) || '',
            dueDate: task.dueDate?.slice(0, 10) || ''
          });
        })
        .catch(error => {
          if (active) setError(getErrorMessage(error));
        });
    }

    return () => {
      active = false;
    };
  }, [id, edit]);

  function set(key, value) {
    setForm(previous => ({
      ...previous,
      [key]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      if (edit) {
        await api.put(`/tasks/${id}`, form);
      } else {
        await api.post('/tasks', form);
      }

      nav('/tasks');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="form-shell">
        <p className="eyebrow">WORK</p>
        <h1>{edit ? 'Edit task' : 'Create task'}</h1>
        <p className="muted">
          Set an owner, priority and realistic deadline.
        </p>

        <Notice message={error} />

        <form className="panel form-grid" onSubmit={submit}>
          <label className="wide">
            Title
            <input
              required
              maxLength="120"
              value={form.title}
              onChange={event => set('title', event.target.value)}
            />
          </label>

          <label>
            Assigned employee
            <select
              required
              value={form.assignedEmployee}
              onChange={event =>
                set('assignedEmployee', event.target.value)
              }
            >
              <option value="">Choose employee</option>

              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.fullName} · {employee.employeeId}
                </option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select
              value={form.department}
              onChange={event => set('department', event.target.value)}
            >
              {departments.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={form.priority}
              onChange={event => set('priority', event.target.value)}
            >
              {priorities.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Start date
            <input
              required
              type="date"
              value={form.startDate}
              onChange={event => set('startDate', event.target.value)}
            />
          </label>

          <label>
            Due date
            <input
              required
              type="date"
              min={form.startDate || undefined}
              value={form.dueDate}
              onChange={event => set('dueDate', event.target.value)}
            />
          </label>

          <label className="wide">
            Description
            <textarea
              rows="4"
              value={form.description}
              onChange={event => set('description', event.target.value)}
            />
          </label>

          <div className="wide form-actions">
            <button className="button" disabled={busy}>
              {busy ? 'Saving…' : 'Save task'}
            </button>

            <Link className="button secondary" to="/tasks">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Shell>
  );
}

// ---------------- DETAILS ----------------

function Detail({ kind }) {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get(`/${kind}/${id}`)
      .then(response => {
        if (active) setItem(response.data);
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [id, kind]);

  return (
    <Shell>
      <Notice message={error} />

      {!item ? (
        <p>{error ? 'Unable to load details.' : 'Loading…'}</p>
      ) : (
        <section className="panel detail">
          <p className="eyebrow">
            {kind === 'tasks' ? 'TASK DETAILS' : 'EMPLOYEE DETAILS'}
          </p>

          <h1>{item.title || item.fullName}</h1>

          <div className="detail-grid">
            {Object.entries(item)
              .filter(([key, value]) =>
                ![
                  '_id',
                  '__v',
                  'createdAt',
                  'updatedAt',
                  'assignedEmployee'
                ].includes(key) &&
                value !== undefined &&
                value !== null &&
                typeof value !== 'object'
              )
              .map(([key, value]) => (
                <div key={key}>
                  <small>{key.replace(/[A-Z]/g, ' $&')}</small>
                  <b>{String(value)}</b>
                </div>
              ))}
          </div>

          <Link className="button secondary" to={`/${kind}`}>
            Back to list
          </Link>
        </section>
      )}
    </Shell>
  );
}

// ---------------- NOT FOUND ----------------

function NotFound() {
  return (
    <Shell>
      <h1>Page not found</h1>
      <Link to="/">Back to dashboard</Link>
    </Shell>
  );
}

// ---------------- APP ROUTES ----------------

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />

      <Route
        path="/employees"
        element={<ListPage kind="employees" />}
      />

      <Route path="/employees/new" element={<EmployeeForm />} />
      <Route path="/employees/:id/edit" element={<EmployeeForm />} />
      <Route
        path="/employees/:id"
        element={<Detail kind="employees" />}
      />

      <Route path="/tasks" element={<ListPage kind="tasks" />} />
      <Route path="/tasks/new" element={<TaskForm />} />
      <Route path="/tasks/:id/edit" element={<TaskForm />} />
      <Route path="/tasks/:id" element={<Detail kind="tasks" />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
