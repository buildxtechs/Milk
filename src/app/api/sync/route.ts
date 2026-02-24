import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import {
    CustomerModel,
    ProductModel,
    TransactionModel,
    AdvanceModel,
    StockInwardModel,
    ExternalDeductionModel,
    PayoutModel,
    SettingsModel
} from '@/lib/models/schemas';

const models: Record<string, any> = {
    customers: CustomerModel,
    products: ProductModel,
    transactions: TransactionModel,
    advances: AdvanceModel,
    stockInwards: StockInwardModel,
    externalDeductions: ExternalDeductionModel,
    payouts: PayoutModel,
    settings: SettingsModel,
};

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { changes } = await req.json();

        if (!Array.isArray(changes)) {
            return NextResponse.json({ error: 'Invalid changes format' }, { status: 400 });
        }

        const results = [];

        for (const change of changes) {
            const { type, action, data, id } = change;
            const Model = models[type];

            if (!Model) {
                results.push({ id, status: 'error', message: `Unknown type: ${type}` });
                continue;
            }

            try {
                if (action === 'upsert') {
                    await Model.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
                    results.push({ id: data.id, status: 'success' });
                } else if (action === 'delete') {
                    await Model.deleteOne({ id });
                    results.push({ id, status: 'success' });
                } else {
                    results.push({ id, status: 'error', message: `Unknown action: ${action}` });
                }
            } catch (err: any) {
                results.push({ id: id || data?.id, status: 'error', message: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();

        const [
            customers,
            products,
            transactions,
            advances,
            stockInwards,
            externalDeductions,
            payouts,
            settings
        ] = await Promise.all([
            CustomerModel.find({}),
            ProductModel.find({}),
            TransactionModel.find({}),
            AdvanceModel.find({}),
            StockInwardModel.find({}),
            ExternalDeductionModel.find({}),
            PayoutModel.find({}),
            SettingsModel.findOne({})
        ]);

        return NextResponse.json({
            customers,
            products,
            transactions,
            advances,
            stockInwards,
            externalDeductions,
            payouts,
            settings: settings || undefined
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
