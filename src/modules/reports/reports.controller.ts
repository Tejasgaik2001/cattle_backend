import {
    Controller,
    Get,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { ReportQueryDto, ExportReportDto, ExportFormat } from './dto/report-query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportDownload } from '../../entities/report-download.entity';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly exportService: ExportService,
        private readonly farmsService: FarmsService,
        @InjectRepository(ReportDownload)
        private readonly downloadRepository: Repository<ReportDownload>,
    ) { }

    @Get('milk-production')
    @ApiOperation({ summary: 'Get detailed milk production report' })
    async getMilkProductionReport(
        @CurrentUser() user: User,
        @Query() query: ReportQueryDto,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.reportsService.getMilkProductionReport(farmId, query);
    }

    @Get('financial')
    @ApiOperation({ summary: 'Get detailed financial report' })
    async getFinancialReport(
        @CurrentUser() user: User,
        @Query() query: ReportQueryDto,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.reportsService.getFinancialReport(farmId, query);
    }

    @Get('health')
    @ApiOperation({ summary: 'Get detailed health report' })
    async getHealthReport(
        @CurrentUser() user: User,
        @Query() query: ReportQueryDto,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.reportsService.getHealthReport(farmId, query);
    }

    @Get('export/milk-production')
    @ApiOperation({ summary: 'Export milk production report' })
    async exportMilkProduction(
        @CurrentUser() user: User,
        @Query() query: ExportReportDto,
        @Res() res: Response,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const report = await this.reportsService.getMilkProductionReport(farmId, query);

        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Session', key: 'session', width: 10 },
            { header: 'Cow ID', key: 'cowTag', width: 15 },
            { header: 'Cow Name', key: 'cowName', width: 15 },
            { header: 'Amount (L)', key: 'amount', width: 12 },
            { header: 'Rate (₹)', key: 'rate', width: 10 },
            { header: 'Total (₹)', key: 'totalAmount', width: 12 },
        ];

        const data = report.records.map(r => ({
            date: r.date,
            session: r.milkingTime,
            cowTag: r.cow?.tagId || 'N/A',
            cowName: r.cow?.name || 'N/A',
            amount: r.amount,
            rate: r.pricePerLiter,
            totalAmount: r.totalValue,
        }));

        const summary = {
            'Total Liters': `${report.summary.totalLiters.toFixed(2)} L`,
            'Avg Liters/Session': `${report.summary.avgLitersPerSession.toFixed(2)} L`,
            'Total Income': `₹ ${report.summary.totalIncome.toLocaleString('en-IN')}`,
        };

        await this.handleExport(res, 'Milk_Production_Report', query.format, columns, data, summary, farmId, user.id, 'milk-production', query);
    }

    @Get('export/financial')
    @ApiOperation({ summary: 'Export financial report' })
    async exportFinancial(
        @CurrentUser() user: User,
        @Query() query: ExportReportDto,
        @Res() res: Response,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const report = await this.reportsService.getFinancialReport(farmId, query);

        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Amount (₹)', key: 'amount', width: 15 },
        ];

        const data = report.transactions.map(t => ({
            date: t.date,
            type: t.type.toUpperCase(),
            category: t.category,
            description: t.description,
            amount: t.amount,
        }));

        const summary = {
            'Total Income': `₹ ${report.summary.totalIncome.toLocaleString('en-IN')}`,
            'Total Expense': `₹ ${report.summary.totalExpense.toLocaleString('en-IN')}`,
            'Net Profit': `₹ ${report.summary.netProfit.toLocaleString('en-IN')}`,
            'Margin': `${report.summary.margin.toFixed(2)} %`,
        };

        await this.handleExport(res, 'Financial_Report', query.format, columns, data, summary, farmId, user.id, 'financial', query);
    }

    @Get('export/health')
    @ApiOperation({ summary: 'Export health report' })
    async exportHealth(
        @CurrentUser() user: User,
        @Query() query: ExportReportDto,
        @Res() res: Response,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const report = await this.reportsService.getHealthReport(farmId, query);

        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Cow', key: 'cowTag', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Cost (₹)', key: 'cost', width: 12 },
        ];

        const data = report.records.map(r => ({
            date: r.date,
            type: r.type,
            cowTag: r.cow?.tagId || 'N/A',
            description: r.description,
            cost: (r.metadata as any)?.cost || 0,
        }));

        const summary = {
            'Total Events': report.summary.totalEvents,
            'Vaccinations': report.summary.VACCINATION || 0,
            'Treatments': report.summary.MEDICAL_TREATMENT || 0,
        };

        await this.handleExport(res, 'Health_Report', query.format, columns, data, summary, farmId, user.id, 'health', query);
    }

    @Get('history')
    @ApiOperation({ summary: 'Get export history' })
    async getHistory(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.downloadRepository.find({
            where: { farmId },
            order: { createdAt: 'DESC' },
            take: 20,
        });
    }

    @Get('predictions')
    @ApiOperation({ summary: 'Get herd predictions and analytics' })
    async getPredictions(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.reportsService.getHerdPredictions(farmId);
    }

    private async handleExport(
        res: Response,
        baseName: string,
        format: ExportFormat,
        columns: any[],
        data: any[],
        summary: any,
        farmId: string,
        userId: string,
        reportType: string,
        parameters: any
    ) {
        const fileName = `${baseName}_${new Date().getTime()}`;
        let buffer: Buffer;
        let contentType: string;
        let ext: string;

        switch (format) {
            case ExportFormat.PDF:
                buffer = await this.exportService.generatePDF(baseName.replace(/_/g, ' '), data, columns, summary);
                contentType = 'application/pdf';
                ext = 'pdf';
                break;
            case ExportFormat.CSV:
                const csv = await this.exportService.generateCSV(data, columns);
                buffer = Buffer.from(csv);
                contentType = 'text/csv';
                ext = 'csv';
                break;
            case ExportFormat.EXCEL:
            default:
                buffer = await this.exportService.generateExcel(baseName.replace(/_/g, ' '), data, columns, summary);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                ext = 'xlsx';
                break;
        }

        // Save to history
        await this.downloadRepository.save({
            farmId,
            userId,
            reportType,
            parameters,
            format: ext,
            fileName: `${fileName}.${ext}`,
            fileSize: buffer.length,
            status: 'completed',
        });

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}.${ext}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }
}
