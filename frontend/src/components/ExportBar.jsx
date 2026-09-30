import { useUi } from '../context/UiContext';
import { printPage } from '../lib/export';

/** Excel / PDF / Print buttons (+ optional extra, e.g. WhatsApp). */
export default function ExportBar({ onExcel, extra }) {
  const { toast } = useUi();
  return (
    <div className="no-print no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {onExcel && (
        <button className="btn-light btn-sm shrink-0" onClick={onExcel}>
          📗 Excel
        </button>
      )}
      <button
        className="btn-light btn-sm shrink-0"
        onClick={() => {
          toast('Choose “Save as PDF” in the print window.', 'info');
          setTimeout(printPage, 400);
        }}
      >
        📄 PDF
      </button>
      <button className="btn-light btn-sm shrink-0" onClick={printPage}>
        🖨 Print
      </button>
      {extra}
    </div>
  );
}
