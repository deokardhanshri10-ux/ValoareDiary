import { FileText } from 'lucide-react';

export const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatUploadDate = (dateString?: string) => {
    if (!dateString) return 'Upload date unavailable';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getFileTypeIcon = (fileName: string) => {
    // You can extend this to return different icons based on extension
    return <FileText className="w-5 h-5 flex-shrink-0" />;
};
