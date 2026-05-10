import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

    async generateExcel(title: string, data: any[], columns: { header: string; key: string; width?: number }[], summary?: any): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(title);

        // Header Style
        const headerRow = worksheet.addRow(columns.map(c => c.header));
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' }, // emerald-500
            };
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Add Data
        data.forEach(item => {
            const rowValues = columns.map(col => {
                const value = item[col.key];
                return value !== undefined ? value : '';
            });
            worksheet.addRow(rowValues);
        });

        // Auto-fit columns
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
        }));

        // Add Summary if exists
        if (summary) {
            worksheet.addRow([]);
            const summaryTitleRow = worksheet.addRow(['SUMMARY']);
            summaryTitleRow.font = { bold: true };
            
            Object.entries(summary).forEach(([key, value]) => {
                worksheet.addRow([key.toUpperCase(), value]);
            });
        }

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
        return buffer;
    }

    async generateCSV(data: any[], columns: { header: string; key: string }[]): Promise<string> {
        const headers = columns.map(c => c.header).join(',');
        const rows = data.map(item => {
            return columns.map(col => {
                const val = item[col.key];
                return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(',');
        });
        return [headers, ...rows].join('\n');
    }

    async generatePDF(title: string, data: any[], columns: { header: string; key: string }[], summary?: any): Promise<Buffer> {
        const doc = new jsPDF() as any;
        
        doc.setFontSize(20);
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text(title, 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 30);

        const tableData = data.map(item => columns.map(col => item[col.key] || ''));
        const tableHeaders = columns.map(col => col.header);

        doc.autoTable({
            startY: 35,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
        });

        if (summary) {
            const finalY = (doc as any).lastAutoTable.finalY || 40;
            doc.setFontSize(14);
            doc.text('Summary', 14, finalY + 15);
            doc.setFontSize(10);
            
            let y = finalY + 22;
            Object.entries(summary).forEach(([key, value]) => {
                doc.text(`${key.toUpperCase()}: ${value}`, 14, y);
                y += 6;
            });
        }

        return Buffer.from(doc.output('arraybuffer'));
    }
}
