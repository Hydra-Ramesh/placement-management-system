import React from 'react';

export function Badge({ status }) {
  const getBadgeClass = (s) => {
    switch (s?.toLowerCase()) {
      case 'applied':
        return 'badge-applied';
      case 'pending':
      case 'pending document verification':
      case 'pending tpo verification':
      case 'pending verification':
      case 'under document review':
        return 'badge-pending';
      case 'verified':
      case 'documents verified':
      case 'tpo approved':
      case 'ready to apply':
        return 'badge-verified';
      case 'shortlisted':
        return 'badge-shortlisted';
      case 'interview scheduled':
        return 'badge-interview';
      case 'selected':
      case 'accepted':
      case 'open':
        return 'badge-selected';
      case 'rejected':
      case 'tpo rejected':
      case 'closed':
      case 'declined':
        return 'badge-danger';
      case 'withdrawn':
        return 'badge-withdrawn';
      default:
        return 'badge-applied';
    }
  };

  return (
    <span className={`badge-custom ${getBadgeClass(status)}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
      {status || 'Unknown'}
    </span>
  );
}

