import { TAB_ACTIVE, TAB_DONE, TAB_PENDING } from '../constants';

export default function Tabs({ activeTab, counts, onChange }) {
  const tabs = [
    { id: TAB_ACTIVE, label: 'Aktif', count: counts.active, hint: 'On Proses & Waiting' },
    { id: TAB_PENDING, label: 'Pending', count: counts.pending, hint: 'Menunggu tindak lanjut' },
    { id: TAB_DONE, label: 'Selesai', count: counts.done, hint: 'Arsip request' },
  ];

  return (
    <div className="tabs" role="tablist" aria-label="Kelompok request">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-label">{tab.label}</span>
          <span className="tab-count">{tab.count}</span>
          <span className="tab-hint">{tab.hint}</span>
        </button>
      ))}
    </div>
  );
}
