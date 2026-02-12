import { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface ClientImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AuthUser;
    onClientsImported: () => void;
}

interface ParsedClient {
    name: string;
    fund_type: string;
}

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

export function ClientImportModal({
    isOpen,
    onClose,
    user,
    onClientsImported,
}: ClientImportModalProps) {
    const [parsedData, setParsedData] = useState<ParsedClient[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [fileName, setFileName] = useState('');

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

                // Parse and validate data
                const clients: ParsedClient[] = [];
                const errors: string[] = [];

                jsonData.forEach((row, index) => {
                    const rowNum = index + 2; // Excel rows start at 1, header is row 1

                    // Normalize keys to lowercase for case-insensitive matching
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.toLowerCase().trim()] = row[key];
                    });

                    // Check for required fields (case-insensitive)
                    const name = normalizedRow['name'];
                    const clientType = normalizedRow['client type'] || normalizedRow['clienttype'];

                    if (!name || !clientType) {
                        errors.push(`Row ${rowNum}: Missing ${!name ? 'Name' : 'Client Type'}`);
                        return;
                    }

                    clients.push({
                        name: String(name).trim(),
                        fund_type: String(clientType).trim(),
                    });
                });

                if (errors.length > 0) {
                    alert(`Found ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
                }

                setParsedData(clients);
                setImportResult(null);
            } catch (error) {
                console.error('Error parsing Excel file:', error);
                alert('Failed to parse Excel file. Please ensure it\'s a valid .xlsx or .xls file.');
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            alert('No data to import');
            return;
        }

        setIsImporting(true);
        const errors: string[] = [];
        let successCount = 0;

        for (const client of parsedData) {
            try {
                // Normalize client type to match database constraint
                let normalizedType = client.fund_type.toLowerCase().trim();
                if (normalizedType === 'mutual fund' || normalizedType === 'mutual funds') {
                    normalizedType = 'mutual_funds';
                } else if (normalizedType === 'holistic') {
                    normalizedType = 'holistic';
                }

                const { error } = await supabase
                    .from('clients')
                    .insert({
                        name: client.name,
                        type: normalizedType,
                        organisation_id: user.organisationId,
                    });

                if (error) {
                    errors.push(`${client.name}: ${error.message}`);
                } else {
                    successCount++;
                }
            } catch (error) {
                errors.push(`${client.name}: ${error}`);
            }
        }

        setImportResult({
            success: successCount,
            failed: errors.length,
            errors,
        });

        setIsImporting(false);

        if (successCount > 0) {
            onClientsImported();
        }
    };

    const handleClose = () => {
        setParsedData([]);
        setImportResult(null);
        setFileName('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-amber-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Import Clients from Excel</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* File Upload */}
                    {parsedData.length === 0 && !importResult && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <label htmlFor="excel-upload" className="cursor-pointer">
                                    <span className="text-sm font-medium text-amber-600 hover:text-amber-700">
                                        Click to upload
                                    </span>
                                    <span className="text-sm text-gray-600"> or drag and drop</span>
                                    <input
                                        id="excel-upload"
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-gray-500 mt-2">Excel files (.xlsx, .xls) only</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-blue-900 mb-2">Expected Format:</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-blue-200">
                                                <th className="px-4 py-2 text-left text-blue-900 font-medium">Name</th>
                                                <th className="px-4 py-2 text-left text-blue-900 font-medium">Client Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-blue-100">
                                                <td className="px-4 py-2 text-blue-800">John Doe</td>
                                                <td className="px-4 py-2 text-blue-800">Mutual Fund</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 text-blue-800">Jane Smith</td>
                                                <td className="px-4 py-2 text-blue-800">Holistic</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedData.length > 0 && !importResult && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Preview ({parsedData.length} clients)
                                </h3>
                                <span className="text-sm text-gray-600">{fileName}</span>
                            </div>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    #
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Client Type
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {parsedData.map((client, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {client.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {client.fund_type}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <div className="space-y-4">
                            <div className={`border rounded-lg p-6 ${importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    {importResult.failed === 0 ? (
                                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <h3 className={`text-lg font-medium ${importResult.failed === 0 ? 'text-green-900' : 'text-yellow-900'
                                            }`}>
                                            Import {importResult.failed === 0 ? 'Completed' : 'Completed with Errors'}
                                        </h3>
                                        <div className="mt-2 text-sm">
                                            <p className={importResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}>
                                                <strong>{importResult.success}</strong> clients imported successfully
                                            </p>
                                            {importResult.failed > 0 && (
                                                <p className="text-yellow-800">
                                                    <strong>{importResult.failed}</strong> clients failed to import
                                                </p>
                                            )}
                                        </div>

                                        {importResult.errors.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium text-yellow-900 mb-2">Errors:</h4>
                                                <div className="bg-white border border-yellow-200 rounded p-3 max-h-40 overflow-y-auto">
                                                    {importResult.errors.map((error, index) => (
                                                        <p key={index} className="text-xs text-gray-700 mb-1">
                                                            • {error}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    {parsedData.length > 0 && !importResult && (
                        <>
                            <button
                                onClick={() => {
                                    setParsedData([]);
                                    setFileName('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import {parsedData.length} Clients
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    {importResult && (
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            Done
                        </button>
                    )}
                    {parsedData.length === 0 && !importResult && (
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
