/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - SalesPulse-Inspired Controlled Excel/CSV Import Studio
 * Controlled workflow: UPLOAD -> MAP -> VALIDATE -> DUPLICATES -> PREVIEW -> CONFIRM -> RESULT
 */

import React, { useState, useId } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import {
  autoMapColumns,
  EntitySchema,
  generateErrorResultCsv,
  generateSampleCsvTemplate,
  IMPORT_SCHEMAS,
  ImportEntityType,
  parseCsvText,
  ProcessedRow,
  validateAndProcessRows,
  ValidationSummary,
} from '../services/importEngine';
import { triggerDownload } from '../services/exportEngine';
import { Customer, SKU, User } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCustomers: Customer[];
  existingSkus: SKU[];
  existingUsers: User[];
  onImportSuccess: (entityType: ImportEntityType, importedRows: Record<string, unknown>[], overwriteExisting: boolean) => void;
}

type ImportStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'IMPORTING' | 'RESULT';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingCustomers,
  existingSkus,
  existingUsers,
  onImportSuccess,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('CUSTOMERS');
  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE' | 'REJECT'>('SKIP');
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERROR' | 'DUPLICATE'>('ALL');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputId = useId();

  if (!isOpen) return null;

  const currentSchema: EntitySchema = IMPORT_SCHEMAS[selectedEntity];

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsvTemplate(currentSchema);
    triggerDownload(csvContent, `Template_${selectedEntity}_NationalLights.csv`);
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const { headers, rows } = parseCsvText(text);
      setRawHeaders(headers);
      setRawRows(rows);

      // Auto map columns based on schema
      const initialMap = autoMapColumns(headers, currentSchema);
      setColumnMapping(initialMap);
      setCurrentStep('MAP');
    };
    reader.readAsText(file);
  };

  const handleProceedToPreview = () => {
    const summary = validateAndProcessRows(
      rawRows,
      rawHeaders,
      columnMapping,
      currentSchema,
      {
        customers: existingCustomers,
        skus: existingSkus,
        users: existingUsers,
      }
    );
    setValidationSummary(summary);
    setCurrentStep('PREVIEW');
  };

  const handleExecuteImport = () => {
    if (!validationSummary) return;

    setCurrentStep('IMPORTING');
    setImportProgress(10);

    const eligibleRows = validationSummary.processedRows.filter((r) => {
      if (!r.isValid) return false;
      if (r.isDuplicate && duplicateStrategy === 'SKIP') return false;
      if (r.isDuplicate && duplicateStrategy === 'REJECT') return false;
      return true;
    });

    const skipped = validationSummary.processedRows.length - eligibleRows.length;
    setSkippedCount(skipped);

    let progress = 10;
    const interval = setInterval(() => {
      progress += 25;
      setImportProgress(Math.min(progress, 95));
      if (progress >= 95) {
        clearInterval(interval);
        setTimeout(() => {
          setImportProgress(100);
          setImportedCount(eligibleRows.length);
          const parsedData = eligibleRows.map((r) => r.parsed);
          onImportSuccess(selectedEntity, parsedData, duplicateStrategy === 'UPDATE');
          setCurrentStep('RESULT');
        }, 400);
      }
    }, 150);
  };

  const handleDownloadErrors = () => {
    if (!validationSummary) return;
    const csvContent = generateErrorResultCsv(currentSchema, validationSummary.processedRows);
    triggerDownload(csvContent, `Errors_${selectedEntity}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleReset = () => {
    setCurrentStep('UPLOAD');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidationSummary(null);
    setImportProgress(0);
    setImportedCount(0);
    setSkippedCount(0);
  };

  // Filter preview rows
  const filteredPreviewRows = validationSummary?.processedRows.filter((r) => {
    if (previewFilter === 'VALID' && (!r.isValid || r.isDuplicate)) return false;
    if (previewFilter === 'ERROR' && r.isValid) return false;
    if (previewFilter === 'DUPLICATE' && (!r.isDuplicate || !r.isValid)) return false;

    if (previewSearch) {
      const searchLower = previewSearch.toLowerCase();
      const matchInValues = Object.values(r.raw).some((v) => String(v).toLowerCase().includes(searchLower));
      const matchInErrors = r.errors.some((e) => e.toLowerCase().includes(searchLower));
      return matchInValues || matchInErrors;
    }
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">Controlled Data Import Studio</h3>
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  SalesPulse Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">Strict validation, reference checks & anti-formula injection defense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Wizard Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-2.5 text-xs font-semibold text-slate-600 overflow-x-auto">
          <div className={`flex items-center gap-2 ${currentStep === 'UPLOAD' ? 'text-amber-600 font-bold' : ''}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${currentStep === 'UPLOAD' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
            <span>Upload File</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-2 ${currentStep === 'MAP' ? 'text-amber-600 font-bold' : ''}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${currentStep === 'MAP' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
            <span>Map Columns</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-2 ${currentStep === 'PREVIEW' ? 'text-amber-600 font-bold' : ''}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${currentStep === 'PREVIEW' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
            <span>Validation & Duplicate Check</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-2 ${currentStep === 'RESULT' ? 'text-amber-600 font-bold' : ''}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${currentStep === 'RESULT' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>4</span>
            <span>Execution Summary</span>
          </div>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* ================= STEP 1: UPLOAD ================= */}
          {currentStep === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Entity Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Target Master Module:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {(Object.keys(IMPORT_SCHEMAS) as ImportEntityType[]).map((key) => {
                    const schema = IMPORT_SCHEMAS[key];
                    const isSelected = selectedEntity === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedEntity(key)}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-slate-950 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold">{schema.title.split('&')[0]}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />}
                        </div>
                        <span className="text-[10px] text-slate-500 line-clamp-2">{schema.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
                  isDragOver ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 bg-white hover:border-amber-400'
                }`}
              >
                <input
                  id={fileInputId}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-3 shadow-inner">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Drop your CSV / Excel export file here</h4>
                <p className="text-xs text-slate-500 mb-4 text-center max-w-md">
                  Supports comma-separated (.csv), tab-delimited, and exported workbooks. Max 5,000 rows per batch.
                </p>
                <label
                  htmlFor={fileInputId}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all"
                >
                  <FileText className="h-4 w-4 text-amber-400" />
                  Browse Computer File
                </label>
              </div>

              {/* Template Download & Security Notice */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Need the exact formatted structure?</div>
                    <div className="text-[11px] text-slate-600">
                      Download the official verified template with sample records and required column headers.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-100/50 self-end sm:self-auto shrink-0"
                >
                  <Download className="h-3.5 w-3.5 text-amber-700" />
                  Download Sample CSV
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: MAP COLUMNS ================= */}
          {currentStep === 'MAP' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Map File Columns to Master Schema</h4>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-semibold text-slate-700">{fileName}</span> ({rawRows.length} detected data rows)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setColumnMapping(autoMapColumns(rawHeaders, currentSchema))}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-run Auto Match
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="grid grid-cols-12 bg-slate-100 p-3 text-[11px] font-bold text-slate-700 border-b">
                  <div className="col-span-5">Target System Field</div>
                  <div className="col-span-4">Source File Column (CSV Header)</div>
                  <div className="col-span-3">Sample Value from File</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[46vh] overflow-y-auto">
                  {currentSchema.fields.map((field) => {
                    const mappedCol = columnMapping[field.key] || '';
                    const mappedIndex = rawHeaders.indexOf(mappedCol);
                    const sampleVal = mappedIndex >= 0 && rawRows[0] ? rawRows[0][mappedIndex] : '-';

                    return (
                      <div key={field.key} className="grid grid-cols-12 items-center p-3 text-xs hover:bg-slate-50">
                        <div className="col-span-5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{field.label}</span>
                            {field.required && (
                              <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-extrabold text-rose-700">REQUIRED</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">Type: {field.type.toUpperCase()}</div>
                        </div>

                        <div className="col-span-4 pr-2">
                          <select
                            value={mappedCol}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                              field.required && !mappedCol
                                ? 'border-rose-300 bg-rose-50 text-rose-900'
                                : 'border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <option value="">-- Unmapped --</option>
                            {rawHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3 truncate text-slate-500 font-mono text-[11px] bg-slate-50 px-2 py-1 rounded">
                          {sampleVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PREVIEW & VALIDATION ================= */}
          {currentStep === 'PREVIEW' && validationSummary && (
            <div className="space-y-4">
              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-500">TOTAL ROWS</div>
                  <div className="text-xl font-black text-slate-950">{validationSummary.totalRows}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-xs">
                  <div className="text-[11px] font-bold text-emerald-700">VALID ROWS</div>
                  <div className="text-xl font-black text-emerald-800">{validationSummary.validRows}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-700">DUPLICATES DETECTED</div>
                  <div className="text-xl font-black text-amber-800">{validationSummary.duplicateRows}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-xs">
                  <div className="text-[11px] font-bold text-rose-700">INVALID / ERRORS</div>
                  <div className="text-xl font-black text-rose-800">{validationSummary.invalidRows}</div>
                </div>
              </div>

              {/* Conflict Handling & Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>Duplicate Strategy:</span>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900"
                  >
                    <option value="SKIP">Skip Duplicate Rows</option>
                    <option value="UPDATE">Update / Merge Existing Data</option>
                    <option value="REJECT">Reject Entire Batch if Duplicates</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search preview rows..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1 text-xs"
                    />
                  </div>

                  <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-bold">
                    {(['ALL', 'VALID', 'ERROR', 'DUPLICATE'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setPreviewFilter(filter)}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          previewFilter === filter ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="max-h-[38vh] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-12 text-center">Row</th>
                        <th className="px-3 py-2 w-28">Status</th>
                        {currentSchema.fields.map((f) => (
                          <th key={f.key} className="px-3 py-2 whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={currentSchema.fields.length + 2} className="p-8 text-center text-slate-400">
                            No rows matching selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.slice(0, 150).map((r) => {
                          const statusClass = !r.isValid
                            ? 'bg-rose-50/50 hover:bg-rose-50'
                            : r.isDuplicate
                            ? 'bg-amber-50/50 hover:bg-amber-50'
                            : 'hover:bg-slate-50';

                          return (
                            <tr key={r.rowNumber} className={statusClass}>
                              <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{r.rowNumber}</td>
                              <td className="px-3 py-2">
                                {!r.isValid ? (
                                  <div className="group relative inline-flex items-center gap-1 text-rose-700 font-bold text-[10px] bg-rose-100 px-1.5 py-0.5 rounded cursor-help">
                                    <XCircle className="h-3 w-3 shrink-0" />
                                    <span>Error</span>
                                    <div className="absolute left-0 bottom-full mb-1 hidden w-60 rounded bg-slate-900 p-2 text-[10px] text-white shadow-lg group-hover:block z-20">
                                      {r.errors.join(', ')}
                                    </div>
                                  </div>
                                ) : r.isDuplicate ? (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span>Duplicate</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                    <span>Valid</span>
                                  </span>
                                )}
                              </td>
                              {currentSchema.fields.map((f) => (
                                <td key={f.key} className="px-3 py-2 whitespace-nowrap text-slate-700">
                                  {String(r.raw[f.key] || '-')}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: IMPORTING PROGRESS ================= */}
          {currentStep === 'IMPORTING' && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 animate-spin">
                <RefreshCw className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Importing {selectedEntity} Records...</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Executing batch ingestion with transaction safety, reference linking, and formula defense.
              </p>
              <div className="w-full max-w-md bg-slate-200 rounded-full h-3 overflow-hidden mt-2">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div className="text-xs font-bold text-slate-600">{importProgress}% Completed</div>
            </div>
          )}

          {/* ================= STEP 5: RESULT SUMMARY ================= */}
          {currentStep === 'RESULT' && validationSummary && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-950">Import Batch Executed Successfully</h4>
                  <p className="text-xs text-emerald-700">
                    Production data has been updated with full audit trail logging and zero record corruption.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="text-xs font-bold text-slate-500">TOTAL PROCESSED</div>
                  <div className="text-2xl font-black text-slate-950">{validationSummary.totalRows}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-xs">
                  <div className="text-xs font-bold text-emerald-700">IMPORTED SUCCESSFULLY</div>
                  <div className="text-2xl font-black text-emerald-900">{importedCount}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
                  <div className="text-xs font-bold text-amber-700">SKIPPED / DUPLICATES</div>
                  <div className="text-2xl font-black text-amber-900">{skippedCount}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-xs">
                  <div className="text-xs font-bold text-rose-700">ERRORS DETECTED</div>
                  <div className="text-2xl font-black text-rose-900">{validationSummary.invalidRows}</div>
                </div>
              </div>

              {validationSummary.invalidRows > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-50 border border-rose-200 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-rose-900">
                        {validationSummary.invalidRows} records could not be imported
                      </div>
                      <div className="text-[11px] text-rose-700">
                        Download the comprehensive error audit file containing exact row numbers and correction guidance.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadErrors}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-800 shadow-xs hover:bg-rose-100/60 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-700" />
                    Download Error CSV Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <div>
            {currentStep === 'UPLOAD' ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : currentStep === 'RESULT' ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Import Another Batch
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'MAP') setCurrentStep('UPLOAD');
                  if (currentStep === 'PREVIEW') setCurrentStep('MAP');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>

          <div>
            {currentStep === 'MAP' && (
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800"
              >
                <span>Validate & Duplicate Check</span>
                <ArrowRight className="h-4 w-4 text-amber-400" />
              </button>
            )}

            {currentStep === 'PREVIEW' && validationSummary && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={validationSummary.validRows === 0 && duplicateStrategy !== 'UPDATE'}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50"
              >
                <span>Confirm & Import ({validationSummary.validRows + (duplicateStrategy === 'UPDATE' ? validationSummary.duplicateRows : 0)} Records)</span>
                <Database className="h-4 w-4 text-slate-950" />
              </button>
            )}

            {currentStep === 'RESULT' && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800"
              >
                Done & Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
