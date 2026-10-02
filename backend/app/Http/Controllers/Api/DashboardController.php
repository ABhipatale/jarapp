<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JarTransaction;
use App\Services\JarService;
use App\Services\ReportService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, ReportService $reports, JarService $jars)
    {
        $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ], ['to.after_or_equal' => __('शेवटचा दिनांक सुरुवातीच्या दिनांकानंतरचा असावा.')]);

        $today = now()->toDateString();
        $from = $request->input('from', $today);
        $to = $request->input('to', $from);

        $period = $reports->summary($from, $to);
        $todaySummary = $from === $today && $to === $today ? $period : $reports->summary($today, $today);
        $month = $reports->summary(now()->startOfMonth()->toDateString(), $today);

        $recent = JarTransaction::with('customer:id,name,mobile')
            ->whereBetween('transaction_date', [$from, $to])
            ->latest('id')->limit(20)->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'customer_name' => $t->customer?->name,
                'transaction_date' => $t->transaction_date->toDateString(),
                'transaction_type' => $t->transaction_type,
                'jar_quantity' => $t->jar_quantity,
                'amount' => $t->amount,
                'paid' => round($t->paid_amount + $t->advance_amount, 2),
                'udhari' => $t->udhari_amount,
            ]);

        return response()->json([
            'from' => $from,
            'to' => $to,
            'stock' => $jars->summary(),
            'period' => $period,
            'today' => $todaySummary,
            'month_expenses' => $month['expenses'],
            'customers' => $reports->customerWise($from, $to),
            'recent' => $recent,
        ]);
    }
}
