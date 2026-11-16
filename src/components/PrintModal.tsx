import React, { useEffect, useState } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  enterpriseName: string;
  stats?: { label: string; value: string | number }[];
  columns: string[];
  rows: (string | number)[][];
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  enterpriseName,
  stats,
  columns,
  rows,
}) => {
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        triggerNativePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerNativePrint = () => {
    setNoticeMessage("Ordre d'impression transmis au navigateur. Si la fenêtre ne s'ouvre pas (sécurité iframe), cliquez sur « Télécharger PDF ».");
    try {
      const existingFrame = document.getElementById('mailo-hidden-print-frame');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'mailo-hidden-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '-9999px';
      printFrame.style.bottom = '-9999px';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const html = generatePrintableHtml();
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            window.print();
          }
        }, 250);
      } else {
        window.print();
      }
    } catch {
      try {
        window.print();
      } catch {
        // Sandboxed fallback
      }
    }
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Header decorative line
      doc.setFillColor(37, 99, 235);
      doc.rect(14, 12, 3, 14, 'F');

      // Title & Enterprise
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(title, 20, 18);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${subtitle} • Entreprise : ${enterpriseName}`, 20, 24);

      // Meta info (Right)
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Mailoos Administration`, 283, 16, { align: 'right' });
      doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 283, 21, { align: 'right' });
      doc.text(`Total : ${rows.length} enregistrement(s)`, 283, 26, { align: 'right' });

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, 28, 283, 28);

      let startY = 32;

      // Stats row
      if (stats && stats.length > 0) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 31, 269, 13, 1.5, 1.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 31, 269, 13, 1.5, 1.5, 'S');

        const blockWidth = 269 / stats.length;
        stats.forEach((st, idx) => {
          const x = 18 + (idx * blockWidth);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(148, 163, 184);
          doc.text(st.label.toUpperCase(), x, 35.5);

          doc.setFontSize(10.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(String(st.value), x, 41);
        });

        startY = 48;
      }

      // AutoTable
      autoTable(doc, {
        startY: startY,
        head: [columns],
        body: rows,
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 2.8,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, top: 14, bottom: 18 },
      });

      // Add page numbering and footer to every page in the PDF document
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);

        // Footer divider line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 198, 283, 198);

        // Left note
        doc.text("Document officiel généré depuis la console Mailoos Administrateur", 14, 203);

        // Right page numbering
        doc.setFont('helvetica', 'bold');
        doc.text(`Page ${i} / ${totalPages}`, 283, 203, { align: 'right' });
      }

      const filename = `rapport_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      setNoticeMessage("Rapport officiel téléchargé au format PDF avec numérotation des pages !");
      setTimeout(() => setNoticeMessage(null), 4000);
    } catch {
      handleDownloadPrintableHtml();
    }
  };

  const generatePrintableHtml = (): string => {
    const statsHtml = stats && stats.length > 0
      ? `<div style="display: flex; gap: 16px; margin: 16px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          ${stats.map(s => `<div><span style="font-size: 11px; color: #64748b; display: block;">${s.label}</span><strong style="font-size: 16px; color: #0f172a;">${s.value}</strong></div>`).join('')}
        </div>`
      : '';

    const tableHeaders = columns.map(c => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f1f5f9; text-align: left; font-size: 12px; font-weight: bold; color: #0f172a;">${c}</th>`).join('');
    
    const tableRows = rows.map((r, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${r.map(cell => `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; color: #334155;">${cell}</td>`).join('')}
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${enterpriseName}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #ffffff; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">${subtitle} • Entreprise : <strong>${enterpriseName}</strong></p>
    </div>
    <div class="meta">
      <p style="margin: 0;">Plateforme <strong>Mailoos</strong></p>
      <p style="margin: 2px 0 0 0;">Date : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <p style="margin: 2px 0 0 0;">Total : <strong>${rows.length}</strong> enregistrement(s)</p>
    </div>
  </div>
  ${statsHtml}
  <table>
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <span>Document officiel généré depuis la console Mailoos Administrateur</span>
    <span>Page 1 / 1</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
  };

  const handleDownloadPrintableHtml = () => {
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `impression_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Aperçu avant impression
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {title} • {enterpriseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerNativePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Lancer l'impression système"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Télécharger le document au format PDF (imprimable sur toute imprimante)"
            >
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold">Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational / Status Banner */}
        {noticeMessage ? (
          <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-[11px] sm:text-xs">{noticeMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-blue-400 hover:text-blue-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span className="truncate">
                <strong>Conseil :</strong> Si la fenêtre d'impression directe est restreinte par le bac à sable de l'aperçu, utilisez <strong>Télécharger PDF</strong> pour imprimer ou archiver.
              </span>
            </div>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400 shrink-0">
              Raccourci : Ctrl+P
            </span>
          </div>
        )}

        {/* Printable Sheet Simulation (Paper Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/50">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #mailo-print-section, #mailo-print-section * {
                visibility: visible !important;
              }
              #mailo-print-section {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                z-index: 999999 !important;
              }
            }
          `}</style>
          <div id="mailo-print-section" className="max-w-3xl mx-auto bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-5">
            {/* Report Header */}
            <div className="border-b-2 border-blue-600 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Rapport Officiel
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Mailoos</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {subtitle} • Entreprise : <strong>{enterpriseName}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500 font-mono">
                <p>Édité le : {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="font-semibold text-slate-800 mt-0.5">{rows.length} élément(s)</p>
              </div>
            </div>

            {/* Stats Chips */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                {stats.map((s, idx) => (
                  <div key={idx} className="p-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      {s.label}
                    </span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    {columns.map((col, idx) => (
                      <th key={idx} className="p-2.5 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-slate-700 truncate max-w-xs">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span>Document officiel généré depuis la console Mailoos Administrateur</span>
              <span className="font-semibold text-slate-600 font-mono">Page 1 / 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
