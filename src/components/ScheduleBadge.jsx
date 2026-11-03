import { PRIORITY, SCHEDULE_STATUS } from '../constants';
import { getOverdueDays, getScheduleStatus } from '../utils/schedule';

const STATUS_CLASS = {
  [SCHEDULE_STATUS.UNSCHEDULED]: 'schedule-unscheduled',
  [SCHEDULE_STATUS.SCHEDULED]: 'schedule-scheduled',
  [SCHEDULE_STATUS.RUNNING]: 'schedule-running',
  [SCHEDULE_STATUS.OVERDUE]: 'schedule-overdue',
  [SCHEDULE_STATUS.DONE]: 'schedule-done',
};

export function PriorityBadge({ value }) {
  if (!value || value === PRIORITY.NORMAL) {
    return <span className="priority-badge priority-normal">Normal</span>;
  }

  return (
    <span
      className={`priority-badge ${
        value === PRIORITY.URGENT ? 'priority-urgent' : 'priority-high'
      }`}
    >
      {value === PRIORITY.URGENT ? '⭐ ' : '⬆ '}
      {value}
    </span>
  );
}

export default function ScheduleBadge({ item, showShifted = true }) {
  const status = getScheduleStatus(item);
  const overdueDays = getOverdueDays(item);

  return (
    <span className="schedule-badges">
      <span className={`schedule-badge ${STATUS_CLASS[status] ?? ''}`}>
        {status}
        {status === SCHEDULE_STATUS.OVERDUE && overdueDays > 0 ? ` +${overdueDays}h` : ''}
      </span>

      {showShifted && item.jumlahTergeser > 0 && (
        <span
          className="schedule-badge schedule-shifted"
          title={item.alasanTergeser || 'Jadwal pernah digeser'}
        >
          Tergeser {item.jumlahTergeser}×
        </span>
      )}
    </span>
  );
}
