<?php

namespace App\Http\Requests;

class ExpenseRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'expense_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'expense_type' => ['required', 'string', 'max:60'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:10000000'],
            'payment_mode' => ['required', 'in:cash,upi,bank'],
            'notes' => ['nullable', 'string', 'max:500'],
            'client_uuid' => ['nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'expense_type.required' => 'Please enter expense type.',
            'amount.required' => 'Please enter amount.',
            'amount.gt' => 'Amount must be more than zero.',
            'payment_mode.in' => 'Invalid payment mode.',
            'expense_date.before_or_equal' => 'Date cannot be in the future.',
        ];
    }
}
