import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { GraduationCap, Search, Filter, Mail, Phone, ArrowUpDown } from 'lucide-react';

export function StudentsList() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sortBy, setSortBy] = useState('cgpa');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    async function fetchDepts() {
      try {
        const res = await api.getDepartments();
        if (res.success) setDepartments(res.departments);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    }
    fetchDepts();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (deptFilter) params.append('department_id', deptFilter);
      if (sortBy) params.append('sort_by', sortBy);
      if (order) params.append('order', order);

      const res = await api.getStudents(params.toString());
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, deptFilter, sortBy, order]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setOrder('desc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-control-custom"
              placeholder="Search name, roll, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          <select
            className="form-control-custom"
            style={{ width: 'auto', minWidth: 160 }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name} ({d.department_code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Total registered candidates: <strong style={{ color: '#fff' }}>{students.length}</strong>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th onClick={() => toggleSort('roll_number')} style={{ cursor: 'pointer' }}>
                  Roll Number <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th>Candidate Name</th>
                <th>Department</th>
                <th onClick={() => toggleSort('cgpa')} style={{ cursor: 'pointer' }}>
                  CGPA <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th>Backlogs</th>
                <th>Placement Status</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.student_id} className="fade-in-item">
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{st.roll_number}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{st.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class of {st.graduation_year}</div>
                    </td>
                    <td>
                      <span className="badge-custom badge-applied">{st.department_code}</span>
                    </td>
                    <td>
                      <strong style={{ color: st.cgpa >= 8.5 ? '#34d399' : '#fff' }}>
                        {st.cgpa.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ color: st.backlogs > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {st.backlogs}
                      </span>
                    </td>
                    <td>
                      {st.is_placed ? (
                        <div>
                          <Badge status="Selected" />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {st.placement?.company_name} ({st.placement?.package_lpa} LPA)
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unplaced</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={12} /> {st.email}
                        </span>
                        {st.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Phone size={12} /> {st.phone}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

