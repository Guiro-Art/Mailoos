import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sparkles, 
  Users, 
  X, 
  FileCheck,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ParsedRow {
  firstName: string;
  lastName: string;
  suggestedPrefix: string;
  domain: string;
}

export const ImporterExcel: React.FC = () => {
  const { 
    currentEnterprise, 
    domains, 
    addMailbox, 
    importHistory, 
    recordImport, 
    showToast,
    setCurrentTab,
    buttonColor,
    canView,
    canCreate
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [isDomainSelectHovered, setIsDomainSelectHovered] = useState(false);
  const [isDomainSelectFocused, setIsDomainSelectFocused] = useState(false);
  const [stagedByEnterprise, setStagedByEnterprise] = useState<Record<string, {
    rows: ParsedRow[];
    fileName: string;
  }>>({});

  const currentStaged = stagedByEnterprise[currentEnterprise.id] || { rows: [], fileName: '' };
  const parsedRows = currentStaged.rows;
  const selectedFileName = currentStaged.fileName;

  const setParsedRows = (action: React.SetStateAction<ParsedRow[]>) => {
    setStagedByEnterprise(prev => {
      const current = prev[currentEnterprise.id] || { rows: [], fileName: '' };
      const nextRows = typeof action === 'function' ? action(current.rows) : action;
      return {
        ...prev,
        [currentEnterprise.id]: {
          ...current,
          rows: nextRows
        }
      };
    });
  };

  const setSelectedFileName = (fileName: string) => {
    setStagedByEnterprise(prev => {
      const current = prev[currentEnterprise.id] || { rows: [], fileName: '' };
      return {
        ...prev,
        [currentEnterprise.id]: {
          ...current,
          fileName
        }
      };
    });
  };

  const [selectedDomain, setSelectedDomain] = useState<string>(
    domains[0]?.name || currentEnterprise.defaultDomain
  );

  React.useEffect(() => {
    setSelectedDomain(domains[0]?.name || currentEnterprise.defaultDomain);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentEnterprise.id, domains]);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanPrefix = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Helper to split a full name into firstName and lastName
  const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim().replace(/\s+/g, ' ');
    if (!trimmed) return { firstName: '', lastName: '' };

    // Check if contains comma, e.g. "OUEDRAOGO, Fatima"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim());
      return { lastName: parts[0] || '', firstName: parts.slice(1).join(' ') || '' };
    }

    const words = trimmed.split(' ');
    if (words.length === 1) {
      return { firstName: '', lastName: words[0] };
    }

    // Check if one or more words are in ALL-CAPS (typical French/West-African surname convention)
    const upperWords: string[] = [];
    const nonUpperWords: string[] = [];

    words.forEach(w => {
      // word has length >= 2 and all uppercase letters
      if (w.length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w)) {
        upperWords.push(w);
      } else {
        nonUpperWords.push(w);
      }
    });

    if (upperWords.length > 0 && nonUpperWords.length > 0) {
      return {
        lastName: upperWords.join(' '),
        firstName: nonUpperWords.join(' ')
      };
    }

    // Default: First word is First Name, remaining are Last Name (or vice-versa)
    return {
      firstName: words[0],
      lastName: words.slice(1).join(' ')
    };
  };

  const sanitizeText = (val: any): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    // Remove control chars and replacement chars
    return s.replace(/[\x00-\x1F\x7F-\x9F\uFFFD\uFFFE\uFFFF]/g, '').trim();
  };

  const processWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
    try {
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        showToast('Le classeur Excel est vide', 'warning');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawGrid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!rawGrid || rawGrid.length === 0) {
        showToast('Aucune donnée trouvée dans la feuille', 'warning');
        return;
      }

      // Step 1: Detect the real header row by scanning first 20 rows
      // We look for rows that actually have table column headers (like NOM, PRENOM, CONTACT...)
      // and NOT a single merged title banner like "LISTE DES PÈLERINS 2027".
      let headerRowIndex = -1;
      let colLastNameIdx = -1;
      let colFirstNameIdx = -1;
      let colFullNameIdx = -1;
      let colEmailIdx = -1;

      for (let r = 0; r < Math.min(rawGrid.length, 20); r++) {
        const row = rawGrid[r];
        if (!Array.isArray(row)) continue;

        let hasNom = false;
        let hasPrenom = false;
        let hasFullNameHeader = false;
        let localColLastName = -1;
        let localColFirstName = -1;
        let localColFullName = -1;
        let localColEmail = -1;

        // Count non-empty cells in this row
        const populatedCellsCount = row.filter(c => sanitizeText(c).length > 0).length;

        row.forEach((cellVal, cIdx) => {
          const raw = sanitizeText(cellVal).toLowerCase();
          const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          // Check for compound "Nom et prénom(s)" column
          if (
            norm === 'nom et prenom' ||
            norm === 'nom et prenoms' ||
            norm === 'noms et prenoms' ||
            norm === 'nom & prenom' ||
            norm === 'nom & prenoms' ||
            norm === 'nom prenom' ||
            norm === 'nom complet' ||
            norm === 'identite' ||
            norm === 'collaborateur' ||
            norm === 'nom du pelerin' ||
            norm === 'nom pelerin' ||
            norm === 'pelerins' ||
            norm === 'pelerin' ||
            norm === 'client' ||
            norm === 'passager' ||
            norm === 'full name' ||
            norm === 'fullname'
          ) {
            hasFullNameHeader = true;
            localColFullName = cIdx;
          } else if (
            norm.includes('prenom') ||
            norm === 'first name' ||
            norm === 'firstname' ||
            norm === 'given name'
          ) {
            hasPrenom = true;
            localColFirstName = cIdx;
          } else if (
            (norm === 'nom' || norm === 'noms' || norm === 'nom de famille' || norm === 'last name' || norm === 'lastname' || norm === 'patronyme') &&
            !norm.includes('nombre') &&
            !norm.includes('liste')
          ) {
            hasNom = true;
            localColLastName = cIdx;
          } else if (norm.includes('email') || norm.includes('e-mail') || norm.includes('courriel') || norm.includes('adresse mail')) {
            localColEmail = cIdx;
          }
        });

        // A valid header row should either have both Nom & Prénom, OR a dedicated Full Name header,
        // and usually at least 2 populated columns in total to avoid lone title banners.
        if (hasNom && hasPrenom) {
          headerRowIndex = r;
          colLastNameIdx = localColLastName;
          colFirstNameIdx = localColFirstName;
          colEmailIdx = localColEmail;
          break;
        } else if (hasFullNameHeader && populatedCellsCount >= 2) {
          headerRowIndex = r;
          colFullNameIdx = localColFullName;
          colEmailIdx = localColEmail;
          break;
        }
      }

      // If still not identified, fallback to intelligent row 0 heuristic
      if (headerRowIndex === -1) {
        // Find first row with at least 2 text cells
        for (let r = 0; r < Math.min(rawGrid.length, 10); r++) {
          const row = rawGrid[r];
          if (!Array.isArray(row)) continue;
          const textCount = row.filter(c => sanitizeText(c).length > 0).length;
          if (textCount >= 2) {
            headerRowIndex = r;
            colLastNameIdx = 0;
            colFirstNameIdx = 1;
            break;
          }
        }
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          colLastNameIdx = 0;
          colFirstNameIdx = 1;
        }
      }

      // Step 2: Extract data rows starting right after the detected header row
      const extracted: ParsedRow[] = [];
      const prefixCountMap = new Map<string, number>();

      for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
        const row = rawGrid[r];
        if (!Array.isArray(row)) continue;

        let firstName = '';
        let lastName = '';
        let customPrefix = '';

        if (colFirstNameIdx !== -1 && colLastNameIdx !== -1) {
          lastName = sanitizeText(row[colLastNameIdx]);
          firstName = sanitizeText(row[colFirstNameIdx]);
        } else if (colFullNameIdx !== -1) {
          const rawFull = sanitizeText(row[colFullNameIdx]);
          if (rawFull) {
            const split = splitFullName(rawFull);
            firstName = split.firstName;
            lastName = split.lastName;
          }
        } else if (colLastNameIdx !== -1) {
          const rawVal = sanitizeText(row[colLastNameIdx]);
          const split = splitFullName(rawVal);
          firstName = split.firstName;
          lastName = split.lastName;
        } else {
          // Fallback to populated cells
          const textCells = row
            .map(c => sanitizeText(c))
            .filter(c => c.length > 0 && isNaN(Number(c))); // filter out pure numbers (e.g. sequence numbers like 1, 2, 3)

          if (textCells.length >= 2) {
            lastName = textCells[0];
            firstName = textCells[1];
          } else if (textCells.length === 1) {
            const split = splitFullName(textCells[0]);
            firstName = split.firstName;
            lastName = split.lastName;
          }
        }

        // Email column fallback
        if (colEmailIdx !== -1 && row[colEmailIdx]) {
          const rawEmail = sanitizeText(row[colEmailIdx]).toLowerCase();
          if (rawEmail.includes('@')) {
            customPrefix = cleanPrefix(rawEmail.split('@')[0]);
          }
        }

        // Filter out summary/footer rows or repeated headers
        const lNameLower = lastName.toLowerCase();
        const fNameLower = firstName.toLowerCase();
        const isHeaderRepetition = 
          fNameLower === 'prenom' || 
          fNameLower === 'prénom' || 
          fNameLower === 'first name' ||
          lNameLower === 'nom' ||
          lNameLower === 'last name' ||
          lNameLower === 'noms et prenoms';

        const isFooterOrTitle =
          lNameLower.startsWith('total') ||
          lNameLower.startsWith('liste des') ||
          lNameLower.includes('pèlerin') ||
          lNameLower.includes('voyages') ||
          fNameLower.startsWith('total');

        if ((!firstName && !lastName) || isHeaderRepetition || isFooterOrTitle) {
          continue;
        }

        // Generate clean suggested prefix
        let basePrefix = customPrefix;
        if (!basePrefix) {
          const cFirst = cleanPrefix(firstName);
          const cLast = cleanPrefix(lastName);
          if (cFirst && cLast) {
            basePrefix = `${cFirst}.${cLast}`;
          } else {
            basePrefix = cFirst || cLast || `user${r}`;
          }
        }

        // Deduplicate within this batch
        const count = prefixCountMap.get(basePrefix) || 0;
        prefixCountMap.set(basePrefix, count + 1);
        const uniquePrefix = count > 0 ? `${basePrefix}${count + 1}` : basePrefix;

        extracted.push({
          firstName: firstName || '—',
          lastName: lastName || '—',
          suggestedPrefix: uniquePrefix,
          domain: selectedDomain
        });
      }

      if (extracted.length === 0) {
        showToast('Aucune ligne de pèlerin ou collaborateur trouvée dans le fichier', 'warning');
        return;
      }

      setParsedRows(extracted);
      setSelectedFileName(fileName);
      showToast(`${extracted.length} pèlerin(s) / collaborateur(s) importé(s) avec succès !`, 'success');
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      showToast(`Erreur lors de la lecture du fichier : ${err.message || 'Format invalide'}`, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readSelectedFile(file);
  };

  const readSelectedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        processWorkbook(workbook, file.name);
      } catch (err) {
        console.error('Failed to read file buffer:', err);
        showToast('Impossible de lire ce format de fichier Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readSelectedFile(file);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const loadSamplePilgrims2027 = () => {
    // 29 pilgrims representative of Sultan Voyages Hajj 2027 list
    const pilgrims = [
      { firstName: 'Fatima', lastName: 'OUEDRAOGO' },
      { firstName: 'Moussa', lastName: 'KABORE' },
      { firstName: 'Adama', lastName: 'COMPAORE' },
      { firstName: 'Mariam', lastName: 'DIALLO' },
      { firstName: 'Ibrahim', lastName: 'TRAORE' },
      { firstName: 'Sarata', lastName: 'SAWADOGO' },
      { firstName: 'Ousmane', lastName: 'KINDA' },
      { firstName: 'Moctar', lastName: 'KINDA' },
      { firstName: 'Aminata', lastName: 'ZONGO' },
      { firstName: 'Abdoulaye', lastName: 'SANFO' },
      { firstName: 'Ramatou', lastName: 'BAMBARA' },
      { firstName: 'Souleymane', lastName: 'OUATTARA' },
      { firstName: 'Alizeta', lastName: 'ILBOUDO' },
      { firstName: 'Issouf', lastName: 'TIENDREBEOGO' },
      { firstName: 'Kadidiatou', lastName: 'NIKIEMA' },
      { firstName: 'Mahamadi', lastName: 'DERA' },
      { firstName: 'Safiatou', lastName: 'CONGO' },
      { firstName: 'Boukary', lastName: 'ROUAMBA' },
      { firstName: 'Bibata', lastName: 'SIMPORE' },
      { firstName: 'Seydou', lastName: 'BARRY' },
      { firstName: 'Salif', lastName: 'KABRE' },
      { firstName: 'Zenabo', lastName: 'TAPSOBA' },
      { firstName: 'Hamidou', lastName: 'BELEM' },
      { firstName: 'Habibou', lastName: 'KONDOMBO' },
      { firstName: 'Yacouba', lastName: 'ZOUNGRANA' },
      { firstName: 'Assetou', lastName: 'GANAME' },
      { firstName: 'Drissa', lastName: 'CISSE' },
      { firstName: 'Fatimata', lastName: 'DICKO' },
      { firstName: 'Noufou', lastName: 'SANKARA' }
    ];

    const prefixMap = new Map<string, number>();
    const rows: ParsedRow[] = pilgrims.map(p => {
      const base = `${cleanPrefix(p.firstName)}.${cleanPrefix(p.lastName)}`;
      const c = prefixMap.get(base) || 0;
      prefixMap.set(base, c + 1);
      const unique = c > 0 ? `${base}${c + 1}` : base;
      return {
        firstName: p.firstName,
        lastName: p.lastName,
        suggestedPrefix: unique,
        domain: selectedDomain
      };
    });

    setParsedRows(rows);
    setSelectedFileName('LISTE DES PÈLERINS 2027 POUR E-MAIL - SULTAN VOYAGES.xlsx');
    showToast('29 pèlerins chargés avec succès !', 'success');
  };

  const filteredRows = parsedRows.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.suggestedPrefix.toLowerCase().includes(q)
    );
  });

  const removeRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const updatePrefix = (index: number, newPrefix: string) => {
    const cleaned = cleanPrefix(newPrefix);
    setParsedRows(prev => prev.map((r, i) => i === index ? { ...r, suggestedPrefix: cleaned } : r));
  };

  const loadSampleTeam = () => {
    const sampleCsv = `Nom,Prénom\nOUEDRAOGO,Fatima\nCOMPAORE,Adama\nTRAORE,Ibrahim\nZONGO,Aminata\nKABORE,Christian`;
    const workbook = XLSX.read(sampleCsv, { type: 'string' });
    processWorkbook(workbook, `collaborateurs_${currentEnterprise.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  const loadSampleMailoosTeam = () => {
    const sampleCsv = `Nom,Prénom\nKABORE,Salif\nTRAORE,Awa\nOUEDRAOGO,Moussa\nSANOU,Fatou\nBAMBA,Ibrahim`;
    const workbook = XLSX.read(sampleCsv, { type: 'string' });
    processWorkbook(workbook, 'EQUIPE_TECHNIQUE_MAILOOS_2026.xlsx');
  };

  const downloadSampleTemplate = () => {
    // Semicolon (;) delimiter and UTF-8 BOM ensure Microsoft Excel opens Nom in column A and Prénom in column B with pristine accents
    const content = "\uFEFFNom;Prénom\r\nKABORE;Moussa\r\nSAWADOGO;Aïcha\r\nOUATTARA;Souleymane\r\nDIALLO;Mariam\r\n";
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele_import_${currentEnterprise.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Modèle CSV téléchargé (compatible Excel)', 'info');
  };

  const executeBatchImport = () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    setTimeout(() => {
      let count = 0;
      parsedRows.forEach(row => {
        addMailbox(row.firstName, row.lastName, row.suggestedPrefix, selectedDomain);
        count++;
      });

      recordImport(selectedFileName, parsedRows.length, count);
      setIsImporting(false);
      setStagedByEnterprise(prev => ({
        ...prev,
        [currentEnterprise.id]: { rows: [], fileName: '' }
      }));
      showToast(`${count} boîtes mail créées avec succès pour ${currentEnterprise.name} !`, 'success');
      setCurrentTab('accounts');
    }, 800);
  };

  if (!canView('import')) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-200">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Accès restreint à l'Import Excel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Votre rôle actuel ne dispose pas du droit de consultation (VOIR) sur le module d'import groupé.
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            Contactez votre Super Admin ou configurez la matrice dans <strong className="text-slate-700 dark:text-slate-300">Paramètres &gt; Droits & Permissions (RBAC)</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium text-slate-700 dark:text-slate-300">Provisionnement</span>
          <span>/</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">Import groupé Excel / CSV</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Création massive de boîtes mail
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Entreprise active : <strong className="text-slate-800 dark:text-slate-200">{currentEnterprise.name}</strong> (@{currentEnterprise.defaultDomain})
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={e => { if (canCreate('import')) handleDragOver(e); }}
        onDragLeave={handleDragLeave}
        onDrop={e => { if (canCreate('import')) handleDrop(e); }}
        onClick={() => {
          if (canCreate('import')) {
            fileInputRef.current?.click();
          } else {
            showToast('Droit de création (AJOUTER) requis pour importer des comptes', 'warning');
          }
        }}
        className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all shadow-2xs ${
          !canCreate('import')
            ? 'opacity-60 cursor-not-allowed border-slate-200/90 dark:border-slate-800'
            : isDragging 
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.005] cursor-pointer' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 cursor-pointer'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv,.xlsx,.xls,.ods,.txt" 
          onChange={handleFileChange} 
          disabled={!canCreate('import')}
          className="hidden" 
        />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Glissez-déposez votre fichier Excel ou CSV ici
        </h3>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Formats acceptés : .xlsx, .xls, .ods, .csv
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto leading-relaxed">
          Le fichier doit contenir au minimum les colonnes <span className="font-semibold text-slate-700 dark:text-slate-300">Nom</span> et <span className="font-semibold text-slate-700 dark:text-slate-300">Prénom</span> (ou une colonne combinée « Nom et prénoms »). Les adresses et mots de passe temporaires sont générés automatiquement.
        </p>
      </div>

      {/* Helpful Quick Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {currentEnterprise.id === 'ent-1' ? (
          <button
            type="button"
            onClick={loadSamplePilgrims2027}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Charger liste Sultan Voyages 2027 (29 pèlerins)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={loadSampleMailoosTeam}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Charger équipe technique Mailoos (5 collaborateurs)</span>
          </button>
        )}

        <button
          type="button"
          onClick={loadSampleTeam}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-900/80 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Exemple standard 5 collaborateurs</span>
        </button>

        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Télécharger modèle CSV</span>
        </button>
      </div>

      {/* Parsed Preview Table (if file loaded) */}
      {parsedRows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedFileName}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {parsedRows.length} boîte(s) prêtes à être générées
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Domaine de destination :</span>
                <select
                  value={selectedDomain}
                  onChange={e => {
                    const dom = e.target.value;
                    setSelectedDomain(dom);
                    setParsedRows(prev => prev.map(r => ({ ...r, domain: dom })));
                  }}
                  onMouseEnter={() => setIsDomainSelectHovered(true)}
                  onMouseLeave={() => setIsDomainSelectHovered(false)}
                  onFocus={() => setIsDomainSelectFocused(true)}
                  onBlur={() => setIsDomainSelectFocused(false)}
                  style={{ 
                    accentColor: buttonColor,
                    borderColor: (isDomainSelectHovered || isDomainSelectFocused) ? buttonColor : undefined,
                    borderWidth: isDomainSelectHovered ? '2px' : '1px',
                    backgroundColor: isDomainSelectHovered ? `${buttonColor}15` : undefined,
                    boxShadow: isDomainSelectFocused 
                      ? `0 0 0 3px ${buttonColor}40` 
                      : (isDomainSelectHovered ? `0 0 0 3.5px ${buttonColor}35` : undefined)
                  }}
                  className="theme-select px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer transition-all duration-150"
                >
                  {domains.map(d => (
                    <option key={d.id} value={d.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium py-1.5">@{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={isImporting || !canCreate('import')}
                onClick={executeBatchImport}
                title={!canCreate('import') ? "Droit de création (AJOUTER) requis" : undefined}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Création en cours...' : !canCreate('import') ? 'Création non autorisée' : `Créer ces ${parsedRows.length} boîtes mail`}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStagedByEnterprise(prev => ({
                    ...prev,
                    [currentEnterprise.id]: { rows: [], fileName: '' }
                  }));
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Annuler l'import"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search in Preview */}
          {parsedRows.length > 5 && (
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Filtrer un pèlerin par nom ou prénom..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 w-72 focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Affichage : {filteredRows.length} sur {parsedRows.length}
              </span>
            </div>
          )}

          <div className="overflow-x-auto max-h-80 border border-slate-100 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">PRÉNOM</th>
                  <th className="py-2.5 px-3">NOM</th>
                  <th className="py-2.5 px-3">ADRESSE ATTRIBUÉE</th>
                  <th className="py-2.5 px-3">MOT DE PASSE</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium">{row.firstName}</td>
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-semibold uppercase">{row.lastName}</td>
                    <td className="py-2 px-3 text-blue-600 dark:text-blue-400 font-mono">
                      <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono text-[11px]">
                        {row.suggestedPrefix}@{selectedDomain}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      Généré automatiquement
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
                        title="Retirer cette ligne"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique des imports (Matching Screenshot 4) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Historique des imports — {currentEnterprise.name}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Fichiers importés exclusivement pour {currentEnterprise.name}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-mono">
            {importHistory.length} fichier{importHistory.length > 1 ? 's' : ''}
          </span>
        </div>

        {importHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Aucun fichier importé pour l'instant pour {currentEnterprise.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 font-medium">FICHIER</th>
                  <th className="py-2.5 font-medium">DATE</th>
                  <th className="py-2.5 font-medium">LIGNES</th>
                  <th className="py-2.5 font-medium">SUCCÈS</th>
                  <th className="py-2.5 font-medium text-right">STATUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {importHistory.map(imp => (
                  <tr key={imp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{imp.fileName}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{imp.date}</td>
                    <td className="py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">{imp.rowsCount}</td>
                    <td className="py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">{imp.successCount}</td>
                    <td className="py-2.5 text-right">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        Succès
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
