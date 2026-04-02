import React from 'react';

interface Props {
  label:       string;
  description: string;
}

export const SectionHeader: React.FC<Props> = ({ label, description }) => (
  <div
    className="flex items-center justify-between"
    style={{ paddingBottom: 8, borderBottom: '1px solid #242C3A', marginBottom: 12 }}
  >
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        color: '#747D8A',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: 11, color: '#505866', fontWeight: 400 }}>
      {description}
    </span>
  </div>
);
